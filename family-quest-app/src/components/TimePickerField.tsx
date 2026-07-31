import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WheelTimePicker } from './WheelTimePicker';

interface TimePickerFieldProps {
  value: string; // 'HH:MM', 24-hour
  onChange: (value: string) => void;
}

function formatTimeLabel(time: string, lang: 'ko' | 'ja'): string {
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

  const openPicker = () => {
    setDraft(value);
    setOpen(true);
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="time-picker-trigger" onClick={openPicker}>
        {formatTimeLabel(value, lang)}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* Direct typing as a fast path alongside the wheel below --
                native <input type="time"> already speaks the same 'HH:MM'
                shape draft is in, so no conversion needed either way. */}
            <input
              type="time"
              className="time-picker-manual-input"
              lang={lang}
              value={draft}
              onChange={(e) => e.target.value && setDraft(e.target.value)}
            />
            <WheelTimePicker value={draft} onChange={setDraft} />
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
