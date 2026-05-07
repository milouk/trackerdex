/*
 * Sprite generator: composes layered .pgn templates into a 16×16 colored
 * pixel map deterministic from a seed string.
 *
 * Ported from pagan/generator.py by daboth (GPL-2.0).
 * https://github.com/daboth/pagan
 */

import {
  grindAspect,
  grindColors,
  grindWeapon,
  isShield,
  type RGB,
} from "./grinder";
import { parsePagan, type Layer, type Pixel } from "./pgn";
import { TEMPLATES } from "./templates";

export const SPRITE_GRID_SIZE = 16;

/**
 * A 16×16 pixel grid. `null` = transparent, otherwise an RGB triplet.
 * Layers paint over each other in pagan's compositing order.
 */
export type Sprite = {
  pixels: (RGB | null)[][];
};

export function generateSprite(seed: string): Sprite {
  const hash = expandHash(seed);

  const colors = grindColors(hash);
  const colorBody = colors[0]!;
  const colorSubfield = colors[1]!;
  const colorWeaponA = colors[2]!;
  const colorWeaponB = colors[3]!;
  const colorShieldDeco = colors[4]!;
  const colorBoots = colors[5]!;
  const colorHair = colors[6]!;
  const colorTop = colors[7]!;

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

  const hasShield = weapons[0] ? isShield(weapons[0]) : false;
  let layerWeaponA: Layer = [];
  let layerWeaponB: Layer = [];

  if (hasShield) {
    layerWeaponA = parsePagan(TEMPLATES[weapons[0]!]!, hash);
    if (weapons.length === 2 && weapons[1]) {
      layerWeaponB = parsePagan(TEMPLATES[weapons[1]]!, hash);
    }
  } else {
    if (weapons[0]) layerWeaponA = parsePagan(TEMPLATES[weapons[0]]!, hash);
    if (weapons.length === 2 && weapons[1]) {
      layerWeaponB = parsePagan(TEMPLATES[weapons[1]]!, hash, {
        invert: true,
      });
    }
  }

  const layerShieldDeco = hasShield
    ? parsePagan(TEMPLATES.SHIELD_DECO!, hash)
    : [];

  // Compose in pagan's order: body, top, hair, subfield, boots, weapon a, b, shield deco.
  const grid: (RGB | null)[][] = makeEmptyGrid();
  paint(grid, layerBody, colorBody);
  paint(grid, layerTorso, colorTop);
  paint(grid, layerHair, colorHair);
  paint(grid, layerSubfield, colorSubfield);
  paint(grid, layerBoots, colorBoots);
  paint(grid, layerWeaponA, colorWeaponA);
  if (weapons.length === 2) paint(grid, layerWeaponB, colorWeaponB);
  paint(grid, layerShieldDeco, colorShieldDeco);

  return { pixels: grid };
}

function makeEmptyGrid(): (RGB | null)[][] {
  const rows: (RGB | null)[][] = [];
  for (let r = 0; r < SPRITE_GRID_SIZE; r++) {
    rows.push(new Array<RGB | null>(SPRITE_GRID_SIZE).fill(null));
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

/**
 * Expands an arbitrary seed string into ≥64 hex characters deterministically,
 * suitable for pagan's grinder. We don't need cryptographic strength — just
 * deterministic, sync, and uniform-enough to drive layer/weapon decisions.
 *
 * Approach: chained 32-bit FNV-1a, with the chain accumulating prior outputs
 * so each round depends on all previous rounds (avoiding correlated outputs).
 */
function expandHash(seed: string, hexChars: number = 64): string {
  let chain = seed;
  let out = "";
  while (out.length < hexChars) {
    chain = chain + "\x00" + out;
    const h = fnv1a32(chain);
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, hexChars);
}

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ---- Rendering ----

export type Sprite16 = Sprite;

export function renderSpriteToCanvas(
  sprite: Sprite,
  canvas: HTMLCanvasElement,
  scale: number,
  options: { silhouette?: boolean } = {},
): void {
  canvas.width = SPRITE_GRID_SIZE * scale;
  canvas.height = SPRITE_GRID_SIZE * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < SPRITE_GRID_SIZE; r++) {
    for (let c = 0; c < SPRITE_GRID_SIZE; c++) {
      const px = sprite.pixels[r]![c];
      if (!px) continue;
      ctx.fillStyle = options.silhouette
        ? "#1a1a2a"
        : `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
      ctx.fillRect(c * scale, r * scale, scale, scale);
    }
  }
}

/** Convenience: returns true iff the layer contains the given pixel. */
export function layerContains(layer: Layer, target: Pixel): boolean {
  for (const [r, c] of layer) {
    if (r === target[0] && c === target[1]) return true;
  }
  return false;
}
