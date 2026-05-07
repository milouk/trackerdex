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

type IdleCallbackHandle = number;
type IdleDeadline = { timeRemaining: () => number; didTimeout: boolean };
type IdleScheduler = (
  cb: (deadline: IdleDeadline) => void,
  options?: { timeout: number },
) => IdleCallbackHandle;

const ric: IdleScheduler =
  (window as unknown as { requestIdleCallback?: IdleScheduler })
    .requestIdleCallback ??
  ((cb) => {
    return window.setTimeout(
      () => cb({ timeRemaining: () => 50, didTimeout: false }),
      150,
    ) as unknown as IdleCallbackHandle;
  });

/**
 * Pre-generate sprites in idle slices so the first scroll is jank-free.
 * Yields back to the main thread whenever the deadline runs out so we don't
 * block paints.
 */
export function warmSpriteCache(seeds: readonly string[]): void {
  let i = 0;
  const tick = (deadline: IdleDeadline): void => {
    while (i < seeds.length && deadline.timeRemaining() > 1) {
      const seed = seeds[i++]!;
      if (!cache.has(seed)) cache.set(seed, generateSprite(seed));
    }
    if (i < seeds.length) ric(tick, { timeout: 1_500 });
  };
  ric(tick, { timeout: 1_500 });
}
