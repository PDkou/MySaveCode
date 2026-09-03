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
// stored emoji up in CATEGORY_EMOJI_IMAGES and render that file; if a
// category's emoji isn't one of the curated choices (an older export, or
// a future free-text picker), CategoryEmoji below falls back to
// rendering the raw emoji text so nothing goes blank.
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
  '🍷': './icons/categories/24-wine-glass.webp',
  '🚲': './icons/categories/25-bicycle.webp',
  '🎨': './icons/categories/26-artist-palette.webp',
  '📺': './icons/categories/27-tv.webp',
  '🧴': './icons/categories/28-lotion-bottle.webp',
};

export function CategoryEmoji({ value, size = 24 }: { value: string; size?: number }) {
  const src = CATEGORY_EMOJI_IMAGES[value];
  if (!src) return <span aria-hidden="true">{value}</span>;
  return <img className="category-emoji-img" src={src} alt="" aria-hidden="true" width={size} height={size} />;
}
