import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WheelTimePicker } from './WheelTimePicker';

interface TimePickerFieldProps {
  value: string; // 'HH:MM', 24-hour
  onChange: (value: string) => void;
}

// '종일'(all-day) has no dedicated column in the tasks table -- due_at stays
// a plain timestamptz -- so it's represented as this specific time-of-day
// sentinel instead. 23:59 was picked because it's functionally identical to
// "due sometime today": overdue checks (due_at < now()) still only flip
// after the day is over, and the due-reminder edge function still fires
// once, just late in the day. See lib/formatDate.ts's isAllDayTime, which
// every other due_at display reads this same way.
export const ALL_DAY_TIME = '23:59';

function formatTimeLabel(time: string, lang: 'ko' | 'ja', allDayLabel: string): string {
  if (time === ALL_DAY_TIME) return allDayLabel;
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const period = h < 12 ? (lang === 'ja' ? '午前' : '오전') : (lang === 'ja' ? '午後' : '오후');
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${mStr}`;
}

// A compact field showing the chosen time as plain text, like any other
// input -- the scroll-wheel picker itself only appears in a popup while
// actually choosing a time, instead of sitting permanently expanded in
// the form.
export function TimePickerField({ value, onChange }: TimePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ja') ? 'ja' : 'ko';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  // Remembers the last specific time so toggling 종일 off restores it
  // instead of dumping the user back on a hardcoded 09:00.
  const [lastSpecificTime, setLastSpecificTime] = useState(value !== ALL_DAY_TIME ? value : '09:00');

  const isAllDay = draft === ALL_DAY_TIME;

  const openPicker = () => {
    setDraft(value);
    if (value !== ALL_DAY_TIME) setLastSpecificTime(value);
    setOpen(true);
  };

  const toggleAllDay = () => {
    setDraft(isAllDay ? lastSpecificTime : ALL_DAY_TIME);
  };

  const handleSpecificTimeChange = (next: string) => {
    setDraft(next);
    setLastSpecificTime(next);
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="time-picker-trigger" onClick={openPicker}>
        {formatTimeLabel(value, lang, t('taskForm.allDay'))}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="time-allday-toggle"
              aria-pressed={isAllDay}
              onClick={toggleAllDay}
            >
              {t('taskForm.allDay')}
            </button>

            {!isAllDay && (
              <>
                {/* Direct typing as a fast path alongside the wheel below --
                    native <input type="time"> already speaks the same 'HH:MM'
                    shape draft is in, so no conversion needed either way. */}
                <input
                  type="time"
                  className="time-picker-manual-input"
                  lang={lang}
                  value={draft}
                  onChange={(e) => e.target.value && handleSpecificTimeChange(e.target.value)}
                />
                <WheelTimePicker value={draft} onChange={handleSpecificTimeChange} />
              </>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-primary btn-block" onClick={confirm}>
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
