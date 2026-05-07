/* Small formatters shared across UI components. Keep dependency-free. */

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/** "1.23k", "1.23M", "1.23B"; otherwise the number as-is. */
export function shortNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < MIN_MS) return "just now";
  if (diff < HOUR_MS) return `${Math.floor(diff / MIN_MS)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`;
  return `${Math.floor(diff / DAY_MS)}d ago`;
}

/** "2026-05-08T13:42Z" — ISO without seconds. */
export function isoMinuteUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16) + "Z";
}

const TIER_GLYPH = {
  LEGENDARY: "◆◆◆",
  RARE: "◆◆·",
  UNCOMMON: "◆··",
  COMMON: "···",
} as const;

export function tierGlyph(tier: keyof typeof TIER_GLYPH): string {
  return TIER_GLYPH[tier];
}

/** 0..1 → 1..5 signal bars, matching the design's mapping (×28). */
export function signalBars(prevalence: number): number {
  return Math.max(1, Math.min(5, Math.round(prevalence * 28)));
}
