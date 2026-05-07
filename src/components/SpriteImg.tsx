import { useLayoutEffect, useMemo, useRef } from "react";
import { getSprite, renderSpriteToCanvas, SPRITE_GRID_SIZE } from "../sprite";
import type { DexEntry } from "../types";

type Props = {
  entry: DexEntry;
  scale?: number;
  silhouette?: boolean;
  /** Bumping this produces a different deterministic look (shiny variants). */
  variant?: number;
  className?: string;
};

export function SpriteImg({
  entry,
  scale = 8,
  silhouette = false,
  variant = 0,
  className,
}: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sprite generation is deterministic-from-seed and cached globally — see
  // src/sprite/cache.ts. So this useMemo is essentially free; it just keeps
  // the seed string allocation per-component.
  const sprite = useMemo(() => {
    const seed =
      variant > 0 ? `${entry.entityName}::shiny${variant}` : entry.entityName;
    return getSprite(seed);
  }, [entry.entityName, variant]);

  // useLayoutEffect so the canvas is painted before the browser shows it,
  // avoiding a flash of empty canvas during scroll-driven remounts.
  useLayoutEffect(() => {
    if (canvasRef.current) {
      renderSpriteToCanvas(sprite, canvasRef.current, scale, { silhouette });
    }
  }, [sprite, scale, silhouette]);

  const px = SPRITE_GRID_SIZE * scale;
  return (
    <canvas
      ref={canvasRef}
      width={px}
      height={px}
      className={className}
      style={{ imageRendering: "pixelated", display: "block" }}
      aria-label={silhouette ? "Unknown tracker" : entry.displayName}
    />
  );
}
