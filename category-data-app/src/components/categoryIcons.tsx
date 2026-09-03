// Illustrated category pictograms -- generated externally (GPT image
// generation) to match the real app icon's soft-3D pastel style, then
// normalized here (content re-centered to a consistent fraction of the
// canvas -- the raw exports had wildly different padding, e.g. plant/car
// filled the whole 1254px canvas edge-to-edge while pill/wrench had large
// margins, which read as inconsistent icon sizes side by side) and
// re-exported as small WebP files (public/icons/categories/) -- the
// originals were ~1MB PNGs each, ~26MB for the set; nothing in this app
// ever renders one bigger than a ~52px badge, so that's over 100x more
// bytes than any use here needs.
//
// Keyed by the *emoji character itself* (not a separate id) so existing
// category data -- which stores a plain emoji string, unchanged, in
// backups and localStorage -- keeps working with zero migration: look the
// stored emoji up in the relevant map and render that file; anything not
// in the curated set (older data, a future free-text picker) falls back
// to the raw emoji text so nothing goes blank.
//
// Three renders per icon, not one:
// - CATEGORY_EMOJI_IMAGES: transparent PNG/WebP, for contexts with no
//   single solid background behind it (the frosted-glass header title).
// - CATEGORY_BADGE_IMAGES: opaque, flattened onto --surface per theme,
//   for the circular category-card-badge / emoji-choice picker (solid
//   --surface background there, so a same-color square blends into the
//   circle around it with no visible edge -- see the size note below).
// - CATEGORY_TEMPLATE_IMAGES: same idea, flattened onto --surface-alt,
//   for the template-picker cards.
//
// The opaque variants exist to route around a real Chromium/Skia <img>
// minification bug, not for looks: several of these icons, displayed at
// this app's actual small sizes (~20-36px), rendered with a spurious
// dark blotch that isn't in the source art at all -- confirmed innocent
// at native resolution, confirmed absent from the raw pixel data (no
// stray dark pixels), and confirmed present in this exact browser engine
// independent of source size, format (PNG vs WebP), blur, or the
// `image-rendering` CSS hint. It reproduced identically on the user's
// own phone. The one variable that fixed it: an image with no alpha
// channel at all renders clean; the same content with any transparency
// present does not. Flattening onto the exact surface color that will
// sit behind it keeps the transparent look without shipping alpha.
export const CATEGORY_EMOJI_IMAGES: Record<string, string> = {
  '📁': './icons/categories/01-folder.webp',
  '💰': './icons/categories/02-money-pouch.webp',
  '👕': './icons/categories/03-tshirt.webp',
  '💄': './icons/categories/04-lipstick.webp',
  '📚': './icons/categories/05-book.webp',
  '🏋️': './icons/categories/06-dumbbell.webp',
  '🐾': './icons/categories/07-paw.webp',
  '🌱': './icons/categories/08-plant.webp',
  '🎮': './icons/categories/09-game-controller.webp',
  '🚗': './icons/categories/10-car.webp',
  '✈️': './icons/categories/11-airplane.webp',
  '🏠': './icons/categories/12-house.webp',
  '🎬': './icons/categories/13-clapperboard.webp',
  '🍔': './icons/categories/14-hamburger.webp',
  '🎵': './icons/categories/15-music-note.webp',
  '💊': './icons/categories/16-pill.webp',
  '🧸': './icons/categories/17-teddy-bear.webp',
  '🛠️': './icons/categories/18-wrench.webp',
  '🎁': './icons/categories/19-gift-box.webp',
  '💻': './icons/categories/20-laptop.webp',
  '⚽': './icons/categories/21-soccer-ball.webp',
  '📷': './icons/categories/22-camera.webp',
  '💳': './icons/categories/23-credit-card.webp',
  // 🍷 deliberately absent -- see WineGlassIcon below.
  '🚲': './icons/categories/25-bicycle.webp',
  '🎨': './icons/categories/26-artist-palette.webp',
  '📺': './icons/categories/27-tv.webp',
  '🧴': './icons/categories/28-lotion-bottle.webp',
};

// These two maps are spelled out as literal path strings -- not derived
// from CATEGORY_EMOJI_IMAGES via a loop -- on purpose. This app's real
// dist/ build would resolve a runtime-built path (`./icons/.../${file}`)
// fine, since the actual files exist on disk. But the single-file Artifact
// preview (scripts/build-preview-artifact.cjs) inlines every icon by
// statically regex-scanning the bundled JS for literal `./icons/...`
// substrings and swapping each for a base64 data: URI -- it can't see
// inside runtime template-literal concatenation. A loop-built version of
// these maps left 108 of the 135 icon paths as un-inlined `${...}`
// fragments in the preview, which is exactly what "그림 다 깨졌다" turned
// out to be. Keep these literal so every icon path is greppable as-is.
const CATEGORY_BADGE_IMAGES: Record<string, { light: string; dark: string }> = {
  '📁': { light: './icons/categories/badge-light/01-folder.webp', dark: './icons/categories/badge-dark/01-folder.webp' },
  '💰': { light: './icons/categories/badge-light/02-money-pouch.webp', dark: './icons/categories/badge-dark/02-money-pouch.webp' },
  '👕': { light: './icons/categories/badge-light/03-tshirt.webp', dark: './icons/categories/badge-dark/03-tshirt.webp' },
  '💄': { light: './icons/categories/badge-light/04-lipstick.webp', dark: './icons/categories/badge-dark/04-lipstick.webp' },
  '📚': { light: './icons/categories/badge-light/05-book.webp', dark: './icons/categories/badge-dark/05-book.webp' },
  '🏋️': { light: './icons/categories/badge-light/06-dumbbell.webp', dark: './icons/categories/badge-dark/06-dumbbell.webp' },
  '🐾': { light: './icons/categories/badge-light/07-paw.webp', dark: './icons/categories/badge-dark/07-paw.webp' },
  '🌱': { light: './icons/categories/badge-light/08-plant.webp', dark: './icons/categories/badge-dark/08-plant.webp' },
  '🎮': { light: './icons/categories/badge-light/09-game-controller.webp', dark: './icons/categories/badge-dark/09-game-controller.webp' },
  '🚗': { light: './icons/categories/badge-light/10-car.webp', dark: './icons/categories/badge-dark/10-car.webp' },
  '✈️': { light: './icons/categories/badge-light/11-airplane.webp', dark: './icons/categories/badge-dark/11-airplane.webp' },
  '🏠': { light: './icons/categories/badge-light/12-house.webp', dark: './icons/categories/badge-dark/12-house.webp' },
  '🎬': { light: './icons/categories/badge-light/13-clapperboard.webp', dark: './icons/categories/badge-dark/13-clapperboard.webp' },
  '🍔': { light: './icons/categories/badge-light/14-hamburger.webp', dark: './icons/categories/badge-dark/14-hamburger.webp' },
  '🎵': { light: './icons/categories/badge-light/15-music-note.webp', dark: './icons/categories/badge-dark/15-music-note.webp' },
  '💊': { light: './icons/categories/badge-light/16-pill.webp', dark: './icons/categories/badge-dark/16-pill.webp' },
  '🧸': { light: './icons/categories/badge-light/17-teddy-bear.webp', dark: './icons/categories/badge-dark/17-teddy-bear.webp' },
  '🛠️': { light: './icons/categories/badge-light/18-wrench.webp', dark: './icons/categories/badge-dark/18-wrench.webp' },
  '🎁': { light: './icons/categories/badge-light/19-gift-box.webp', dark: './icons/categories/badge-dark/19-gift-box.webp' },
  '💻': { light: './icons/categories/badge-light/20-laptop.webp', dark: './icons/categories/badge-dark/20-laptop.webp' },
  '⚽': { light: './icons/categories/badge-light/21-soccer-ball.webp', dark: './icons/categories/badge-dark/21-soccer-ball.webp' },
  '📷': { light: './icons/categories/badge-light/22-camera.webp', dark: './icons/categories/badge-dark/22-camera.webp' },
  '💳': { light: './icons/categories/badge-light/23-credit-card.webp', dark: './icons/categories/badge-dark/23-credit-card.webp' },
  '🚲': { light: './icons/categories/badge-light/25-bicycle.webp', dark: './icons/categories/badge-dark/25-bicycle.webp' },
  '🎨': { light: './icons/categories/badge-light/26-artist-palette.webp', dark: './icons/categories/badge-dark/26-artist-palette.webp' },
  '📺': { light: './icons/categories/badge-light/27-tv.webp', dark: './icons/categories/badge-dark/27-tv.webp' },
  '🧴': { light: './icons/categories/badge-light/28-lotion-bottle.webp', dark: './icons/categories/badge-dark/28-lotion-bottle.webp' },
};

const CATEGORY_TEMPLATE_IMAGES: Record<string, { light: string; dark: string }> = {
  '📁': { light: './icons/categories/template-light/01-folder.webp', dark: './icons/categories/template-dark/01-folder.webp' },
  '💰': { light: './icons/categories/template-light/02-money-pouch.webp', dark: './icons/categories/template-dark/02-money-pouch.webp' },
  '👕': { light: './icons/categories/template-light/03-tshirt.webp', dark: './icons/categories/template-dark/03-tshirt.webp' },
  '💄': { light: './icons/categories/template-light/04-lipstick.webp', dark: './icons/categories/template-dark/04-lipstick.webp' },
  '📚': { light: './icons/categories/template-light/05-book.webp', dark: './icons/categories/template-dark/05-book.webp' },
  '🏋️': { light: './icons/categories/template-light/06-dumbbell.webp', dark: './icons/categories/template-dark/06-dumbbell.webp' },
  '🐾': { light: './icons/categories/template-light/07-paw.webp', dark: './icons/categories/template-dark/07-paw.webp' },
  '🌱': { light: './icons/categories/template-light/08-plant.webp', dark: './icons/categories/template-dark/08-plant.webp' },
  '🎮': { light: './icons/categories/template-light/09-game-controller.webp', dark: './icons/categories/template-dark/09-game-controller.webp' },
  '🚗': { light: './icons/categories/template-light/10-car.webp', dark: './icons/categories/template-dark/10-car.webp' },
  '✈️': { light: './icons/categories/template-light/11-airplane.webp', dark: './icons/categories/template-dark/11-airplane.webp' },
  '🏠': { light: './icons/categories/template-light/12-house.webp', dark: './icons/categories/template-dark/12-house.webp' },
  '🎬': { light: './icons/categories/template-light/13-clapperboard.webp', dark: './icons/categories/template-dark/13-clapperboard.webp' },
  '🍔': { light: './icons/categories/template-light/14-hamburger.webp', dark: './icons/categories/template-dark/14-hamburger.webp' },
  '🎵': { light: './icons/categories/template-light/15-music-note.webp', dark: './icons/categories/template-dark/15-music-note.webp' },
  '💊': { light: './icons/categories/template-light/16-pill.webp', dark: './icons/categories/template-dark/16-pill.webp' },
  '🧸': { light: './icons/categories/template-light/17-teddy-bear.webp', dark: './icons/categories/template-dark/17-teddy-bear.webp' },
  '🛠️': { light: './icons/categories/template-light/18-wrench.webp', dark: './icons/categories/template-dark/18-wrench.webp' },
  '🎁': { light: './icons/categories/template-light/19-gift-box.webp', dark: './icons/categories/template-dark/19-gift-box.webp' },
  '💻': { light: './icons/categories/template-light/20-laptop.webp', dark: './icons/categories/template-dark/20-laptop.webp' },
  '⚽': { light: './icons/categories/template-light/21-soccer-ball.webp', dark: './icons/categories/template-dark/21-soccer-ball.webp' },
  '📷': { light: './icons/categories/template-light/22-camera.webp', dark: './icons/categories/template-dark/22-camera.webp' },
  '💳': { light: './icons/categories/template-light/23-credit-card.webp', dark: './icons/categories/template-dark/23-credit-card.webp' },
  '🚲': { light: './icons/categories/template-light/25-bicycle.webp', dark: './icons/categories/template-dark/25-bicycle.webp' },
  '🎨': { light: './icons/categories/template-light/26-artist-palette.webp', dark: './icons/categories/template-dark/26-artist-palette.webp' },
  '📺': { light: './icons/categories/template-light/27-tv.webp', dark: './icons/categories/template-dark/27-tv.webp' },
  '🧴': { light: './icons/categories/template-light/28-lotion-bottle.webp', dark: './icons/categories/template-dark/28-lotion-bottle.webp' },
};

const WINE_GLASS_EMOJI = '🍷';

// Hand-drawn stand-in for 🍷 -- every raster form of the GPT-generated
// wine glass hit the Skia bug described above even with no alpha channel
// at all, which nothing else in the set did; rather than keep chasing a
// render bug in one specific piece of art, this swaps it for a simple
// filled SVG colored to match that art's own palette (glass lavender,
// wine coral-red) so it doesn't stand out against its illustrated
// neighbors. SVG shapes are vector-rasterized per element, not minified
// as a texture, so this class of bug doesn't apply to them.
function WineGlassIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3h10c0 5-2 7.9-4 8.5V18h3v2H8v-2h3v-6.5C9 10.9 7 8 7 3z"
        fill="#e4d9f3"
        stroke="#b9a3d9"
        strokeWidth="0.6"
      />
      <path d="M7.4 4.3h9.2c-.15 1.2-.5 2.2-1 3.1H8.4c-.5-.9-.85-1.9-1-3.1z" fill="#f0836f" />
    </svg>
  );
}

export function CategoryEmoji({ value, size = 24 }: { value: string; size?: number }) {
  if (value === WINE_GLASS_EMOJI) return <WineGlassIcon size={size} />;
  const src = CATEGORY_EMOJI_IMAGES[value];
  if (!src) return <span aria-hidden="true">{value}</span>;
  return <img className="category-emoji-img" src={src} alt="" aria-hidden="true" width={size} height={size} />;
}

// For the circular badge / emoji-choice picker (opaque, --surface).
export function CategoryBadgeEmoji({ value, size = 24 }: { value: string; size?: number }) {
  if (value === WINE_GLASS_EMOJI) return <WineGlassIcon size={size} />;
  const paths = CATEGORY_BADGE_IMAGES[value];
  if (!paths) return <span aria-hidden="true">{value}</span>;
  return (
    <>
      <img
        className="category-emoji-img theme-light-only"
        src={paths.light}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
      />
      <img
        className="category-emoji-img theme-dark-only"
        src={paths.dark}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
      />
    </>
  );
}

// For the template-picker cards (opaque, --surface-alt).
export function CategoryTemplateEmoji({ value, size = 24 }: { value: string; size?: number }) {
  if (value === WINE_GLASS_EMOJI) return <WineGlassIcon size={size} />;
  const paths = CATEGORY_TEMPLATE_IMAGES[value];
  if (!paths) return <span aria-hidden="true">{value}</span>;
  return (
    <>
      <img
        className="category-emoji-img theme-light-only"
        src={paths.light}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
      />
      <img
        className="category-emoji-img theme-dark-only"
        src={paths.dark}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
      />
    </>
  );
}
