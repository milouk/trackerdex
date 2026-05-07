import { useCallback, useEffect, useRef, useState } from "react";
import {
  Connect,
  Detail,
  Shell,
  type Filter,
  type LiveEvent,
} from "./components/observatory";
import { loadDex, resolveDomain } from "./dex";
import { BLOCKED_STATUSES, PiholeClient, type Query } from "./pihole";
import { useTheme } from "./theme";
import {
  loadCatches,
  loadConnection,
  saveCatches,
  saveConnection,
} from "./storage";
import type {
  CatchState,
  Dex,
  DexEntry,
  StoredConnection,
} from "./types";

const POLL_INTERVAL_MS = 8_000;
const LIVE_FEED_CAPACITY = 30;
const TOP_DOMAINS_BULK_COUNT = 1000;

type Status =
  | { kind: "loading" }
  | { kind: "needs-connection" }
  | { kind: "connected"; client: PiholeClient; baseUrl: string }
  | { kind: "error"; message: string };

const DEFAULT_FILTER: Filter = {
  type: "ALL",
  tier: "ALL",
  query: "",
  showCaught: true,
  showUncaught: true,
};

export default function App(): React.ReactElement {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [dex, setDex] = useState<Dex | null>(null);
  const [catches, setCatches] = useState<CatchState>(() => loadCatches());
  const [selected, setSelected] = useState<DexEntry | null>(null);
  const [feed, setFeed] = useState<LiveEvent[]>([]);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const { theme, toggle: toggleTheme } = useTheme();

  const sessionFirstCatchRef = useRef<Set<string>>(new Set());
  const lastPollSecRef = useRef<number>(Math.floor(Date.now() / 1000));
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveCatches(catches);
  }, [catches]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const loaded = await loadDex();
        if (!alive) return;
        setDex(loaded);

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
            setStatus({
              kind: "connected",
              client,
              baseUrl: client.baseUrl,
            });
            return;
          } catch {
            saveConnection(null);
          }
        }
        setStatus({ kind: "needs-connection" });
      } catch (err) {
        if (!alive) return;
        setStatus({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to load tracker dex",
        });
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
        /* noop */
      }
    }
    saveConnection(null);
    setFeed([]);
    setSelected(null);
    setStatus({ kind: "needs-connection" });
  }, [status]);

  const recordEncounters = useCallback(
    (
      hits: { entry: DexEntry; domain: string; count: number; time: number }[],
    ) => {
      if (hits.length === 0) return;
      setCatches((prev) => {
        const next = { ...prev };
        for (const h of hits) {
          const existing = next[h.entry.id];
          if (existing) {
            next[h.entry.id] = {
              ...existing,
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
    },
    [],
  );

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

        const aggregate = new Map<
          string,
          { entry: DexEntry; domain: string; count: number; time: number }
        >();
        const now = Date.now();
        for (const d of top.domains) {
          const entry = resolveDomain(d.domain, dex);
          if (!entry) continue;
          const existing = aggregate.get(entry.id);
          if (existing) {
            existing.count += d.count;
          } else {
            aggregate.set(entry.id, {
              entry,
              domain: d.domain,
              count: d.count,
              time: now,
            });
          }
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

  useEffect(() => {
    if (status.kind !== "connected" || !dex) return;
    let cancelled = false;

    async function poll(): Promise<void> {
      if (cancelled || status.kind !== "connected") return;
      try {
        const from = lastPollSecRef.current;
        const until = Math.floor(Date.now() / 1000);
        const res = await status.client.getQueries({
          from,
          until,
          length: 500,
        });
        if (cancelled) return;
        lastPollSecRef.current = until;

        const events: LiveEvent[] = [];
        const aggregate = new Map<
          string,
          { entry: DexEntry; domain: string; count: number; time: number }
        >();

        for (const q of res.queries as Query[]) {
          if (!BLOCKED_STATUSES.has(q.status as never)) continue;
          if (!dex) continue;
          const entry = resolveDomain(q.domain, dex);
          if (!entry) continue;

          const timeMs = Math.round(q.time * 1000);
          const existing = aggregate.get(entry.id);
          if (existing) {
            existing.count += 1;
            existing.time = Math.max(existing.time, timeMs);
          } else {
            aggregate.set(entry.id, {
              entry,
              domain: q.domain,
              count: 1,
              time: timeMs,
            });
          }

          const isFirstCatch = !sessionFirstCatchRef.current.has(entry.id);
          if (isFirstCatch) sessionFirstCatchRef.current.add(entry.id);
          if (
            events.length < LIVE_FEED_CAPACITY &&
            !events.some((e) => e.entry.id === entry.id)
          ) {
            events.push({
              id: `${entry.id}::${q.id}`,
              time: timeMs,
              entry,
              domain: q.domain,
              isFirstCatch,
            });
          }
        }

        if (aggregate.size > 0) {
          recordEncounters(Array.from(aggregate.values()));
        }
        if (events.length > 0) {
          setFeed((prev) =>
            [...events.reverse(), ...prev].slice(0, LIVE_FEED_CAPACITY),
          );
        }
      } catch (err) {
        console.warn("Poll failed:", err);
      }
    }

    void poll();
    pollTimerRef.current = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [status, dex, recordEncounters]);

  // ---- render ----

  if (status.kind === "loading") {
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

  if (status.kind === "error") {
    return (
      <div className="dir-observatory ob-states-page">
        <div className="ob-state">
          <div className="ob-state-tape ob-state-err">UPLINK · LOST</div>
          <div className="ob-state-body">
            <div className="ob-state-error">!</div>
            <div className="ob-state-headline">{status.message}</div>
            <div className="ob-state-cap">
              Reload the page once you've fixed the issue.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status.kind === "needs-connection") {
    return <Connect onConnect={handleConnect} />;
  }

  if (!dex) {
    return (
      <div className="dir-observatory ob-states-page">
        <div className="ob-state">
          <div className="ob-state-tape">SCAN · ACQUIRING</div>
          <div className="ob-state-body">
            <div className="ob-state-cap">Loading the dex…</div>
          </div>
        </div>
      </div>
    );
  }

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
      baseUrl={status.baseUrl}
      filter={filter}
      onFilterChange={setFilter}
      onSelect={setSelected}
      onDisconnect={handleDisconnect}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
