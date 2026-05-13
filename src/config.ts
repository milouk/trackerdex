/*
 * Runtime config fetched from /config.json. The container's entrypoint
 * authenticates against Pi-hole at startup using PIHOLE_PASSWORD and writes
 * only a session ID here — the password itself never reaches the browser.
 *
 * (v1.0.x used to put PIHOLE_PASSWORD directly in this file; that was a
 * documented security tradeoff that's been removed.)
 */

export type RuntimeConfig = {
  /** Optional URL for the SPA to hit. Empty means "use same-origin". */
  piholeHost?: string;
  /** Pi-hole session ID, obtained server-side by the container. */
  sid?: string;
  /** Epoch seconds when the SID expires. */
  expiresAt?: number;
};

let cached: RuntimeConfig | null = null;

export async function loadConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`config.json: ${res.status}`);
    const raw = (await res.json()) as RuntimeConfig;
    cached = {
      piholeHost: raw.piholeHost?.trim() || undefined,
      sid: raw.sid?.trim() || undefined,
      expiresAt:
        typeof raw.expiresAt === "number" && raw.expiresAt > 0
          ? raw.expiresAt
          : undefined,
    };
  } catch {
    cached = {};
  }
  return cached;
}

/** Force a fresh fetch (used when an SID expires mid-session). */
export function refreshConfig(): Promise<RuntimeConfig> {
  cached = null;
  return loadConfig();
}
