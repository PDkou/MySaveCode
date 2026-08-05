import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WheelTimePicker } from './WheelTimePicker';
import { useBackDismiss } from '../lib/backNav';
import { nowTimeValue } from '../lib/formatDate';

interface TimePickerFieldProps {
  value: string; // 'HH:MM', 24-hour
  // dayDelta (+1/-1) is only ever set when the wheel picker's hour wrapped
  // past 23:59 -> 00:00 (or back) during this session -- see
  // WheelTimePicker's comment. DueDateTimeFields is the only caller that
  // does anything with it (it owns the date sitting next to this field).
  onChange: (value: string, dayDelta?: number) => void;
}

// '종일'(all-day) has no dedicated column in the tasks table -- due_at stays
// a plain timestamptz -- so it's represented as this specific time-of-day
// sentinel instead. 23:59 was picked because it's functionally identical to
// "due sometime today": overdue checks (due_at < now()) still only flip
// after the day is over, and the due-reminder edge function still fires
// once, just late in the day. See lib/formatDate.ts's isAllDayTime, which
// every other due_at display reads this same way.
export const ALL_DAY_TIME = '23:59';

// Plain 24-hour "HH:MM" -- no AM/PM conversion (2026-08 request: the wheel
// picker below picks evenly across 0-23, this label just mirrors that).
function formatTimeLabel(time: string, allDayLabel: string): string {
  return time === ALL_DAY_TIME ? allDayLabel : time;
}

// A compact field showing the chosen time as plain text, like any other
// input -- the scroll-wheel picker itself only appears in a popup while
// actually choosing a time, instead of sitting permanently expanded in
// the form.
export function TimePickerField({ value, onChange }: TimePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ja') ? 'ja' : 'ko';
  const [open, setOpen] = useState(false);
  useBackDismiss(open, () => setOpen(false));
  const [draft, setDraft] = useState(value);
  // Remembers the last specific time so toggling 종일 off restores it
  // instead of dumping the user back on a fixed default; falls back to
  // right now rather than a fixed hour when there's no prior time at all.
  const [lastSpecificTime, setLastSpecificTime] = useState(value !== ALL_DAY_TIME ? value : nowTimeValue());
  // Net day shift accumulated from wheel wraps since the picker opened
  // (scrolling past midnight and back nets to 0) -- reset on open, applied
  // to DueDateTimeFields' date field only on confirm.
  const [dayDelta, setDayDelta] = useState(0);

  const isAllDay = draft === ALL_DAY_TIME;

  const openPicker = () => {
    setDraft(value);
    if (value !== ALL_DAY_TIME) setLastSpecificTime(value);
    setDayDelta(0);
    setOpen(true);
  };

  const toggleAllDay = () => {
    setDraft(isAllDay ? lastSpecificTime : ALL_DAY_TIME);
  };

  const handleSpecificTimeChange = (next: string, wrapDelta?: number) => {
    setDraft(next);
    setLastSpecificTime(next);
    if (wrapDelta) setDayDelta((d) => d + wrapDelta);
  };

  const confirm = () => {
    onChange(draft, dayDelta || undefined);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="time-picker-trigger" onClick={openPicker}>
        {formatTimeLabel(value, t('taskForm.allDay'))}
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
                    shape draft is in, so no conversion needed either way. Typing
                    a time directly never wraps a day the way scrolling past
                    midnight on the wheel does, so no dayDelta here. */}
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
