/*
 * Sprite generator: composes layered .pgn templates into a 16×16 colored
 * pixel map deterministic from a seed string.
 *
 * Ported from pagan/generator.py by daboth (GPL-2.0).
 * https://github.com/daboth/pagan
 */

import { expandHexHash } from "../utils/hash";
import {
  grindAspect,
  grindColors,
  grindWeapon,
  isShield,
  type RGB,
} from "./grinder";
import { parsePagan, type Layer } from "./pgn";
import { TEMPLATES } from "./templates";

export const SPRITE_GRID_SIZE = 16;

/**
 * A 16×16 pixel grid. `null` = transparent, otherwise an RGB triplet.
 * Layers paint over each other in pagan's compositing order.
 */
export type Sprite = {
  pixels: (RGB | null)[][];
};

const SILHOUETTE_FILL = "#1a1a2a";

export function generateSprite(seed: string): Sprite {
  const hash = expandHexHash(seed);

  const colors = grindColors(hash);
  const aspect = grindAspect(hash);
  const weapons = grindWeapon(hash);

  const layerBody = parsePagan(TEMPLATES.BODY!, hash, { sym: true });

  const layerHair = aspect.includes("HAIR")
    ? parsePagan(TEMPLATES.HAIR!, hash, { sym: true })
    : [];
  const layerTorso = aspect.includes("TOP")
    ? parsePagan(TEMPLATES.TORSO!, hash, { sym: true })
    : [];
  const layerBoots = aspect.includes("BOOTS")
    ? parsePagan(TEMPLATES.BOOTS!, hash, { sym: true })
    : [];
  const layerSubfield = parsePagan(
    aspect.includes("PANTS") ? TEMPLATES.SUBFIELD! : TEMPLATES.MIN_SUBFIELD!,
    hash,
    { sym: true },
  );

  const hasShield = !!weapons[0] && isShield(weapons[0]);
  let layerWeaponA: Layer = [];
  let layerWeaponB: Layer = [];

  if (weapons[0]) {
    layerWeaponA = parsePagan(TEMPLATES[weapons[0]]!, hash);
  }
  if (weapons.length === 2 && weapons[1]) {
    // Second weapon is inverted only when dual-wielding (no shield).
    layerWeaponB = parsePagan(TEMPLATES[weapons[1]]!, hash, {
      invert: !hasShield,
    });
  }

  const layerShieldDeco = hasShield
    ? parsePagan(TEMPLATES.SHIELD_DECO!, hash)
    : [];

  // Compose in pagan's order: body, top, hair, subfield, boots, weapons, shield deco.
  const grid = makeEmptyGrid();
  paint(grid, layerBody, colors[0]!);
  paint(grid, layerTorso, colors[7]!); // top
  paint(grid, layerHair, colors[6]!);
  paint(grid, layerSubfield, colors[1]!);
  paint(grid, layerBoots, colors[5]!);
  paint(grid, layerWeaponA, colors[2]!);
  if (weapons.length === 2) paint(grid, layerWeaponB, colors[3]!);
  paint(grid, layerShieldDeco, colors[4]!);

  return { pixels: grid };
}

function makeEmptyGrid(): (RGB | null)[][] {
  const rows: (RGB | null)[][] = new Array(SPRITE_GRID_SIZE);
  for (let r = 0; r < SPRITE_GRID_SIZE; r++) {
    rows[r] = new Array<RGB | null>(SPRITE_GRID_SIZE).fill(null);
  }
  return rows;
}

function paint(grid: (RGB | null)[][], layer: Layer, color: RGB): void {
  for (const [r, c] of layer) {
    if (r < 0 || r >= SPRITE_GRID_SIZE) continue;
    if (c < 0 || c >= SPRITE_GRID_SIZE) continue;
    grid[r]![c] = color;
  }
}

// ---- Rendering ----

export function renderSpriteToCanvas(
  sprite: Sprite,
  canvas: HTMLCanvasElement,
  scale: number,
  options: { silhouette?: boolean } = {},
): void {
  const size = SPRITE_GRID_SIZE * scale;
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);

  if (options.silhouette) {
    ctx.fillStyle = SILHOUETTE_FILL;
    for (let r = 0; r < SPRITE_GRID_SIZE; r++) {
      const row = sprite.pixels[r]!;
      for (let c = 0; c < SPRITE_GRID_SIZE; c++) {
        if (row[c]) ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
    return;
  }

  // Group fills by color to minimize fillStyle assignments — modest win
  // since canvas is small but worth it on Detail's 16× scale.
  let lastColor: RGB | null = null;
  for (let r = 0; r < SPRITE_GRID_SIZE; r++) {
    const row = sprite.pixels[r]!;
    for (let c = 0; c < SPRITE_GRID_SIZE; c++) {
      const px = row[c];
      if (!px) continue;
      if (px !== lastColor) {
        ctx.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
        lastColor = px;
      }
      ctx.fillRect(c * scale, r * scale, scale, scale);
    }
  }
}
