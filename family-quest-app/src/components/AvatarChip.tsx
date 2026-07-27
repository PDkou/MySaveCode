const PALETTE = ['#6f5bd3', '#d99435', '#278966', '#c64a55', '#2f8fd1', '#b0559e'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

interface AvatarChipProps {
  name: string;
  size?: number;
  photoUrl?: string | null;
}

export function AvatarChip({ name, size = 20, photoUrl }: AvatarChipProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="avatar-chip avatar-chip-photo"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className="avatar-chip"
      style={{ width: size, height: size, backgroundColor: colorForName(name || '?'), fontSize: size * 0.52 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
