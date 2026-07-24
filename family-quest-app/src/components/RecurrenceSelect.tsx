import { useTranslation } from 'react-i18next';

import type { TaskRecurrence } from '../types/database';

interface RecurrenceSelectProps {
  value: TaskRecurrence;
  onChange: (value: TaskRecurrence) => void;
}

const OPTIONS: TaskRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];

export function RecurrenceSelect({ value, onChange }: RecurrenceSelectProps) {
  const { t } = useTranslation();

  return (
    <select value={value} onChange={(e) => onChange(e.target.value as TaskRecurrence)}>
      {OPTIONS.map((option) => (
        <option key={option} value={option}>
          {t(`taskForm.recurrence.${option}`)}
        </option>
      ))}
    </select>
  );
}
