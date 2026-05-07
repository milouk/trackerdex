import { generateSprite, type Sprite } from "./generator";

/**
 * Sprite-by-seed cache. Sprites are deterministic and immutable, so we can
 * memoize them globally. With 19k entities and ~240 visible cards at a time,
 * scrolling re-mounts cards constantly — without this cache, every remount
 * re-parses 7 layered templates per sprite.
 *
 * No eviction: total cardinality of seeds is bounded by entity count + a few
 * shiny variants, so this is effectively bounded ~40 KB live.
 */
const cache = new Map<string, Sprite>();

export function getSprite(seed: string): Sprite {
  const hit = cache.get(seed);
  if (hit) return hit;
  const sprite = generateSprite(seed);
  cache.set(seed, sprite);
  return sprite;
}
