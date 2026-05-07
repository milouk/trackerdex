/*
 * .pgn template parser.
 *
 * Format: 18×18 ASCII grid with a `#` border around a 16×16 content area.
 *   - 'o' = fixed pixel (always drawn)
 *   - '+' = optional pixel (drawn iff the corresponding hash digit is even)
 *   - all other chars = empty
 *
 * Ported from pagan/pgnreader.py by daboth (GPL-2.0).
 * https://github.com/daboth/pagan
 */

const FIXED_PIXEL = "o";
const OPTIONAL_PIXEL = "+";

/** Apex column for symmetry mirroring (matches pagan's IMAGE_APEX). */
const IMAGE_APEX = 8;

/** A pixel coordinate inside the 16×16 virtual grid, [row, col]. */
export type Pixel = readonly [number, number];

/** A list of pixels that make up one rendering layer. */
export type Layer = Pixel[];

export type ParseOptions = {
  sym?: boolean;
  invert?: boolean;
};

export function parsePagan(
  source: string,
  hashcode: string,
  opts: ParseOptions = {},
): Layer {
  const drawmap: Pixel[] = [];
  const optmap: Pixel[] = [];

  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === FIXED_PIXEL) drawmap.push([i - 1, j - 1]);
      else if (char === OPTIONAL_PIXEL) optmap.push([i - 1, j - 1]);
    }
  }

  const extmap = decideOptionalPixels(optmap, hashcode);
  let result: Pixel[] = [...drawmap, ...extmap];

  if (opts.sym) result = enforceVerticalSymmetry(result);
  else if (opts.invert) result = invertVertical(result);

  return result;
}

/**
 * For each optional pixel, consume a hex digit from the *end* of the hash and
 * keep the pixel only if the digit is even. Mirrors pagan's right-to-left
 * consumption of hash digits.
 */
function decideOptionalPixels(optmap: Pixel[], hashcode: string): Pixel[] {
  const result: Pixel[] = [];
  let control = hashcode;
  for (const px of optmap) {
    const lastChar = control.charAt(control.length - 1);
    control = control.slice(0, -1);
    const dec = parseInt(lastChar, 16);
    if (!Number.isNaN(dec) && dec % 2 === 0) result.push(px);
  }
  return result;
}

function diff(a: number, b: number): number {
  return Math.abs(a - b);
}

function enforceVerticalSymmetry(pixmap: Pixel[]): Pixel[] {
  const mirror: Pixel[] = [];
  for (const [y, x] of pixmap) {
    const dx = diff(x, IMAGE_APEX);
    if (x <= IMAGE_APEX) mirror.push([y, x + 2 * dx - 1]);
    else mirror.push([y, x - 2 * dx - 1]);
  }
  return [...mirror, ...pixmap];
}

function invertVertical(pixmap: Pixel[]): Pixel[] {
  const mirror: Pixel[] = [];
  for (const [y, x] of pixmap) {
    const dx = diff(x, IMAGE_APEX);
    if (x <= IMAGE_APEX) mirror.push([y, x + 2 * dx - 1]);
    else mirror.push([y, x - 2 * dx - 1]);
  }
  return mirror;
}
