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

/** Apex column for symmetry mirroring (matches pagan's IMAGE_APEX). */
const IMAGE_APEX = 8;
const CH_NL = 10; // \n
const CH_CR = 13; // \r
const CH_FIXED = 111; // 'o'
const CH_OPTIONAL = 43; // '+'

/** A pixel coordinate inside the 16×16 virtual grid, [row, col]. */
type Pixel = readonly [number, number];

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

  // Fast path: walk chars manually rather than split → array → re-iterate.
  let row = 0;
  let col = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i);
    if (ch === CH_NL) {
      row++;
      col = 0;
      continue;
    }
    if (ch === CH_CR) continue;
    if (ch === CH_FIXED) drawmap.push([row - 1, col - 1]);
    else if (ch === CH_OPTIONAL) optmap.push([row - 1, col - 1]);
    col++;
  }

  const extmap = decideOptionalPixels(optmap, hashcode);
  let result: Pixel[] = drawmap.concat(extmap);

  if (opts.sym) result = enforceVerticalSymmetry(result);
  else if (opts.invert) result = invertVertical(result);

  return result;
}

/**
 * For each optional pixel, consume a hex digit from the *end* of the hash
 * and keep the pixel only if the digit is even. Mirrors pagan's
 * right-to-left consumption of hash digits.
 */
function decideOptionalPixels(optmap: Pixel[], hashcode: string): Pixel[] {
  const result: Pixel[] = [];
  let hashIdx = hashcode.length - 1;
  for (const px of optmap) {
    if (hashIdx < 0) break;
    const code = hashcode.charCodeAt(hashIdx--);
    // 0..9 → 48..57; a..f → 97..102; A..F → 65..70
    const dec =
      code >= 48 && code <= 57
        ? code - 48
        : code >= 97 && code <= 102
          ? code - 87
          : code >= 65 && code <= 70
            ? code - 55
            : NaN;
    if (!Number.isNaN(dec) && (dec & 1) === 0) result.push(px);
  }
  return result;
}

function enforceVerticalSymmetry(pixmap: Pixel[]): Pixel[] {
  const out: Pixel[] = new Array(pixmap.length * 2);
  for (let i = 0; i < pixmap.length; i++) {
    const [y, x] = pixmap[i]!;
    const dx = x <= IMAGE_APEX ? IMAGE_APEX - x : x - IMAGE_APEX;
    const mirroredX = x <= IMAGE_APEX ? x + 2 * dx - 1 : x - 2 * dx - 1;
    out[i] = [y, mirroredX];
    out[pixmap.length + i] = pixmap[i]!;
  }
  return out;
}

function invertVertical(pixmap: Pixel[]): Pixel[] {
  const out: Pixel[] = new Array(pixmap.length);
  for (let i = 0; i < pixmap.length; i++) {
    const [y, x] = pixmap[i]!;
    const dx = x <= IMAGE_APEX ? IMAGE_APEX - x : x - IMAGE_APEX;
    const mirroredX = x <= IMAGE_APEX ? x + 2 * dx - 1 : x - 2 * dx - 1;
    out[i] = [y, mirroredX];
  }
  return out;
}
