import { useMemo } from 'react';

import { WheelColumn } from './WheelColumn';

interface WheelTimePickerProps {
  value: string; // 'HH:MM', 24-hour
  // dayDelta is only ever +1/-1, and only fired when the hour wheel wraps
  // past its 23<->0 boundary -- see the hour column's onChange below.
  onChange: (value: string, dayDelta?: number) => void;
}

// A scrollable hour / minute picker in the style of iOS's native time
// picker, instead of a plain <select> -- built with CSS scroll-snap, no
// external dependency. Plain 24-hour (0-23), no AM/PM column (2026-08
// request: pick evenly across the whole day instead of a 12-hour dial).
export function WheelTimePicker({ value, onChange }: WheelTimePickerProps) {
  const [hStr, mStr] = value.split(':');
  const hour = Number(hStr) || 0;
  const minute = Number(mStr) || 0;

  const hourItems = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minuteItems = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

  const setParts = (nextHour: number, nextMinute: number, dayDelta?: number) => {
    onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`, dayDelta);
  };

  return (
    <div className="wheel-time-picker">
      <div className="wheel-selection-band" />
      <WheelColumn
        items={hourItems}
        selectedIndex={hour}
        onChange={(i) => {
          const nextHour = Number(hourItems[i]);
          // 0-23 wraps in a circle with no inherent concept of a "day" --
          // scrolling from the top of the wheel (21-23) around to the
          // bottom (0-2), or the reverse, is specifically the "crossed
          // 23:59 -> 00:00" (or the reverse) case DueDateTimeFields needs
          // to advance/retreat its date for, not just an ordinary big
          // jump to some other hour the same day (e.g. 08 -> 20, which
          // never gets near either edge and correctly reports no wrap).
          let dayDelta: number | undefined;
          if (hour >= 21 && nextHour <= 2) dayDelta = 1;
          else if (hour <= 2 && nextHour >= 21) dayDelta = -1;
          setParts(nextHour, minute, dayDelta);
        }}
      />
      <WheelColumn items={minuteItems} selectedIndex={minute} onChange={(i) => setParts(hour, Number(minuteItems[i]))} />
    </div>
  );
}
