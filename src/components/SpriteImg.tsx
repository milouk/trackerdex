import { useEffect, useMemo, useRef } from "react";
import {
  generateSprite,
  renderSpriteToCanvas,
  SPRITE_GRID_SIZE,
} from "../sprite";
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

  const sprite = useMemo(() => {
    const seed =
      variant > 0 ? `${entry.entityName}::shiny${variant}` : entry.entityName;
    return generateSprite(seed);
  }, [entry.entityName, variant]);

  useEffect(() => {
    if (canvasRef.current) {
      renderSpriteToCanvas(sprite, canvasRef.current, scale, { silhouette });
    }
  }, [sprite, scale, silhouette]);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_GRID_SIZE * scale}
      height={SPRITE_GRID_SIZE * scale}
      className={className}
      style={{ imageRendering: "pixelated", display: "block" }}
      aria-label={silhouette ? "Unknown tracker" : entry.displayName}
    />
  );
}
