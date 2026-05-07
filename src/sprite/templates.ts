/*
 * Static imports of all .pgn templates as raw text. Vite inlines these into
 * the bundle (each ~341 bytes; total ~7.5 KB).
 *
 * Templates are licensed GPL-2.0 (from daboth/pagan).
 */

import BODY from "../sprite-templates/BODY.pgn?raw";
import HAIR from "../sprite-templates/HAIR.pgn?raw";
import TORSO from "../sprite-templates/TORSO.pgn?raw";
import BOOTS from "../sprite-templates/BOOTS.pgn?raw";
import SUBFIELD from "../sprite-templates/SUBFIELD.pgn?raw";
import MIN_SUBFIELD from "../sprite-templates/MIN_SUBFIELD.pgn?raw";
import SHIELD_DECO from "../sprite-templates/SHIELD_DECO.pgn?raw";

import AXE from "../sprite-templates/AXE.pgn?raw";
import BIGHAMMER from "../sprite-templates/BIGHAMMER.pgn?raw";
import DAGGER from "../sprite-templates/DAGGER.pgn?raw";
import FLAIL from "../sprite-templates/FLAIL.pgn?raw";
import GREATAXE from "../sprite-templates/GREATAXE.pgn?raw";
import GREATMACE from "../sprite-templates/GREATMACE.pgn?raw";
import GREATSWORD from "../sprite-templates/GREATSWORD.pgn?raw";
import HAMMER from "../sprite-templates/HAMMER.pgn?raw";
import MACE from "../sprite-templates/MACE.pgn?raw";
import SWORD from "../sprite-templates/SWORD.pgn?raw";
import WAND from "../sprite-templates/WAND.pgn?raw";

import BUCKLER from "../sprite-templates/BUCKLER.pgn?raw";
import LONGSHIELD from "../sprite-templates/LONGSHIELD.pgn?raw";
import ROUNDSHIELD from "../sprite-templates/ROUNDSHIELD.pgn?raw";
import SHIELD from "../sprite-templates/SHIELD.pgn?raw";

export const TEMPLATES: Record<string, string> = {
  BODY,
  HAIR,
  TORSO,
  BOOTS,
  SUBFIELD,
  MIN_SUBFIELD,
  SHIELD_DECO,

  AXE,
  BIGHAMMER,
  DAGGER,
  FLAIL,
  GREATAXE,
  GREATMACE,
  GREATSWORD,
  HAMMER,
  MACE,
  SWORD,
  WAND,

  BUCKLER,
  LONGSHIELD,
  ROUNDSHIELD,
  SHIELD,
};
