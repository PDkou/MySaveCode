import { useTranslation } from 'react-i18next';

interface WeekdayCheckboxesProps {
  selected: number[];
  onChange: (weekdays: number[]) => void;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function WeekdayCheckboxes({ selected, onChange }: WeekdayCheckboxesProps) {
  const { t } = useTranslation();

  const toggle = (day: number) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort());
    }
  };

  return (
    <div className="weekday-checkboxes">
      {WEEKDAYS.map((day) => (
        <button
          key={day}
          type="button"
          className={`weekday-chip${selected.includes(day) ? ' weekday-chip-selected' : ''}`}
          onClick={() => toggle(day)}
          aria-pressed={selected.includes(day)}
        >
          {t(`taskForm.recurrence.weekdayShort.${day}`)}
        </button>
      ))}
    </div>
  );
}
