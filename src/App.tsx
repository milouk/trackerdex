import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Connect,
  Detail,
  Shell,
  type Filter,
  type LiveEvent,
} from "./components/observatory";
import {
  buildDemoFeedSource,
  DEMO_BASE_URL,
  generateDemoCatches,
  nextDemoEvent,
} from "./demo";
import { loadDex, resolveDomain } from "./dex";
import { BLOCKED_STATUSES, PiholeClient, type Query } from "./pihole";
import {
  loadCatches,
  loadConnection,
  saveCatches,
  saveConnection,
} from "./storage";
import { loadConfig, type RuntimeConfig } from "./config";
import { warmSpriteCache } from "./sprite";
import { useTheme } from "./theme";
import type {
  CatchState,
  Dex,
  DexEntry,
  StoredConnection,
} from "./types";

const POLL_INTERVAL_MS = 8_000;
const DEMO_TICK_MS = 4_500;
const LIVE_FEED_CAPACITY = 30;
const TOP_DOMAINS_BULK_COUNT = 1_000;
const QUERY_PAGE_LENGTH = 500;
const SAVE_DEBOUNCE_MS = 400;

type Status =
  | { kind: "loading" }
  | { kind: "needs-connection" }
  | { kind: "connected"; client: PiholeClient; baseUrl: string }
  | { kind: "demo" }
  | { kind: "error"; message: string };

const DEFAULT_FILTER: Filter = {
  type: "ALL",
  tier: "ALL",
  query: "",
  view: "ALL",
};

type EncounterHit = {
  entry: DexEntry;
  domain: string;
  count: number;
  time: number;
};

export default function App(): React.ReactElement {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [dex, setDex] = useState<Dex | null>(null);
  const [catches, setCatches] = useState<CatchState>(() => loadCatches());
  const [selected, setSelected] = useState<DexEntry | null>(null);
  const [feed, setFeed] = useState<LiveEvent[]>([]);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [config, setConfig] = useState<RuntimeConfig>({});
  const { theme, toggle: toggleTheme } = useTheme();

  const sessionFirstCatchRef = useRef<Set<string>>(new Set());
  const lastPollSecRef = useRef<number>(Math.floor(Date.now() / 1000));

  // Debounced catch persistence — skip persistence in demo mode so synthetic
  // data never leaks into a real user's saved state.
  useEffect(() => {
    if (status.kind === "demo") return;
    const id = window.setTimeout(() => saveCatches(catches), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [catches, status.kind]);

  // Initial load: dex + runtime config + saved connection probe.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [loaded, runtime] = await Promise.all([loadDex(), loadConfig()]);
        if (!alive) return;
        setDex(loaded);
        setConfig(runtime);
        // Pre-warm sprite cache for the entries most likely to be visible
        // on first paint, in idle slices so we don't block first render.
        warmSpriteCache(
          loaded.entries.slice(0, 240).map((e) => e.entityName),
        );

        const saved = loadConnection();
        if (saved) {
          const client = new PiholeClient(saved.baseUrl, {
            sid: saved.sid,
            validity: Math.max(
              30,
              Math.floor((saved.expiresAt - Date.now()) / 1000),
            ),
            expiresAt: saved.expiresAt,
          });
          try {
            await client.getSummary();
            if (!alive) return;
            setStatus({ kind: "connected", client, baseUrl: client.baseUrl });
            return;
          } catch {
            saveConnection(null);
          }
        }

        // No saved session — try the runtime-config credentials silently.
        if (runtime.piholeHost && runtime.piholePassword) {
          const client = new PiholeClient(runtime.piholeHost);
          try {
            const session = await client.login(runtime.piholePassword);
            if (!alive) return;
            const stored: StoredConnection = {
              baseUrl: client.baseUrl,
              sid: session.sid,
              expiresAt: session.expiresAt,
            };
            saveConnection(stored);
            setStatus({ kind: "connected", client, baseUrl: client.baseUrl });
            return;
          } catch {
            // Fall through to manual connect screen with the host/password
            // pre-filled so the user can see what failed.
          }
        }

        if (alive) setStatus({ kind: "needs-connection" });
      } catch (err) {
        if (alive) {
          setStatus({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Failed to load tracker dex",
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleConnect = useCallback(
    (client: PiholeClient, conn: StoredConnection) => {
      saveConnection(conn);
      setStatus({ kind: "connected", client, baseUrl: client.baseUrl });
    },
    [],
  );

  const handleDisconnect = useCallback(async () => {
    if (status.kind === "connected") {
      try {
        await status.client.logout();
      } catch {
        /* ignore */
      }
    }
    if (status.kind === "demo") {
      // Restore the user's real catches; demo state was held only in memory.
      setCatches(loadCatches());
    }
    saveConnection(null);
    setFeed([]);
    setSelected(null);
    sessionFirstCatchRef.current = new Set();
    setStatus({ kind: "needs-connection" });
  }, [status]);

  const handleDemo = useCallback(() => {
    if (!dex) return;
    setCatches(generateDemoCatches(dex));
    setFeed([]);
    setStatus({ kind: "demo" });
  }, [dex]);

  const recordEncounters = useCallback((hits: EncounterHit[]) => {
    if (hits.length === 0) return;
    setCatches((prev) => {
      const next = { ...prev };
      for (const h of hits) {
        const existing = next[h.entry.id];
        if (existing) {
          next[h.entry.id] = {
            firstSeen: existing.firstSeen,
            lastSeen: Math.max(existing.lastSeen, h.time),
            encounters: existing.encounters + h.count,
          };
        } else {
          next[h.entry.id] = {
            firstSeen: h.time,
            lastSeen: h.time,
            encounters: h.count,
          };
        }
      }
      return next;
    });
  }, []);

  // Bulk-seed the dex from /api/stats/top_domains the moment we connect.
  // Runs once per (baseUrl, dex.generatedAt) pair.
  const bulkSeededRef = useRef<string | null>(null);
  useEffect(() => {
    if (status.kind !== "connected" || !dex) return;
    const seedKey = `${status.baseUrl}::${dex.generatedAt}`;
    if (bulkSeededRef.current === seedKey) return;
    bulkSeededRef.current = seedKey;

    let cancelled = false;
    (async () => {
      try {
        const top = await status.client.getTopBlockedDomains(
          TOP_DOMAINS_BULK_COUNT,
        );
        if (cancelled) return;

        const aggregate = new Map<string, EncounterHit>();
        const now = Date.now();
        for (const d of top.domains) {
          const entry = resolveDomain(d.domain, dex);
          if (!entry) continue;
          const existing = aggregate.get(entry.id);
          if (existing) existing.count += d.count;
          else aggregate.set(entry.id, {
            entry,
            domain: d.domain,
            count: d.count,
            time: now,
          });
        }
        recordEncounters(Array.from(aggregate.values()));
      } catch (err) {
        console.warn("Bulk seed failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, dex, recordEncounters]);

  // Live polling loop.
  useEffect(() => {
    if (status.kind !== "connected" || !dex) return;
    let cancelled = false;

    async function poll(): Promise<void> {
      if (cancelled || status.kind !== "connected" || !dex) return;
      try {
        const from = lastPollSecRef.current;
        const until = Math.floor(Date.now() / 1000);
        const res = await status.client.getQueries({
          from,
          until,
          length: QUERY_PAGE_LENGTH,
        });
        if (cancelled) return;
        lastPollSecRef.current = until;

        const events: LiveEvent[] = [];
        const seenInBatch = new Set<string>();
        const aggregate = new Map<string, EncounterHit>();
        const firstCatch = sessionFirstCatchRef.current;

        for (const q of res.queries as Query[]) {
          if (!BLOCKED_STATUSES.has(q.status)) continue;
          const entry = resolveDomain(q.domain, dex);
          if (!entry) continue;

          const timeMs = Math.round(q.time * 1000);
          const existing = aggregate.get(entry.id);
          if (existing) {
            existing.count += 1;
            if (timeMs > existing.time) existing.time = timeMs;
          } else {
            aggregate.set(entry.id, {
              entry,
              domain: q.domain,
              count: 1,
              time: timeMs,
            });
          }

          if (
            events.length < LIVE_FEED_CAPACITY &&
            !seenInBatch.has(entry.id)
          ) {
            seenInBatch.add(entry.id);
            const isFirstCatch = !firstCatch.has(entry.id);
            if (isFirstCatch) firstCatch.add(entry.id);
            events.push({
              id: `${entry.id}::${q.id}`,
              time: timeMs,
              entry,
              domain: q.domain,
              isFirstCatch,
            });
          }
        }

        if (aggregate.size > 0) recordEncounters(Array.from(aggregate.values()));
        if (events.length > 0) {
          setFeed((prev) =>
            events.reverse().concat(prev).slice(0, LIVE_FEED_CAPACITY),
          );
        }
      } catch (err) {
        console.warn("Poll failed:", err);
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [status, dex, recordEncounters]);

  // Pre-build the demo's weighted feed source so the ticker tick is O(1).
  const demoSource = useMemo(() => {
    if (status.kind !== "demo" || !dex) return null;
    return buildDemoFeedSource(dex, catches);
  }, [status.kind, dex, catches]);

  // Demo synthetic ticker.
  useEffect(() => {
    if (!demoSource || demoSource.totalWeight === 0) return;
    let i = 0;
    const tick = () => {
      const evt = nextDemoEvent(demoSource, Date.now() + i++);
      if (evt) setFeed((prev) => [evt, ...prev].slice(0, LIVE_FEED_CAPACITY));
    };
    for (let k = 0; k < 6; k++) tick();
    const id = window.setInterval(tick, DEMO_TICK_MS);
    return () => window.clearInterval(id);
  }, [demoSource]);

  // ---- render ----

  if (status.kind === "loading") return <Loading />;
  if (status.kind === "error") return <ErrorPanel message={status.message} />;
  if (status.kind === "needs-connection") {
    return (
      <Connect
        onConnect={handleConnect}
        onDemo={handleDemo}
        defaults={{
          host: config.piholeHost,
          password: config.piholePassword,
        }}
      />
    );
  }
  if (!dex) return <Loading />;

  if (selected) {
    return (
      <Detail
        entry={selected}
        capture={catches[selected.id]}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <Shell
      dex={dex}
      catches={catches}
      feed={feed}
      baseUrl={status.kind === "connected" ? status.baseUrl : DEMO_BASE_URL}
      filter={filter}
      onFilterChange={setFilter}
      onSelect={setSelected}
      onDisconnect={handleDisconnect}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

function Loading(): React.ReactElement {
  return (
    <div className="dir-observatory ob-states-page">
      <div className="ob-state">
        <div className="ob-state-tape">SCAN · ACQUIRING</div>
        <div className="ob-state-body">
          <div className="ob-state-loading">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="ob-loading-cell"
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
          <div className="ob-state-cap">Reading the catalogue…</div>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }): React.ReactElement {
  return (
    <div className="dir-observatory ob-states-page">
      <div className="ob-state">
        <div className="ob-state-tape ob-state-err">UPLINK · LOST</div>
        <div className="ob-state-body">
          <div className="ob-state-error">!</div>
          <div className="ob-state-headline">{message}</div>
          <div className="ob-state-cap">
            Reload the page once you've fixed the issue.
          </div>
        </div>
      </div>
    </div>
  );
}
