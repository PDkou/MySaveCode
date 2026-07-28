import type { CharacterSlot } from '../types/database';

interface CharacterSpriteProps {
  // sprite_key per equipped slot -- a CSS color for body/background/top/
  // pants/shoes, a single emoji for head/weapon/shield/accessory1/
  // accessory2, or missing/empty for an unequipped slot. No real art yet
  // (GAMIFICATION_DESIGN.md section 10) -- this composes simple shapes and
  // emoji into a placeholder character, swappable for real sprites later
  // without touching callers.
  equipped: Partial<Record<CharacterSlot, string>>;
  size?: number;
}

const DEFAULT_BODY = '#F4C99B';
const DEFAULT_BACKGROUND = '#E7E5DF';
const DEFAULT_TOP = '#9CA3AF';
const DEFAULT_PANTS = '#6B7280';
const DEFAULT_SHOES = '#4B5563';

export function CharacterSprite({ equipped, size = 96 }: CharacterSpriteProps) {
  const bodyColor = equipped.body || DEFAULT_BODY;
  const backgroundColor = equipped.background || DEFAULT_BACKGROUND;
  const topColor = equipped.top || DEFAULT_TOP;
  const pantsColor = equipped.pants || DEFAULT_PANTS;
  const shoesColor = equipped.shoes || DEFAULT_SHOES;

  return (
    <div
      className="character-sprite"
      style={{ width: size, height: size, backgroundColor, borderRadius: size * 0.16 }}
    >
      {equipped.weapon && (
        <span className="character-sprite-emoji character-sprite-weapon" style={{ fontSize: size * 0.28 }}>
          {equipped.weapon}
        </span>
      )}
      {equipped.shield && (
        <span className="character-sprite-emoji character-sprite-shield" style={{ fontSize: size * 0.28 }}>
          {equipped.shield}
        </span>
      )}

      <div className="character-sprite-shoes" style={{ backgroundColor: shoesColor, width: size * 0.36, height: size * 0.06 }} />
      <div className="character-sprite-pants" style={{ backgroundColor: pantsColor, width: size * 0.4, height: size * 0.16 }} />
      <div className="character-sprite-top" style={{ backgroundColor: topColor, width: size * 0.46, height: size * 0.22 }} />
      <div className="character-sprite-body" style={{ backgroundColor: bodyColor, width: size * 0.38, height: size * 0.38 }} />

      {equipped.head && (
        <span className="character-sprite-emoji character-sprite-head" style={{ fontSize: size * 0.26 }}>
          {equipped.head}
        </span>
      )}
      {equipped.accessory1 && (
        <span className="character-sprite-emoji character-sprite-accessory1" style={{ fontSize: size * 0.18 }}>
          {equipped.accessory1}
        </span>
      )}
      {equipped.accessory2 && (
        <span className="character-sprite-emoji character-sprite-accessory2" style={{ fontSize: size * 0.18 }}>
          {equipped.accessory2}
        </span>
      )}
    </div>
  );
}
