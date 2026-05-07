/*
 * Demo mode — produces a deterministic catch state and a fake live feed so
 * the public deploy at milouk.me/projects/trackerdex/ has something to show
 * without a real Pi-hole connection.
 *
 * Determinism matters: the demo should look the same to everyone who hits
 * the live URL. We hash entity ids with FNV-1a to drive every random choice.
 */

import type { LiveEvent } from "./components/observatory/types";
import type { CatchState, Dex, DexEntry } from "./types";
import { fnv1a32 } from "./utils/hash";

/** Per-tier demo settings: catch probability and encounter-count range. */
const TIER_CFG: Record<
  DexEntry["tier"],
  { pct: number; min: number; max: number }
> = {
  // 100% of legendaries; encounter counts span the shiny threshold (15k)
  // so a few of them flip to the shiny variant in the dex.
  LEGENDARY: { pct: 100, min: 4_000, max: 60_000 },
  RARE:      { pct: 70,  min: 100,   max: 4_000 },
  UNCOMMON:  { pct: 30,  min: 10,    max: 600 },
  COMMON:    { pct: 4,   min: 1,     max: 60 },
};

/** Build a deterministic CatchState for the demo. */
export function generateDemoCatches(dex: Dex): CatchState {
  const now = Date.now();
  const out: CatchState = {};
  for (const e of dex.entries) {
    const cfg = TIER_CFG[e.tier];
    const h = fnv1a32(e.id);
    if (h % 100 >= cfg.pct) continue;

    const range = cfg.max - cfg.min;
    const encounters = cfg.min + (h % range);
    const firstAgo = (((h >>> 8) % 60) + 1) * 86_400_000; // 1–60 days ago
    const lastAgo = ((h >>> 16) % 21_600) * 1_000;        // 0–6 h ago
    out[e.id] = {
      firstSeen: now - firstAgo,
      lastSeen: now - lastAgo,
      encounters,
    };
  }
  return out;
}

const TIER_WEIGHT: Record<DexEntry["tier"], number> = {
  LEGENDARY: 8,
  RARE: 3,
  UNCOMMON: 2,
  COMMON: 1,
};

/**
 * Pre-computed weighted pool of caught entities, used by `nextDemoEvent`.
 * Caching keeps the synthetic ticker O(1) per tick instead of re-walking
 * 19k entries every 4.5 s.
 */
export type DemoFeedSource = {
  caught: DexEntry[];
  cumulative: number[]; // running sum of weights, parallel to `caught`
  totalWeight: number;
};

export function buildDemoFeedSource(
  dex: Dex,
  catches: CatchState,
): DemoFeedSource {
  const caught: DexEntry[] = [];
  const cumulative: number[] = [];
  let total = 0;
  for (const e of dex.entries) {
    if (!catches[e.id]) continue;
    caught.push(e);
    total += TIER_WEIGHT[e.tier];
    cumulative.push(total);
  }
  return { caught, cumulative, totalWeight: total };
}

/** Synthetic live event for demo mode. */
export function nextDemoEvent(
  source: DemoFeedSource,
  seed: number,
): LiveEvent | null {
  if (source.totalWeight === 0) return null;
  const pick = seed % source.totalWeight;
  // Linear scan is fine — caught list is at most a few hundred legendaries
  // for our demo distribution. Binary search would be a micro-optimization.
  let idx = 0;
  while (idx < source.cumulative.length && source.cumulative[idx]! <= pick) {
    idx++;
  }
  const chosen = source.caught[idx] ?? source.caught[0]!;
  const domain =
    chosen.domains[seed % chosen.domains.length] ?? chosen.domains[0]!;
  return {
    id: `demo-${chosen.id}-${seed}`,
    time: Date.now(),
    entry: chosen,
    domain,
    isFirstCatch: false,
  };
}

export const DEMO_BASE_URL = "demo://offline";
