import type { ReactNode } from 'react';
import type { TitleTier } from '../types/database';

interface TitleFrameProps {
  tier: TitleTier | null;
  // Equipped badge medal, shown inside the frame next to the title text
  // instead of as a separate floating icon outside it (2026-08-01
  // feedback) -- when both a badge and a title are equipped, they read as
  // one nameplate rather than two disconnected chips.
  badgeSrc?: string;
  children: ReactNode;
}

// Wraps a title's display name in its rarity-tier frame image
// (design/title-tiers.md, public/titles/{tier}.png) via a CSS border-image
// 9-slice, so titles of any length stretch the frame's straight middle
// section instead of distorting its fixed rounded end-caps. `tier` is only
// ever null for shop_items rows that predate the tier backfill or aren't
// titles at all -- falls back to the old plain pill styling in that case.
export function TitleFrame({ tier, badgeSrc, children }: TitleFrameProps) {
  return (
    <span className={`title-frame ${tier ? `title-frame-${tier}` : 'title-frame-fallback'}`}>
      {badgeSrc && <img className="title-frame-badge" src={badgeSrc} alt="" aria-hidden="true" />}
      {children}
    </span>
  );
}
