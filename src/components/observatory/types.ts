import type { DexEntry, Tier, TrackerType } from "../../types";

export type LiveEvent = {
  id: string;
  time: number;
  entry: DexEntry;
  domain: string;
  isFirstCatch: boolean;
};

export type Filter = {
  type: TrackerType | "ALL";
  tier: Tier | "ALL";
  query: string;
  showCaught: boolean;
  showUncaught: boolean;
};

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
