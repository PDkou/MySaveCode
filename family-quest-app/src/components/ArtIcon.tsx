interface ArtIconProps {
  src: string;
  size?: number;
  className?: string;
}

// Renders a pre-rendered pixel-art PNG from public/art (see ART_HANDOFF.md
// and the v4 UI/title/tycoon art pack) -- purely decorative, so alt stays
// empty and any accessible label belongs on the interactive ancestor
// (aria-label on the enclosing button, not here).
export function ArtIcon({ src, size = 32, className }: ArtIconProps) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={`pixel-art-icon${className ? ` ${className}` : ''}`}
    />
  );
}
