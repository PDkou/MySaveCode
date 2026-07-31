import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { WheelColumn } from './WheelColumn';

interface WheelTimePickerProps {
  value: string; // 'HH:MM', 24-hour
  onChange: (value: string) => void;
}

// A scrollable hour / minute / AM-PM picker in the style of iOS's native
// time picker, instead of a plain <select> -- built with CSS scroll-snap,
// no external dependency.
export function WheelTimePicker({ value, onChange }: WheelTimePickerProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('ja') ? 'ja' : 'ko';

  const [hStr, mStr] = value.split(':');
  const hour24 = Number(hStr) || 0;
  const minute = Number(mStr) || 0;
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const hourItems = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const minuteItems = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);
  const periodItems = useMemo(() => (lang === 'ja' ? ['午前', '午後'] : ['오전', '오후']), [lang]);

  const setParts = (nextHour12: number, nextMinute: number, nextIsPM: boolean) => {
    const h = (nextHour12 % 12) + (nextIsPM ? 12 : 0);
    onChange(`${String(h).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  };

  return (
    <div className="wheel-time-picker">
      <div className="wheel-selection-band" />
      <WheelColumn
        items={hourItems}
        selectedIndex={hour12 - 1}
        onChange={(i) => setParts(Number(hourItems[i]), minute, isPM)}
      />
      <WheelColumn
        items={minuteItems}
        selectedIndex={minute}
        onChange={(i) => setParts(hour12, Number(minuteItems[i]), isPM)}
      />
      <WheelColumn
        items={periodItems}
        selectedIndex={isPM ? 1 : 0}
        onChange={(i) => setParts(hour12, minute, i === 1)}
      />
    </div>
  );
}
