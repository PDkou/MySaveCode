import { useMemo } from 'react';
import type { CSSProperties } from 'react';

// Real pixel-art particles (design/ui-visual-system.md) instead of plain
// color-block divs -- a mix of the currency icons reused as confetti and
// dedicated ribbon-square pieces in the app's five theme accent colors.
const PARTICLE_SRCS = [
  '/confetti/gold.png',
  '/confetti/gem.png',
  '/confetti/star.png',
  '/confetti/ribbon-purple.png',
  '/confetti/ribbon-red.png',
  '/confetti/ribbon-green.png',
  '/confetti/ribbon-yellow.png',
  '/confetti/ribbon-blue.png',
];
const PARTICLE_COUNT = 28;

interface Particle {
  id: number;
  src: string;
  style: CSSProperties;
}

export function ConfettiBurst() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const size = 14 + Math.random() * 12;
        return {
          id: i,
          src: PARTICLE_SRCS[Math.floor(Math.random() * PARTICLE_SRCS.length)],
          style: {
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.3}s`,
            animationDuration: `${1.6 + Math.random() * 0.9}s`,
            width: size,
            transform: `rotate(${Math.random() * 360}deg)`,
          },
        };
      }),
    [],
  );

  return (
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((p) => (
        <img key={p.id} className="confetti-piece" src={p.src} alt="" style={p.style} />
      ))}
    </div>
  );
}
