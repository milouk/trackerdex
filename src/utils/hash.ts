/**
 * 32-bit FNV-1a hash. Deterministic, sync, non-cryptographic.
 * Used for sprite-seed expansion and demo-state generation.
 */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Expands an arbitrary seed into ≥`hexChars` hex characters via chained
 * FNV-1a — each round mixes the previous output back in so successive
 * 8-char chunks are uncorrelated. Used by the sprite generator to seed
 * pagan's grinder, which expects ≥48 hex chars.
 */
export function expandHexHash(seed: string, hexChars: number = 64): string {
  let chain = seed;
  let out = "";
  while (out.length < hexChars) {
    chain = chain + "\x00" + out;
    out += fnv1a32(chain).toString(16).padStart(8, "0");
  }
  return out.slice(0, hexChars);
}
