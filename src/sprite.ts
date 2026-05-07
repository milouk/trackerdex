/*
 * Public sprite facade. The internal generator under sprite/* is a TypeScript
 * port of daboth/pagan (GPL-2.0); this module re-exports its API.
 */

export {
  generateSprite,
  renderSpriteToCanvas,
  SPRITE_GRID_SIZE,
  type Sprite,
} from "./sprite/generator";
