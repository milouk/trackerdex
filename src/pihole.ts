/**
 * Pi-hole v6 REST client.
 *
 * Auth: POST /api/auth { password } -> { session: { sid, validity, ... } }.
 * Subsequent requests pass the SID via the X-FTL-SID header.
 *
 * CORS note: Pi-hole v6 does not send permissive CORS headers by default,
 * so the recommended deployment runs this app on the same origin as the
 * Pi-hole web UI (e.g. behind the same reverse proxy or as a static asset
 * served by lighttpd next to admin/). When running cross-origin during
 * development, the user must either set webserver.api.cors_hosts in
 * pihole-FTL.toml or use the Vite dev proxy.
 */

export type PiholeStatus =
  | "GRAVITY"
  | "FORWARDED"
  | "CACHE"
  | "REGEX"
  | "DENYLIST"
  | "EXTERNAL_BLOCKED_IP"
  | "EXTERNAL_BLOCKED_NULL"
  | "EXTERNAL_BLOCKED_NXRA"
  | "GRAVITY_CNAME"
  | "REGEX_CNAME"
  | "DENYLIST_CNAME"
  | "RETRIED"
  | "RETRIED_DNSSEC"
  | "IN_PROGRESS"
  | "DBBUSY"
  | "SPECIAL_DOMAIN"
  | "CACHE_STALE"
  | "UNKNOWN";

export const BLOCKED_STATUSES = new Set<PiholeStatus>([
  "GRAVITY",
  "REGEX",
  "DENYLIST",
  "EXTERNAL_BLOCKED_IP",
  "EXTERNAL_BLOCKED_NULL",
  "EXTERNAL_BLOCKED_NXRA",
  "GRAVITY_CNAME",
  "REGEX_CNAME",
  "DENYLIST_CNAME",
  "DBBUSY",
  "SPECIAL_DOMAIN",
]);

export type Query = {
  id: number;
  time: number;
  type: string;
  domain: string;
  cname: string | null;
  status: PiholeStatus | string;
  client: { ip: string; name: string | null };
  upstream: string | null;
  reply: { type: string; time: number };
  dnssec: string;
};

export type Summary = {
  queries: {
    total: number;
    blocked: number;
    percent_blocked: number;
    unique_domains: number;
    forwarded: number;
    cached: number;
    types: Record<string, number>;
    status: Record<string, number>;
    replies: Record<string, number>;
  };
  clients: { active: number; total: number };
  gravity: { domains_being_blocked: number; last_update: number };
};

export type TopDomainsResponse = {
  domains: { domain: string; count: number }[];
  total_queries: number;
  blocked_queries: number;
};

export type Session = {
  sid: string;
  validity: number;
  /** epoch ms when this session expires */
  expiresAt: number;
  csrf?: string;
};

export class PiholeError extends Error {
  constructor(
    message: string,
    public kind:
      | "network"
      | "cors"
      | "unauthorized"
      | "bad_status"
      | "bad_response",
    public status?: number,
  ) {
    super(message);
    this.name = "PiholeError";
  }
}

/** Normalize a user-entered URL into "scheme://host[:port]" with no path. */
export function normalizeBaseUrl(input: string): string {
  let s = input.trim();
  if (!s) throw new Error("Pi-hole URL is required");
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  const u = new URL(s);
  return `${u.protocol}//${u.host}`;
}

export class PiholeClient {
  readonly baseUrl: string;
  private session: Session | null = null;

  constructor(baseUrl: string, session?: Session | null) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.session = session ?? null;
  }

  getSession(): Session | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    return !!this.session && this.session.expiresAt > Date.now() + 5_000;
  }

  async login(password: string): Promise<Session> {
    const res = await this.fetchJson<{
      session: {
        valid: boolean;
        totp: boolean;
        sid: string;
        validity: number;
        csrf?: string;
        message?: string;
      };
    }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({ password }),
      auth: false,
    });

    if (!res.session?.valid || !res.session.sid) {
      throw new PiholeError(
        res.session?.message ?? "Invalid password",
        "unauthorized",
        401,
      );
    }
    const session: Session = {
      sid: res.session.sid,
      validity: res.session.validity ?? 1800,
      expiresAt: Date.now() + (res.session.validity ?? 1800) * 1000,
      csrf: res.session.csrf,
    };
    this.session = session;
    return session;
  }

  async logout(): Promise<void> {
    if (!this.session) return;
    try {
      await this.fetchJson("/api/auth", { method: "DELETE" });
    } catch {
      // best-effort
    }
    this.session = null;
  }

  async getSummary(): Promise<Summary> {
    return this.fetchJson<Summary>("/api/stats/summary");
  }

  async getTopBlockedDomains(count = 200): Promise<TopDomainsResponse> {
    const params = new URLSearchParams({
      blocked: "true",
      count: String(count),
    });
    return this.fetchJson<TopDomainsResponse>(
      `/api/stats/top_domains?${params}`,
    );
  }

  /**
   * Fetches recent queries. `from`/`until` are unix timestamps in seconds;
   * leave `from` undefined to use the server default (recent N).
   */
  async getQueries(opts: {
    from?: number;
    until?: number;
    length?: number;
    cursor?: number;
  } = {}): Promise<{ queries: Query[]; cursor: number | null }> {
    const params = new URLSearchParams();
    if (opts.from !== undefined) params.set("from", String(opts.from));
    if (opts.until !== undefined) params.set("until", String(opts.until));
    if (opts.length !== undefined) params.set("length", String(opts.length));
    if (opts.cursor !== undefined) params.set("cursor", String(opts.cursor));
    const query = params.toString();
    return this.fetchJson<{ queries: Query[]; cursor: number | null }>(
      `/api/queries${query ? `?${query}` : ""}`,
    );
  }

  private async fetchJson<T>(
    path: string,
    init: RequestInit & { auth?: boolean } = {},
  ): Promise<T> {
    const { auth = true, headers, ...rest } = init;
    const reqHeaders = new Headers(headers);
    reqHeaders.set("Accept", "application/json");
    if (init.body && !reqHeaders.has("Content-Type")) {
      reqHeaders.set("Content-Type", "application/json");
    }
    if (auth) {
      if (!this.session) {
        throw new PiholeError("Not authenticated", "unauthorized", 401);
      }
      reqHeaders.set("X-FTL-SID", this.session.sid);
      if (this.session.csrf) reqHeaders.set("X-FTL-CSRF", this.session.csrf);
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...rest,
        headers: reqHeaders,
      });
    } catch (err) {
      // Browser fetch swallows CORS as a generic TypeError.
      throw new PiholeError(
        `Could not reach ${this.baseUrl}. Check the URL and that CORS is configured (or run trackerdex on the same origin as Pi-hole).`,
        "cors",
      );
    }

    if (res.status === 401) {
      this.session = null;
      throw new PiholeError("Session expired or invalid", "unauthorized", 401);
    }
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.text();
        if (body) detail = `${detail} — ${body.slice(0, 200)}`;
      } catch {
        /* noop */
      }
      throw new PiholeError(
        `Pi-hole returned ${res.status}: ${detail}`,
        "bad_status",
        res.status,
      );
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new PiholeError(
        "Pi-hole response was not valid JSON",
        "bad_response",
      );
    }
  }
}
