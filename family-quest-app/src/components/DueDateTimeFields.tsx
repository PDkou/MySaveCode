import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface DueDateTimeFieldsProps {
  value: string; // '' or 'yyyy-MM-ddTHH:mm' (same shape toDateTimeLocalValue produces)
  onChange: (value: string) => void;
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimeLabel(time: string, lang: 'ko' | 'ja'): string {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const period = h < 12 ? (lang === 'ja' ? '午前' : '오전') : (lang === 'ja' ? '午後' : '오후');
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${mStr}`;
}

// Half-hour slots cover the common case; if the current value falls off
// that grid (e.g. an exact time set some other way), it's added as an
// extra option below so switching this UI never silently rounds an
// existing task's time when the user doesn't touch the field.
function buildTimeOptions(currentValue: string, lang: 'ko' | 'ja'): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push({ value, label: formatTimeLabel(value, lang) });
    }
  }
  if (currentValue && !options.some((opt) => opt.value === currentValue)) {
    options.push({ value: currentValue, label: formatTimeLabel(currentValue, lang) });
    options.sort((a, b) => a.value.localeCompare(b.value));
  }
  return options;
}

export function DueDateTimeFields({ value, onChange }: DueDateTimeFieldsProps) {
  const { i18n } = useTranslation();
  // Native date pickers otherwise follow the browser/OS locale, not the
  // app's own language toggle -- setting lang explicitly here is what
  // makes the calendar popup actually switch to Japanese when the app is.
  const lang = i18n.language.startsWith('ja') ? 'ja' : 'ko';
  const [datePart, timePart] = value ? value.split('T') : ['', ''];

  // A plain <select> instead of <input type="time"> -- the native time
  // picker renders as a fiddly circular/wheel dial on mobile, while a
  // dropdown list of half-hour slots is a single tap.
  const timeOptions = useMemo(() => buildTimeOptions(timePart, lang), [timePart, lang]);

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    onChange(`${newDate}T${timePart || '09:00'}`);
  };

  const handleTimeChange = (newTime: string) => {
    const date = datePart || todayLocalDate();
    onChange(`${date}T${newTime}`);
  };

  return (
    <div className="due-datetime-fields">
      <input type="date" lang={lang} value={datePart} onChange={(e) => handleDateChange(e.target.value)} />
      <select value={timePart || '09:00'} onChange={(e) => handleTimeChange(e.target.value)}>
        {timeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
