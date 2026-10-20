import { ScreenHeader } from '../components/ScreenHeader';
import './NotificationCommonSettingsScreen.css';
import { quietSummary, type NotifyCommon } from '../flow/notifySettings';
import { t, tx } from '../i18n';

interface Props {
  value: NotifyCommon;
  onChange: (next: NotifyCommon) => void;
  onBack?: () => void;
}

function TimeRow({ title, hint, value, onChange }: { title: string; hint: string; value: string; onChange: (t: string) => void }) {
  return (
    <label className="ncs-card ncs-time">
      <span className="ncs-icon"><img src="/assets/ui-icons/icon_notification.webp" alt="" /></span>
      <span className="ncs-copy"><strong>{title}</strong><span>{hint}</span></span>
      <span className="ncs-value">{value}</span>
      <input type="time" className="ncs-time-input" value={value} aria-label={title} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </label>
  );
}

/**
 * 알림 공통 설정: the destination of #29's "알림 공통 설정 · 기본 알림 시간 ·
 * 알림 쉬는 시간" row. None of the 59 approved designs shows it, so this is a
 * new screen drawn from #29/#31's own pieces (same header, cards, icon tile,
 * time row and colors) and awaits the user's approval. Changes save at once.
 */
export function NotificationCommonSettingsScreen({ value, onChange, onBack }: Props) {
  const set = (patch: Partial<NotifyCommon>) => onChange({ ...value, ...patch });
  return (
    <section className="ncs-screen">
      <ScreenHeader title={t('알림 공통 설정')} onBack={onBack} height={92} />

      <div className="ncs-label">{t('기본 알림 시간')}</div>
      <TimeRow title={t('새 알림의 기본 시간')} hint={t('알림을 추가할 때 이 시간으로 시작해요.')} value={value.defaultTime} onChange={(t) => set({ defaultTime: t })} />
      <p className="ncs-note">{t('이미 만든 알림의 시간은 바뀌지 않아요.')}</p>

      <div className="ncs-label">{t('알림 쉬는 시간')}</div>
      <div className="ncs-card ncs-switch-card">
        <span className="ncs-icon"><img src="/assets/ui-icons/icon_notification.webp" alt="" /></span>
        <span className="ncs-copy">
          <strong>{t('알림 쉬는 시간 사용')}</strong>
          <span>{t('쉬는 시간에 울릴 알림은 끝난 뒤에 알려드려요.')}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={value.quietEnabled}
          aria-label={t('알림 쉬는 시간 사용')}
          className={`ncs-switch${value.quietEnabled ? ' is-on' : ''}`}
          onClick={() => set({ quietEnabled: !value.quietEnabled })}
        ><span /></button>
      </div>

      {value.quietEnabled && (
        <>
          <TimeRow title={t('쉬기 시작')} hint={t('이 시간부터 알림을 쉬어요.')} value={value.quietStart} onChange={(t) => set({ quietStart: t })} />
          <TimeRow title={t('쉬기 끝')} hint={t('이 시간이 되면 다시 알려드려요.')} value={value.quietEnd} onChange={(t) => set({ quietEnd: t })} />
          <p className="ncs-note">
            {value.quietStart === value.quietEnd
              ? t('시작과 끝이 같으면 쉬는 시간이 없어요.')
              : tx('쉬는 시간: {range}', { range: <b>{quietSummary(value)}</b> })}
          </p>
        </>
      )}

      <p className="ncs-tip">{t('설정은 모든 서랍의 알림에 바로 적용돼요.')}</p>
    </section>
  );
}
