import { useCallback, useEffect, useRef } from "react";
import { type LiveEvent } from "../components/observatory";
import { resolveDomain } from "../dex";
import { BLOCKED_STATUSES, type Query } from "../pihole";
import type { CatchState, Dex, DexEntry } from "../types";
import type { Status } from "./useBoot";

const POLL_INTERVAL_MS = 8_000;
const LIVE_FEED_CAPACITY = 30;
const TOP_DOMAINS_BULK_COUNT = 1_000;
const QUERY_PAGE_LENGTH = 500;

type EncounterHit = {
  entry: DexEntry;
  domain: string;
  count: number;
  time: number;
};

export function useLiveFeed(args: {
  status: Status;
  dex: Dex | null;
  setCatches: React.Dispatch<React.SetStateAction<CatchState>>;
  setFeed: React.Dispatch<React.SetStateAction<LiveEvent[]>>;
}): void {
  const { status, dex, setCatches, setFeed } = args;

  const recordEncounters = useCallback(
    (hits: EncounterHit[]) => {
      if (hits.length === 0) return;
      setCatches((prev) => mergeEncounters(prev, hits));
    },
    [setCatches],
  );

  // One bulk seed per (baseUrl, dex.generatedAt). Without this, switching
  // dex versions or Pi-hole instances would skip the seed.
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
        const hits = aggregateTopDomains(top.domains, dex);
        recordEncounters(hits);
      } catch (err) {
        console.warn("Bulk seed failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, dex, recordEncounters]);

  const lastPollSecRef = useRef<number>(Math.floor(Date.now() / 1000));
  const sessionFirstCatchRef = useRef<Set<string>>(new Set());

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

        const { events, hits } = processQueries(
          res.queries as Query[],
          dex,
          sessionFirstCatchRef.current,
        );
        if (hits.length > 0) recordEncounters(hits);
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
  }, [status, dex, recordEncounters, setFeed]);
}

function mergeEncounters(prev: CatchState, hits: EncounterHit[]): CatchState {
  const next = { ...prev };
  for (const h of hits) {
    const existing = next[h.entry.id];
    next[h.entry.id] = existing
      ? {
          firstSeen: existing.firstSeen,
          lastSeen: Math.max(existing.lastSeen, h.time),
          encounters: existing.encounters + h.count,
        }
      : { firstSeen: h.time, lastSeen: h.time, encounters: h.count };
  }
  return next;
}

function aggregateTopDomains(
  domains: ReadonlyArray<{ domain: string; count: number }>,
  dex: Dex,
): EncounterHit[] {
  const aggregate = new Map<string, EncounterHit>();
  const now = Date.now();
  for (const d of domains) {
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
  return Array.from(aggregate.values());
}

function processQueries(
  queries: ReadonlyArray<Query>,
  dex: Dex,
  firstCatch: Set<string>,
): { events: LiveEvent[]; hits: EncounterHit[] } {
  const events: LiveEvent[] = [];
  const seenInBatch = new Set<string>();
  const aggregate = new Map<string, EncounterHit>();

  for (const q of queries) {
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

    if (events.length < LIVE_FEED_CAPACITY && !seenInBatch.has(entry.id)) {
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

  return { events, hits: Array.from(aggregate.values()) };
}

