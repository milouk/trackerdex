/*
 * Hash grinder: turns a hex hash string into:
 *   - 8 RGB colors
 *   - an aspect (clothing/hair selection)
 *   - a weapon loadout (1–2 weapons or weapon+shield)
 *
 * Ported from pagan/hashgrinder.py by daboth (GPL-2.0).
 * https://github.com/daboth/pagan
 */

const COLOR_QUANTITY = 8;
const HEX_COLOR_LEN = 6;
const HEX_BASE = 16;
const MINIMUM_HASH_LEN = COLOR_QUANTITY * HEX_COLOR_LEN; // 48
const ASPECT_CONTROL_LEN = 6;
const MAX_DECISION_VALUE = 0xffffff;

export type RGB = readonly [number, number, number];

export const TWOHANDED_WEAPONS = [
  "GREATSWORD",
  "BIGHAMMER",
  "GREATMACE",
  "GREATAXE",
  "WAND",
] as const;

export const ONEHANDED_WEAPONS = [
  "SWORD",
  "HAMMER",
  "AXE",
  "FLAIL",
  "MACE",
  "DAGGER",
] as const;

export const SHIELDS = [
  "LONGSHIELD",
  "ROUNDSHIELD",
  "BUCKLER",
  "SHIELD",
] as const;

const SHIELD_SET = new Set<string>(SHIELDS);

const ASPECT_STYLES: readonly (readonly string[])[] = [
  ["HAIR"],
  ["HAIR", "PANTS", "TOP"],
  ["HAIR", "PANTS"],
  ["HAIR", "BOOTS", "TOP"],
  ["HAIR", "BOOTS"],
  ["HAIR", "TOP"],
  ["HAIR", "PANTS", "BOOTS"],
  ["HAIR", "PANTS", "BOOTS", "TOP"],
  ["PANTS", "BOOTS", "TOP"],
  ["PANTS", "BOOTS"],
  ["PANTS", "TOP"],
  ["PANTS"],
  ["BOOTS", "TOP"],
  ["BOOTS"],
  ["TOP"],
  [],
];

/**
 * All valid weapon-loadout combinations, computed once at module load.
 * Order matches pagan exactly: twohand · onehand · all dual-wields · all
 * weapon+shield pairs. Don't reorder — the offset of each combo determines
 * what a given hash decision maps to.
 */
const WEAPON_LIST: readonly (readonly string[])[] = (() => {
  const twoHand: (readonly string[])[] = TWOHANDED_WEAPONS.map((w) => [w]);
  const oneHand: (readonly string[])[] = ONEHANDED_WEAPONS.map((w) => [w]);
  const dualWield: (readonly string[])[] = [];
  for (const w of ONEHANDED_WEAPONS) {
    for (const w2 of ONEHANDED_WEAPONS) dualWield.push([w, w2]);
  }
  const weaponShield: (readonly string[])[] = [];
  for (const w of ONEHANDED_WEAPONS) {
    // Shield first by convention — generator routes weapons[0]==shield specially.
    for (const s of SHIELDS) weaponShield.push([s, w]);
  }
  return twoHand.concat(oneHand, dualWield, weaponShield);
})();

/** Pads short hashes by repeating themselves, matching pagan's fallback. */
function padHash(hashcode: string): string {
  if (hashcode.length >= MINIMUM_HASH_LEN) return hashcode;
  let h = hashcode;
  while (h.length < MINIMUM_HASH_LEN) {
    h += hashcode.slice(0, MINIMUM_HASH_LEN - h.length);
  }
  return h;
}

function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(0, 2), HEX_BASE);
  const g = parseInt(hex.slice(2, 4), HEX_BASE);
  const b = parseInt(hex.slice(4, 6), HEX_BASE);
  return [r, g, b];
}

export function grindColors(hashcode: string): readonly RGB[] {
  const padded = padHash(hashcode);
  const colors: RGB[] = new Array(COLOR_QUANTITY);
  for (let i = 0; i < COLOR_QUANTITY; i++) {
    colors[i] = hexToRgb(padded.slice(i * HEX_COLOR_LEN, (i + 1) * HEX_COLOR_LEN));
  }
  return colors;
}

/**
 * Maps a hash-derived value into a fractional decision in [0, numDecisions].
 * Mirrors pagan's float arithmetic so outputs match the reference impl.
 */
function mapDecision(numDecisions: number, digitsum: number): number {
  return (numDecisions / (MAX_DECISION_VALUE + 1)) * (digitsum + 1);
}

export function grindAspect(hashcode: string): readonly string[] {
  const decimal = parseInt(hashcode.slice(0, ASPECT_CONTROL_LEN), HEX_BASE);
  return (
    chooseFromList(ASPECT_STYLES, mapDecision(ASPECT_STYLES.length, decimal)) ??
    []
  );
}

export function grindWeapon(hashcode: string): readonly string[] {
  const decimal = parseInt(
    hashcode.slice(ASPECT_CONTROL_LEN, ASPECT_CONTROL_LEN * 2),
    HEX_BASE,
  );
  return (
    chooseFromList(WEAPON_LIST, mapDecision(WEAPON_LIST.length, decimal)) ?? []
  );
}

/**
 * Pagan's "choose" walks the list and returns the *last* entry whose index
 * is strictly less than `decision`. For decision <= 0 (extreme edge case
 * when the hex chunk is 000000), it returns its initial empty value, which
 * we model here as `undefined` so callers can fall back to `[]`.
 *
 * Lists are short (≤96 entries) so the loop is trivially fast.
 */
function chooseFromList<T>(list: readonly T[], decision: number): T | undefined {
  let chosen: T | undefined;
  for (let i = 0; i < list.length; i++) {
    if (i >= decision) break;
    chosen = list[i];
  }
  return chosen;
}

export function isShield(name: string): boolean {
  return SHIELD_SET.has(name);
}
