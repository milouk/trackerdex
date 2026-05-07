/**
 * Pulls DuckDuckGo Tracker Radar's pre-generated maps and builds the static
 * Pokédex artifact: a flat domain → entity index plus per-entity metadata
 * (display name, tier, type, prevalence, owned domains).
 *
 * Output: public/dex.json (~few MB, served as a static asset).
 * Run: npm run build:dex
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TR_BASE =
  "https://raw.githubusercontent.com/duckduckgo/tracker-radar/main/build-data/generated";
const DOMAIN_MAP_URL = `${TR_BASE}/domain_map.json`;
const ENTITY_PREVALENCE_URL = `${TR_BASE}/entity_prevalence.json`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "public", "dex.json");

type DomainMap = Record<
  string,
  { entityName: string; displayName: string; aliases?: string[] }
>;
type EntityPrevalence = Record<
  string,
  { tracking: number; nonTracking: number; total: number }
>;

const TYPE_KEYWORDS: { type: TrackerType; needles: string[] }[] = [
  {
    type: "SOCIAL",
    needles: [
      "facebook",
      "meta platforms",
      "twitter",
      "x corp",
      "instagram",
      "tiktok",
      "bytedance",
      "linkedin",
      "snap inc",
      "pinterest",
      "reddit",
      "discord",
    ],
  },
  {
    type: "ADVERTISING",
    needles: [
      "advertis",
      " ad ",
      " ads",
      "ads ",
      "adtech",
      "doubleclick",
      "criteo",
      "magnite",
      "rubicon",
      "openx",
      "pubmatic",
      "taboola",
      "outbrain",
      "trade desk",
      "media.net",
      "appnexus",
      "xandr",
      "smaato",
      "indexexchange",
    ],
  },
  {
    type: "ANALYTICS",
    needles: [
      "analyt",
      "metric",
      "mixpanel",
      "amplitude",
      "segment",
      "hotjar",
      "mouseflow",
      "optimizely",
      "fullstory",
      "heap",
      "pendo",
      "matomo",
      "plausible",
      "chartbeat",
      "quantcast",
    ],
  },
  {
    type: "CDN",
    needles: [
      "akamai",
      "fastly",
      "cloudflare",
      "cloudfront",
      "jsdelivr",
      "unpkg",
      "bunny.net",
      "stackpath",
      "keycdn",
      "azure",
    ],
  },
  {
    type: "DATA_BROKER",
    needles: [
      "nielsen",
      "comscore",
      "oracle",
      "lotame",
      "bluekai",
      "liveramp",
      "neustar",
      "transunion",
      "equifax",
      "experian",
      "acxiom",
      "lexisnexis",
      "tealium",
      "salesforce",
      "adobe",
    ],
  },
];

type TrackerType =
  | "SOCIAL"
  | "ADVERTISING"
  | "ANALYTICS"
  | "CDN"
  | "DATA_BROKER"
  | "OTHER";

type Tier = "LEGENDARY" | "RARE" | "UNCOMMON" | "COMMON";

type DexEntry = {
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

type Dex = {
  schemaVersion: 1;
  generatedAt: string;
  source: { repo: string; commit?: string };
  entries: DexEntry[];
  /** map of registrable domain → entity id */
  domainMap: Record<string, string>;
};

function deriveType(entityName: string, domains: string[]): TrackerType {
  const haystack = (
    entityName +
    " " +
    domains.slice(0, 20).join(" ")
  ).toLowerCase();
  for (const { type, needles } of TYPE_KEYWORDS) {
    if (needles.some((n) => haystack.includes(n))) return type;
  }
  return "OTHER";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function getCommitSha(): Promise<string | undefined> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/duckduckgo/tracker-radar/commits/main",
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as { sha?: string };
    return json.sha;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  console.log("Fetching Tracker Radar data…");
  const [domainMap, prevalence, commit] = await Promise.all([
    fetchJson<DomainMap>(DOMAIN_MAP_URL),
    fetchJson<EntityPrevalence>(ENTITY_PREVALENCE_URL),
    getCommitSha(),
  ]);

  console.log(
    `  domain_map.json:        ${Object.keys(domainMap).length.toLocaleString()} domains`,
  );
  console.log(
    `  entity_prevalence.json: ${Object.keys(prevalence).length.toLocaleString()} entities`,
  );

  // Group domains by entity.
  const byEntity = new Map<string, { displayName: string; domains: string[] }>();
  for (const [domain, info] of Object.entries(domainMap)) {
    let bucket = byEntity.get(info.entityName);
    if (!bucket) {
      bucket = { displayName: info.displayName || info.entityName, domains: [] };
      byEntity.set(info.entityName, bucket);
    }
    bucket.domains.push(domain);
  }

  // Build sorted entries (descending prevalence).
  const sorted = Object.entries(prevalence).sort(
    (a, b) => b[1].total - a[1].total,
  );

  const entries: DexEntry[] = [];
  const finalDomainMap: Record<string, string> = {};
  const usedIds = new Set<string>();

  let rank = 0;
  for (const [entityName, prev] of sorted) {
    const bucket = byEntity.get(entityName);
    // Skip entities present in prevalence list but with no owned domains
    // (rare; usually means a renamed entry).
    if (!bucket || bucket.domains.length === 0) continue;

    rank += 1;

    let id = slugify(bucket.displayName) || slugify(entityName);
    if (!id) continue;
    // Disambiguate id collisions.
    let suffix = 2;
    let unique = id;
    while (usedIds.has(unique)) unique = `${id}-${suffix++}`;
    id = unique;
    usedIds.add(id);

    const domains = bucket.domains.slice().sort();
    const tier: Tier =
      prev.total >= 0.05
        ? "LEGENDARY"
        : prev.total >= 0.005
          ? "RARE"
          : prev.total >= 0.0005
            ? "UNCOMMON"
            : "COMMON";

    entries.push({
      id,
      entityName,
      displayName: bucket.displayName,
      type: deriveType(entityName, domains),
      tier,
      prevalence: prev.total,
      rank,
      domainCount: domains.length,
      domains,
    });

    for (const d of domains) finalDomainMap[d] = id;
  }

  // Also include entities that have domains but no prevalence entry —
  // they become unranked "wild" monsters at the tail.
  for (const [entityName, bucket] of byEntity) {
    if (prevalence[entityName]) continue;
    if (bucket.domains.length === 0) continue;

    rank += 1;
    let id = slugify(bucket.displayName) || slugify(entityName);
    if (!id) continue;
    let suffix = 2;
    let unique = id;
    while (usedIds.has(unique)) unique = `${id}-${suffix++}`;
    id = unique;
    usedIds.add(id);

    const domains = bucket.domains.slice().sort();
    entries.push({
      id,
      entityName,
      displayName: bucket.displayName,
      type: deriveType(entityName, domains),
      tier: "COMMON",
      prevalence: 0,
      rank,
      domainCount: domains.length,
      domains,
    });
    for (const d of domains) finalDomainMap[d] = id;
  }

  const dex: Dex = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: { repo: "duckduckgo/tracker-radar", commit },
    entries,
    domainMap: finalDomainMap,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(dex));

  const tierCounts = entries.reduce<Record<Tier, number>>(
    (acc, e) => {
      acc[e.tier]++;
      return acc;
    },
    { LEGENDARY: 0, RARE: 0, UNCOMMON: 0, COMMON: 0 },
  );
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  entries:  ${entries.length.toLocaleString()}`);
  console.log(`  domains:  ${Object.keys(finalDomainMap).length.toLocaleString()}`);
  console.log(
    `  tiers:    ${tierCounts.LEGENDARY} legendary, ${tierCounts.RARE} rare, ${tierCounts.UNCOMMON} uncommon, ${tierCounts.COMMON} common`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
