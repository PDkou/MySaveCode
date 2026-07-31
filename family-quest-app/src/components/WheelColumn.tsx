import { useEffect, useMemo, useRef } from 'react';

export const WHEEL_ITEM_HEIGHT = 40;
export const WHEEL_VISIBLE_ROWS = 5;
const PAD_ROWS = Math.floor(WHEEL_VISIBLE_ROWS / 2);
// Items are rendered 3x back-to-back so there's always more content above
// and below wherever the user scrolls -- lets scrolling past the last item
// (e.g. minute 59) wrap around to the first (minute 0) instead of stopping
// dead at an edge. We keep the scroll position parked on the middle copy
// and silently re-center (identical content, so it's invisible) whenever
// it drifts into an outer copy.
const REPEAT_COUNT = 3;

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
  const repeatedItems = useMemo(
    () => Array.from({ length: REPEAT_COUNT }, () => items).flat(),
    [items],
  );
  const middleCopyOffset = items.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = (middleCopyOffset + selectedIndex) * WHEEL_ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      programmaticScrollRef.current = true;
      el.scrollTo({ top: target, behavior: 'auto' });
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    }
  }, [selectedIndex, middleCopyOffset]);

  const handleScroll = () => {
    // Rescue the scroll position back toward the middle copy on every raw
    // scroll event (not just once scrolling settles) -- a single fast or
    // long scroll/fling can otherwise outrun the 3 repeated copies and hit
    // the physical end of the DOM content before ever settling. A plain
    // scrollTop assignment (not scrollTo) here so it doesn't cancel native
    // momentum, and it's always shifted by exactly one full lap (identical
    // content), so the jump is visually invisible.
    const el = containerRef.current;
    if (el && !programmaticScrollRef.current) {
      const lap = items.length * WHEEL_ITEM_HEIGHT;
      if (el.scrollTop < lap) {
        el.scrollTop += lap;
      } else if (el.scrollTop >= lap * 2) {
        el.scrollTop -= lap;
      }
    }

    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const settledEl = containerRef.current;
      if (!settledEl || programmaticScrollRef.current) return;
      const rawIndex = Math.round(settledEl.scrollTop / WHEEL_ITEM_HEIGHT);
      const index = ((rawIndex % items.length) + items.length) % items.length;
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
      {repeatedItems.map((label, i) => (
        <div
          key={i}
          className={`wheel-item ${i % items.length === selectedIndex ? 'wheel-item-selected' : ''}`}
          style={{ height: WHEEL_ITEM_HEIGHT }}
        >
          {label}
        </div>
      ))}
      <div style={{ height: WHEEL_ITEM_HEIGHT * PAD_ROWS }} />
    </div>
  );
}
