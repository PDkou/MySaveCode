import type { ReactNode } from 'react';
import type { TitleTier } from '../types/database';

interface TitleFrameProps {
  tier: TitleTier | null;
  children: ReactNode;
}

// Wraps a title's display name in its rarity-tier frame image
// (design/title-tiers.md, public/titles/{tier}.png) via a CSS border-image
// 9-slice, so titles of any length stretch the frame's straight middle
// section instead of distorting its fixed rounded end-caps. `tier` is only
// ever null for shop_items rows that predate the tier backfill or aren't
// titles at all -- falls back to the old plain pill styling in that case.
export function TitleFrame({ tier, children }: TitleFrameProps) {
  return (
    <span className={`title-frame ${tier ? `title-frame-${tier}` : 'title-frame-fallback'}`}>
      {children}
    </span>
  );
}
