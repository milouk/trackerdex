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

export type ShieldName = (typeof SHIELDS)[number];
export type WeaponName =
  | (typeof ONEHANDED_WEAPONS)[number]
  | (typeof TWOHANDED_WEAPONS)[number];

/** A weapon "loadout" — 1 or 2 entries; if first is a shield, second is a 1H. */
export type Weapons = readonly [string] | readonly [string, string];

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

/** Returns all valid weapon-loadout combinations. */
function initWeaponList(): readonly (readonly string[])[] {
  const twoHand = TWOHANDED_WEAPONS.map((w) => [w] as const);
  const oneHand = ONEHANDED_WEAPONS.map((w) => [w] as const);

  const dualWield: (readonly string[])[] = [];
  const weaponShield: (readonly string[])[] = [];

  for (const w of ONEHANDED_WEAPONS) {
    for (const w2 of ONEHANDED_WEAPONS) {
      dualWield.push([w, w2]);
    }
    for (const s of SHIELDS) {
      // Shield first by convention — the generator routes weapons[0]==shield
      // through a dedicated layer.
      weaponShield.push([s, w]);
    }
  }

  return [...twoHand, ...oneHand, ...dualWield, ...weaponShield];
}

const WEAPON_LIST = initWeaponList();

/** Pads short hashes by appending themselves, matching pagan's fallback. */
function padHash(hashcode: string): string {
  let h = hashcode;
  while (h.length < MINIMUM_HASH_LEN) {
    const need = MINIMUM_HASH_LEN - h.length;
    h += h.slice(0, need);
  }
  return h;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (clean.length !== HEX_COLOR_LEN) {
    return [128, 128, 128];
  }
  const r = parseInt(clean.slice(0, 2), HEX_BASE);
  const g = parseInt(clean.slice(2, 4), HEX_BASE);
  const b = parseInt(clean.slice(4, 6), HEX_BASE);
  return [r, g, b];
}

export function grindColors(hashcode: string): readonly RGB[] {
  const padded = padHash(hashcode);
  const colors: RGB[] = [];
  for (let i = 0; i < COLOR_QUANTITY; i++) {
    const chunk = padded.slice(i * HEX_COLOR_LEN, (i + 1) * HEX_COLOR_LEN);
    colors.push(hexToRgb(chunk));
  }
  return colors;
}

/**
 * Maps a hash-derived value into an integer decision in [1, numDecisions].
 * Mirrors pagan's float arithmetic to keep the same outputs.
 */
function mapDecision(
  maxDigitsum: number,
  numDecisions: number,
  digitsum: number,
): number {
  return (numDecisions / (maxDigitsum + 1)) * (digitsum + 1);
}

export function grindAspect(hashcode: string): readonly string[] {
  const aspectControl = hashcode.slice(0, ASPECT_CONTROL_LEN);
  const decimal = parseInt(aspectControl, HEX_BASE);
  const decision = mapDecision(
    MAX_DECISION_VALUE,
    ASPECT_STYLES.length,
    decimal,
  );
  return chooseFromList(ASPECT_STYLES, decision);
}

export function grindWeapon(hashcode: string): readonly string[] {
  const weaponControl = hashcode.slice(
    ASPECT_CONTROL_LEN,
    ASPECT_CONTROL_LEN * 2,
  );
  const decimal = parseInt(weaponControl, HEX_BASE);
  const decision = mapDecision(
    MAX_DECISION_VALUE,
    WEAPON_LIST.length,
    decimal,
  );
  return chooseFromList(WEAPON_LIST, decision);
}

/**
 * Pagan's "choose" walks the list and returns the *last* entry whose index is
 * less than the decision. Replicating the same indexing semantics so outputs
 * match the reference implementation.
 */
function chooseFromList<T extends readonly unknown[]>(
  list: readonly T[],
  decision: number,
): T {
  let chosen = list[0]!;
  for (let i = 0; i < list.length; i++) {
    if (i < decision) chosen = list[i]!;
  }
  return chosen;
}

export function isShield(name: string): name is ShieldName {
  return (SHIELDS as readonly string[]).includes(name);
}
