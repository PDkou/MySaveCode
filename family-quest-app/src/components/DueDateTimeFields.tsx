import { useTranslation } from 'react-i18next';

import { TimePickerField } from './TimePickerField';

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
    onChange(`${newDate}T${timePart || '09:00'}`);
  };

  const handleTimeChange = (newTime: string) => {
    const date = datePart || todayLocalDate();
    onChange(`${date}T${newTime}`);
  };

  return (
    <div className="due-datetime-fields">
      <input type="date" lang={lang} value={datePart} onChange={(e) => handleDateChange(e.target.value)} />
      <TimePickerField value={timePart || '09:00'} onChange={handleTimeChange} />
    </div>
  );
}
