import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './NotificationTimingScreen.css';
import { t } from '../i18n';

export interface NotificationTimingScreenProps {
  drawerName: string;
  dateFieldName: string;
  initialDaysBefore?: number;
  initialTime?: string;
  drawerIconUri?: string;
  onBack?: () => void;
  onSubmit?: (value: { daysBefore: number; time: string }) => void;
}

const TIMING_OPTIONS = [30, 14, 7, 3, 1, 0] as const;

function timingLabel(days: number): string {
  return days === 0 ? t('당일') : t('{days}일 전', { days });
}

/**
 * #31 알림 시점 / 시간 설정. No separate TSX exists for this screen,
 * only `render.html` (static preview) + CONFIRMED.md's behavioral spec.
 * Markup/CSS (unprefixed classes in the source) extracted via regex
 * (base64-inlined icons, same approach as #21/#24/#27) and given this
 * file's `nt-` prefix. Built as a real interactive component rather
 * than the static preview: the 6 preset timing chips
 * (30/14/7/3/1일 전, 당일) are real buttons defaulting to 7일 전 per
 * CONFIRMED.md ("기본 후보: 7일 전"); "직접 설정하기" reveals a
 * stepper (1~90일 전) for a custom value, matching the stepper
 * convention #35/#36 already established for free-form counts since no
 * dedicated input screen exists for it; the time row is a real
 * `<input type="time">` overlaid on the display (same native-input
 * convention #36 uses for its date field) defaulting to 09:00 per
 * CONFIRMED.md, changeable by tapping it.
 *
 * Also restored the drawer-context card (`.nt-context`, "화장품 /
 * 알림을 추가할 서랍") -- it IS present in render.html's body (`<section
 * class="context">`, same markup/copy as #30's own context card), but
 * was missed on the first port since the extraction focused on the
 * timing/time sections; caught by comparing against
 * `31_CONFIRMED_RENDER.png`, which clearly shows it.
 */
export function NotificationTimingScreen({
  drawerName,
  dateFieldName,
  initialDaysBefore = 7,
  initialTime = '09:00',
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onBack,
  onSubmit,
}: NotificationTimingScreenProps) {
  const isPreset = (TIMING_OPTIONS as readonly number[]).includes(initialDaysBefore);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [daysBefore, setDaysBefore] = useState(initialDaysBefore);
  const [time, setTime] = useState(initialTime);

  return (
    <main className="nt-screen">
      <ScreenHeader title={t('알림 추가하기')} onBack={onBack} height={88} />

      <section className="nt-context">
        <div className="nt-drawer-icon"><img src={drawerIconUri} alt="" /></div>
        <div className="nt-context-copy">
          <strong>{drawerName}</strong>
          <span>{t('알림을 추가할 서랍')}</span>
        </div>
      </section>

      <section className="nt-intro">
        <h2>{t('언제 알려드릴까요?')}</h2>
        <p>{t('선택한 날짜를 기준으로 언제, 몇 시에 알려드릴지 정해 주세요.')}</p>
      </section>

      <section className="nt-basis-card">
        <span className="nt-basis-icon"><img src="/assets/field-types/field_date.webp" alt="" /></span>
        <span className="nt-basis-copy">
          <strong>{dateFieldName}</strong>
          <span>{t('알림 기준 날짜')}</span>
        </span>
        <span className="nt-basis-tag">{t('선택됨')}</span>
      </section>

      <div className="nt-section-label">{t('알림 시점')}</div>
      <div className="nt-timing-grid">
        {TIMING_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            className={`nt-timing${!customOpen && days === daysBefore ? ' selected' : ''}`}
            onClick={() => { setCustomOpen(false); setDaysBefore(days); }}
          >
            {timingLabel(days)}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`nt-custom${customOpen ? ' selected' : ''}`}
        onClick={() => setCustomOpen(true)}
      >
        
        {t('직접 설정하기')}
      </button>
      {customOpen && (
        <div className="nt-custom-stepper">
          <button type="button" aria-label={t('감소')} onClick={() => setDaysBefore((v) => Math.max(1, v - 1))}>−</button>
          <strong>{t('{n}일 전', { n: daysBefore })}</strong>
          <button type="button" aria-label={t('증가')} onClick={() => setDaysBefore((v) => Math.min(90, v + 1))}>＋</button>
        </div>
      )}

      <div className="nt-section-label">{t('알림 시간')}</div>
      <label className="nt-time-card">
        <span className="nt-time-icon"><img src="/assets/ui-icons/icon_notification.webp" alt="" /></span>
        <span className="nt-time-copy">
          <strong>{t('알림을 받을 시간')}</strong>
          <span>{t('누르면 시간을 바꿀 수 있어요')}</span>
        </span>
        <span className="nt-time-value">{time}</span>
        <input
          type="time"
          className="nt-time-input"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label={t('알림 시간')}
        />
      </label>
      <div className="nt-time-note">{t('이 시간은 나중에 알림 기본 설정에서 바꿀 수 있어요.')}</div>

      <div className="nt-actions">
        <button className="nt-prev" type="button" onClick={onBack}>{t('이전')}</button>
        <button className="nt-save" type="button" onClick={() => onSubmit?.({ daysBefore, time })}>
          
          {t('알림 설정하기')}
        </button>
      </div>
    </main>
  );
}
