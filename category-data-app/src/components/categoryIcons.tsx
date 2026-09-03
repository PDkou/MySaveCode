import type { ReactNode, SVGProps } from 'react';

// Flat, filled pictograms for the category icon picker (AddCategoryModal/
// EditCategoryModal's "아이콘" grid) and everywhere a category's emoji is
// displayed -- replacing the platform emoji glyphs (💰👕💄...) that used
// to render there, which vary a lot between OSes/browsers and don't share
// any visual language with the rest of the app. Deliberately flat/solid
// rather than matching the real app icon's 3D-shaded illustration style:
// that style only exists for the one hero asset (generated externally,
// hand-cut into layers), and hand-drawing ~30 more icons to that same
// finish isn't a good trade for a small in-list glyph -- a clean flat
// glyph set, consistent with itself, reads better here than a mix of
// finishes or 30 attempts at matching a photoreal-ish style in code.
//
// Keyed by the *emoji character itself* (not a separate id) so existing
// category data -- which stores a plain emoji string, unchanged, in
// backups and localStorage -- keeps working with zero migration: look the
// stored emoji up in CATEGORY_EMOJI_ICONS and render the pictogram: if a
// category's emoji isn't one of the curated choices (an older export, or
// a future free-text picker), CategoryEmoji below falls back to rendering
// the raw emoji text.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function FilledIcon({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const CATEGORY_EMOJI_ICONS: Record<string, (props: IconProps) => ReactNode> = {
  '📁': (p) => (
    <FilledIcon {...p}>
      <path d="M3 6.5A2.5 2.5 0 015.5 4h3.6a1 1 0 01.8.4l1.2 1.6h7.4A2.5 2.5 0 0121 8.5v9A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5v-11z" />
    </FilledIcon>
  ),
  '💰': (p) => (
    <FilledIcon {...p}>
      {/* Money bag -- a solid silhouette rather than a wallet-plus-clasp
          (an opacity-reduced detail stacked on top of a same-color solid
          fill doesn't lighten -- it's compositing against more of the
          same opaque color underneath, not the background, so it just
          disappears) -- see the ⚽/📷/💳 cutout icons below for where that
          same detail needs to survive: those punch an actual hole via
          fillRule="evenodd" instead of faking one with opacity. */}
      <path d="M12 3.3c-.9 1-1.7 2-1.7 2.9 0 .5.2 1 .6 1.3-3 1.4-5.6 4.7-5.6 8.3C5.3 19 8.3 21 12 21s6.7-2 6.7-5.2c0-3.6-2.6-6.9-5.6-8.3.4-.3.6-.8.6-1.3 0-.9-.8-1.9-1.7-2.9z" />
    </FilledIcon>
  ),
  '👕': (p) => (
    <FilledIcon {...p}>
      <path d="M8.3 3.3L3 7l2 3 2-1.2V20a1 1 0 001 1h8a1 1 0 001-1V8.8L19 10l2-3-5.3-3.7-1.2 1.2a3.2 3.2 0 01-4.6 0L8.7 3.3z" />
    </FilledIcon>
  ),
  '💄': (p) => (
    <FilledIcon {...p}>
      <rect x="9.3" y="11" width="5.4" height="9.5" rx="1.6" />
      <path d="M9.5 11l1-6.3A1.6 1.6 0 0112 3.4a1.6 1.6 0 011.5 1.3l1 6.3z" opacity="0.65" />
    </FilledIcon>
  ),
  '📚': (p) => (
    <FilledIcon {...p}>
      <path d="M4 4.6A1.6 1.6 0 015.6 3H11v18H5.6A1.6 1.6 0 014 19.4z" />
      <path d="M13 3h5.4A1.6 1.6 0 0120 4.6v14.8a1.6 1.6 0 01-1.6 1.6H13z" opacity="0.6" />
    </FilledIcon>
  ),
  '🏋️': (p) => (
    <FilledIcon {...p}>
      <rect x="2" y="10" width="3" height="4.5" rx="1.2" />
      <rect x="19" y="10" width="3" height="4.5" rx="1.2" />
      <rect x="5.2" y="7.8" width="2.6" height="8.4" rx="1.1" />
      <rect x="16.2" y="7.8" width="2.6" height="8.4" rx="1.1" />
      <rect x="7.8" y="11.1" width="8.4" height="1.8" rx="0.9" />
    </FilledIcon>
  ),
  '🐾': (p) => (
    <FilledIcon {...p}>
      <circle cx="7" cy="8.2" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="17" cy="8.2" r="2" />
      <path d="M12 11c-3.4 0-6 2.3-6 4.9A3 3 0 009 18.9c1 0 1.6-.6 3-.6s2 .6 3 .6a3 3 0 003-3c0-2.6-2.6-4.9-6-4.9z" />
    </FilledIcon>
  ),
  '🌱': (p) => (
    <FilledIcon {...p}>
      <path d="M7.3 21l.9-5.6h7.6l.9 5.6z" />
      <path d="M11.3 15.4V9.8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M11.6 10.6c0-3.3 2.4-5.4 6-5.4 0 3.3-2.4 5.4-6 5.4z" />
      <path d="M11.6 10.6c0-2.5-2-4.3-4.8-4.3 0 2.5 2 4.3 4.8 4.3z" />
    </FilledIcon>
  ),
  '🎮': (p) => (
    <FilledIcon {...p}>
      {/* Buttons dropped rather than faked with opacity (see 💰's comment)
          -- the grip bumps alone read as a gamepad without them. */}
      <rect x="3.3" y="8.4" width="17.4" height="8.4" rx="4.2" />
      <circle cx="7" cy="16.6" r="2.35" />
      <circle cx="17" cy="16.6" r="2.35" />
    </FilledIcon>
  ),
  '🚗': (p) => (
    <FilledIcon {...p}>
      <path d="M5 13l1.6-4.3A2 2 0 018.5 7.3h7a2 2 0 011.9 1.4L19 13z" />
      <rect x="2.8" y="13" width="18.4" height="4.4" rx="1.7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </FilledIcon>
  ),
  '✈️': (p) => (
    <FilledIcon {...p}>
      <path d="M3 11.2L20 3.3l-6.3 17-3-6.1-3.3-1.3z" />
    </FilledIcon>
  ),
  '🏠': (p) => (
    <FilledIcon {...p}>
      <path d="M12 2.8l9.3 7.7a1 1 0 01-1.3 1.5l-.5-.4V20a1 1 0 01-1 1h-4.7v-6.2H10.2V21H5.5a1 1 0 01-1-1v-8.4l-.5.4a1 1 0 01-1.3-1.5z" />
    </FilledIcon>
  ),
  '🎬': (p) => (
    <FilledIcon {...p}>
      <rect x="3" y="9.5" width="18" height="10.5" rx="1.4" />
      <path d="M3.3 9L4.6 5h2.7L6 9zM9 9l1.3-4H13l-1.3 4zM14.7 9L16 5h2.7L17.4 9z" opacity="0.6" />
    </FilledIcon>
  ),
  '🍔': (p) => (
    <FilledIcon {...p}>
      <path d="M4.2 9.6a7.8 7.8 0 0115.6 0z" />
      <rect x="3.4" y="10.6" width="17.2" height="2.4" rx="1.2" opacity="0.55" />
      <rect x="3.4" y="14" width="17.2" height="2" rx="1" />
      <rect x="3.4" y="17.5" width="17.2" height="2.6" rx="1.3" />
    </FilledIcon>
  ),
  '🎵': (p) => (
    <FilledIcon {...p}>
      <circle cx="7" cy="18" r="2.6" />
      <circle cx="16.3" cy="16" r="2.6" />
      <path d="M9.6 18V6.2L18.9 4v11.8h-1.6V5.9l-7.7 1.7V18z" />
    </FilledIcon>
  ),
  '💊': (p) => (
    <FilledIcon {...p}>
      <g transform="rotate(45 12 12)">
        <path d="M6.4 12a4.1 4.1 0 014.1-4.1H14v8.2h-3.5A4.1 4.1 0 016.4 12z" />
        <path d="M14 7.9h3.5a4.1 4.1 0 010 8.2H14z" opacity="0.55" />
      </g>
    </FilledIcon>
  ),
  '🧸': (p) => (
    <FilledIcon {...p}>
      <circle cx="7.2" cy="6.2" r="2.1" />
      <circle cx="16.8" cy="6.2" r="2.1" />
      <path
        fillRule="evenodd"
        d="M12 6.2a7 7 0 100 14 7 7 0 000-14zm-2.6 5a1 1 0 100 2 1 1 0 000-2zm5.2 0a1 1 0 100 2 1 1 0 000-2zM12 14a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z"
      />
    </FilledIcon>
  ),
  '🛠️': (p) => (
    <FilledIcon {...p}>
      <path d="M14.9 6.4a4.1 4.1 0 00-5.5 5.2L3.6 17.4l2.9 2.9 5.8-5.8a4.1 4.1 0 005.2-5.5l-2.7 2.7-2-2z" />
    </FilledIcon>
  ),
  '🎁': (p) => (
    <FilledIcon {...p}>
      <path
        fillRule="evenodd"
        d="M4 10.3h16V20H4zm7.1 0h1.8V20h-1.8zM3 7h18v3.3H3zm8.1 0h1.8v3.3h-1.8z"
      />
      <path d="M12 7c-1.6-3.6-6-2.9-5.4.4.1.5.5.8 1 .8H12zM12 7c1.6-3.6 6-2.9 5.4.4-.1.5-.5.8-1 .8H12z" />
    </FilledIcon>
  ),
  '💻': (p) => (
    <FilledIcon {...p}>
      <rect x="4.7" y="4" width="14.6" height="10.4" rx="1.2" />
      <path d="M2.3 17.6h19.4l-1.4 2.4a1 1 0 01-.9.5H4.6a1 1 0 01-.9-.5z" opacity="0.7" />
    </FilledIcon>
  ),
  '⚽': (p) => (
    <FilledIcon {...p}>
      {/* Pentagon punched out as an actual hole (evenodd) instead of an
          opacity overlay -- see 💰's comment for why the overlay approach
          silently fails whenever the detail sits fully inside the solid
          shape beneath it. */}
      <path fillRule="evenodd" d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 4.6l2.6 1.9-1 3h-3.2l-1-3z" />
    </FilledIcon>
  ),
  '📷': (p) => (
    <FilledIcon {...p}>
      <path
        fillRule="evenodd"
        d="M4 8.2a2 2 0 012-2h1.4l1-1.5h7.2l1 1.5H18a2 2 0 012 2V17a2 2 0 01-2 2H6a2 2 0 01-2-2zM12 9.7a3.3 3.3 0 100 6.6 3.3 3.3 0 000-6.6z"
      />
    </FilledIcon>
  ),
  '💳': (p) => (
    <FilledIcon {...p}>
      <path fillRule="evenodd" d="M3 5.2h18v13.6H3zM3 9h18v3H3z" />
    </FilledIcon>
  ),
  '🍷': (p) => (
    <FilledIcon {...p}>
      <path d="M7 3h10c0 5-2 7.9-4 8.5V18h3v2H8v-2h3v-6.5C9 10.9 7 8 7 3z" />
    </FilledIcon>
  ),
  '🚲': (p) => (
    <FilledIcon {...p}>
      <circle cx="6" cy="17" r="3.4" opacity="0.16" />
      <circle cx="18" cy="17" r="3.4" opacity="0.16" />
      <g stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="17" r="3.2" />
        <circle cx="18" cy="17" r="3.2" />
        <path d="M6 17l4-8h4l4 8M9.5 9h3.5M9 5.3h4l2.3 3.7" />
      </g>
    </FilledIcon>
  ),
  '🎨': (p) => (
    <FilledIcon {...p}>
      <path
        fillRule="evenodd"
        d="M12 3a9 8 0 100 16c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .9-1.9 2-1.9H16.6a4.4 4.4 0 004.4-4.4C21 4.5 17 3 12 3zm-4.4 6.2a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zm2-3.5a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zm4.9 0a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z"
      />
    </FilledIcon>
  ),
  '📺': (p) => (
    <FilledIcon {...p}>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M9 20.2h6v-1.6H9z" opacity="0.7" />
    </FilledIcon>
  ),
  '🧴': (p) => (
    <FilledIcon {...p}>
      <rect x="8.3" y="9" width="7.4" height="12" rx="1.6" />
      <rect x="9.8" y="5.2" width="4.4" height="4" rx="0.6" />
      <rect x="9.3" y="3.4" width="5.4" height="2" rx="0.6" opacity="0.6" />
    </FilledIcon>
  ),
};

// A category's emoji is a plain string field (see types.ts / storage) --
// this looks it up in the curated pictogram set above and renders that;
// anything not in the set (older data, an unmapped value) falls back to
// the raw glyph so nothing goes blank.
export function CategoryEmoji({ value, size = 24 }: { value: string; size?: number }) {
  const render = CATEGORY_EMOJI_ICONS[value];
  if (!render) return <span aria-hidden="true">{value}</span>;
  return <>{render({ size })}</>;
}
