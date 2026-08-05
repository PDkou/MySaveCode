import { useTranslation } from 'react-i18next';

import { TimePickerField } from './TimePickerField';
import { nowTimeValue, shiftLocalDateString } from '../lib/formatDate';

interface DueDateTimeFieldsProps {
  value: string; // '' or 'yyyy-MM-ddTHH:mm' (same shape toDateTimeLocalValue produces)
  onChange: (value: string) => void;
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DueDateTimeFields({ value, onChange }: DueDateTimeFieldsProps) {
  const { i18n } = useTranslation();
  // Native date pickers otherwise follow the browser/OS locale, not the
  // app's own language toggle -- setting lang explicitly here is what
  // makes the calendar popup actually switch to Japanese when the app is.
  const lang = i18n.language.startsWith('ja') ? 'ja' : 'ko';
  const [datePart, timePart] = value ? value.split('T') : ['', ''];

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    onChange(`${newDate}T${timePart || nowTimeValue()}`);
  };

  // dayDelta comes from TimePickerField/WheelTimePicker's hour wheel
  // wrapping past its 23:59 -> 00:00 boundary (or back) -- shift the date
  // along with it instead of silently landing on the same day at 00:0x
  // after scrolling straight through midnight.
  const handleTimeChange = (newTime: string, dayDelta?: number) => {
    const date = datePart || todayLocalDate();
    onChange(`${dayDelta ? shiftLocalDateString(date, dayDelta) : date}T${newTime}`);
  };

  return (
    <div className="due-datetime-fields">
      <input type="date" lang={lang} value={datePart} onChange={(e) => handleDateChange(e.target.value)} />
      <TimePickerField value={timePart || nowTimeValue()} onChange={handleTimeChange} />
    </div>
  );
}
