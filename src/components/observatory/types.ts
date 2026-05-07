import type { DexEntry, Tier, TrackerType } from "../../types";

export type LiveEvent = {
  id: string;
  time: number;
  entry: DexEntry;
  domain: string;
  isFirstCatch: boolean;
};

export type View = "ALL" | "CAUGHT" | "UNCAUGHT";

export type Filter = {
  type: TrackerType | "ALL";
  tier: Tier | "ALL";
  query: string;
  view: View;
};

export type Sort = "PREVALENCE" | "RECENT" | "ENCOUNTERS" | "NAME";

export const SORT_LABEL: Record<Sort, string> = {
  PREVALENCE: "PREVALENCE ↓",
  RECENT: "RECENT ↓",
  ENCOUNTERS: "ENCOUNTERS ↓",
  NAME: "NAME ↑",
};

export const SORT_ORDER: Sort[] = [
  "PREVALENCE",
  "RECENT",
  "ENCOUNTERS",
  "NAME",
];

export const SORT_TOOLTIP =
  "Click to cycle: web prevalence (default), most recently encountered, most encounters in your network, alphabetical.";

/** Threshold of encounters at which an entity flips to its shiny sprite. */
export const SHINY_THRESHOLD = 15_000;

export const TIER_TOOLTIP: Record<Tier, string> = {
  LEGENDARY:
    "Found on ≥5% of the crawled web. The biggest trackers — Google, Cloudflare, Meta. Easy to catch (they're everywhere) but legendary in scale.",
  RARE: "Found on ≥0.5% of the crawled web. Common-but-not-everywhere trackers.",
  UNCOMMON:
    "Found on ≥0.05% of the crawled web. Niche-specific or regional trackers.",
  COMMON:
    "Long tail. Obscure or single-site trackers. Web prevalence below 0.05%.",
};

export const RARITY_TOOLTIP =
  "Tier comes from DuckDuckGo Tracker Radar's prevalence stat — what fraction of the crawled web includes this tracker. Higher tier means more influential, not harder to catch.";

export const RA_TOOLTIP =
  "Right Ascension — a cosmetic astronomical-style coordinate generated from the entity's name length. Not a real position; pure flavor for the Observatory aesthetic.";

export const DEC_TOOLTIP =
  "Declination — derived from web prevalence (× 90°). Cosmetic, sells the sky-survey theme.";

export const TYPE_LABEL: Record<TrackerType, string> = {
  ADVERTISING: "Advertising",
  ANALYTICS: "Analytics",
  SOCIAL: "Social",
  CDN: "CDN",
  DATA_BROKER: "Data Broker",
  OTHER: "Other",
};

export const TYPES_ORDER: TrackerType[] = [
  "ADVERTISING",
  "ANALYTICS",
  "SOCIAL",
  "CDN",
  "DATA_BROKER",
  "OTHER",
];

export const TIERS_ORDER: Tier[] = [
  "LEGENDARY",
  "RARE",
  "UNCOMMON",
  "COMMON",
];
