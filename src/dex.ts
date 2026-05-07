import { getDomain } from "tldts";
import type { Dex, DexEntry } from "./types";

let cachedDex: Dex | null = null;
let entryById: Map<string, DexEntry> | null = null;

export async function loadDex(
  url: string = `${import.meta.env.BASE_URL}dex.json`,
): Promise<Dex> {
  if (cachedDex) return cachedDex;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not load ${url} (${res.status}). Did you run 'npm run build:dex'?`,
    );
  }
  const dex = (await res.json()) as Dex;
  cachedDex = dex;
  entryById = new Map(dex.entries.map((e) => [e.id, e]));
  return dex;
}

/**
 * Resolves a fully-qualified blocked domain to a dex entry, or null if it's
 * not a known tracker (a "wild encounter").
 */
export function resolveDomain(domain: string, dex: Dex): DexEntry | null {
  const cleaned = domain.replace(/\.$/, "").toLowerCase();
  // Exact match first (rarely hits — most blocks are subdomains).
  const exact = dex.domainMap[cleaned];
  if (exact) return entryById?.get(exact) ?? null;

  // Strip to registrable domain via the Public Suffix List.
  const registrable = getDomain(cleaned);
  if (!registrable) return null;
  const id = dex.domainMap[registrable];
  return id ? (entryById?.get(id) ?? null) : null;
}
