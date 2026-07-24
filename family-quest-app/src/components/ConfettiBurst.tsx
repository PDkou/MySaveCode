import { useMemo } from 'react';
import type { CSSProperties } from 'react';

const COLORS = ['#6f5bd3', '#d99435', '#278966', '#c64a55', '#2f8fd1', '#b0559e'];
const PARTICLE_COUNT = 28;

interface Particle {
  id: number;
  style: CSSProperties;
}

export function ConfettiBurst() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const size = 6 + Math.random() * 6;
        return {
          id: i,
          style: {
            left: `${Math.random() * 100}%`,
            backgroundColor: COLORS[i % COLORS.length],
            animationDelay: `${Math.random() * 0.3}s`,
            animationDuration: `${1.6 + Math.random() * 0.9}s`,
            width: size,
            height: size * 0.4,
            transform: `rotate(${Math.random() * 360}deg)`,
          },
        };
      }),
    [],
  );

  return (
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.id} className="confetti-piece" style={p.style} />
      ))}
    </div>
  );
}
