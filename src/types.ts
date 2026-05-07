export type TrackerType =
  | "SOCIAL"
  | "ADVERTISING"
  | "ANALYTICS"
  | "CDN"
  | "DATA_BROKER"
  | "OTHER";

export type Tier = "LEGENDARY" | "RARE" | "UNCOMMON" | "COMMON";

export type DexEntry = {
  id: string;
  entityName: string;
  displayName: string;
  type: TrackerType;
  tier: Tier;
  prevalence: number;
  rank: number;
  domainCount: number;
  domains: string[];
};

export type Dex = {
  schemaVersion: 1;
  generatedAt: string;
  source: { repo: string; commit?: string };
  entries: DexEntry[];
  domainMap: Record<string, string>;
};

export type Catch = {
  /** epoch ms first seen */
  firstSeen: number;
  /** epoch ms last seen */
  lastSeen: number;
  encounters: number;
};

export type CatchState = Record<string, Catch>;

export type StoredConnection = {
  baseUrl: string;
  sid: string;
  expiresAt: number;
};
