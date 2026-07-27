import { useEffect, useRef } from 'react';

export const WHEEL_ITEM_HEIGHT = 40;
export const WHEEL_VISIBLE_ROWS = 5;
const PAD_ROWS = Math.floor(WHEEL_VISIBLE_ROWS / 2);

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

// One scrollable column of a WheelTimePicker -- CSS scroll-snap handles the
// physical snapping/momentum, this just figures out which row ended up
// centered once scrolling settles and reports it back.
export function WheelColumn({ items, selectedIndex, onChange }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = selectedIndex * WHEEL_ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      programmaticScrollRef.current = true;
      el.scrollTo({ top: target, behavior: 'auto' });
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el || programmaticScrollRef.current) return;
      const index = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)));
      if (index !== selectedIndex) onChange(index);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  return (
    <div
      className="wheel-column"
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS }}
    >
      <div style={{ height: WHEEL_ITEM_HEIGHT * PAD_ROWS }} />
      {items.map((label, i) => (
        <div
          key={`${label}-${i}`}
          className={`wheel-item ${i === selectedIndex ? 'wheel-item-selected' : ''}`}
          style={{ height: WHEEL_ITEM_HEIGHT }}
        >
          {label}
        </div>
      ))}
      <div style={{ height: WHEEL_ITEM_HEIGHT * PAD_ROWS }} />
    </div>
  );
}
