import './LockDetailScreen.css';
import { t, tl } from '../i18n';

export interface LockDetailScreenProps {
  hasPin: boolean;
  appLockEnabled: boolean;
  onBack?: () => void;
  onToggleAppLock?: () => void;
  onOpenPinSetup?: () => void;
}

/**
 * #41 잠금 설정 상세. Ported from
 * `Drawary_41_LOCK_DETAIL_CONFIRMED_2026-10-13`'s `index.html` -- same
 * header/hero/items shell as #40, with #41's own `.lock-summary`/
 * `.pin-guide` additions (present in the archive's CSS but unused by
 * its own markup; left unported since nothing here needs them).
 *
 * The archive's own script comment is explicit: "Do not turn on a lock
 * when PIN has not yet been configured" -- `hasPin` (lifted to App.tsx,
 * set once #42's real PIN flow completes) gates the switch for real,
 * not just visually. "PIN 설정 / 변경" -> #42.
 */
export function LockDetailScreen({ hasPin, appLockEnabled, onBack, onToggleAppLock, onOpenPinSetup }: LockDetailScreenProps) {
  return (
    <div className="ld41-screen">
      <header className="ld41-header">
        {onBack && <button type="button" className="ld41-back" onClick={onBack} aria-label={t('보안 설정으로 돌아가기')} />}
        <h1>{t('앱 잠금')}</h1>
      </header>
      <section className="ld41-panel">
        <h2 className="ld41-section-title">{t('잠금 관리')}</h2>
        <section className="ld41-hero">
          <div className="ld41-hero-art"><img src="/assets/states/permissions/state_permission_lock.webp" alt="" /></div>
          <div className="ld41-hero-copy">
            <strong>{t('내 서랍을 안전하게')}</strong>
            <span>{tl('나만 아는 PIN으로\n소중한 기록을 보호해요.')}</span>
          </div>
        </section>
        <section className="ld41-items" aria-label={t('잠금 관리 항목')}>
          <div className="ld41-item">
            <span className="ld41-item-icon"><img src="/assets/ui-icons/icon_lock.webp" alt="" /></span>
            <span className="ld41-item-copy"><strong>{t('앱 잠금 사용')}</strong><small>{t('앱을 열 때 PIN을 입력해요.')}</small></span>
            <button
              type="button"
              role="switch"
              aria-label={t('앱 잠금 사용')}
              aria-checked={appLockEnabled}
              className="ld41-switch"
              disabled={!hasPin}
              onClick={onToggleAppLock}
            />
          </div>
          <button className="ld41-item" type="button" aria-label={t('PIN 설정 또는 변경 화면으로 이동')} onClick={onOpenPinSetup}>
            <span className="ld41-item-icon"><img src="/assets/ui-icons/icon_edit.webp" alt="" /></span>
            <span className="ld41-item-copy"><strong>{t('PIN 설정 / 변경')}</strong><small>{t('잠금에 사용할 PIN을 관리해요.')}</small></span>
            <span className="ld41-right-arrow" aria-hidden="true">›</span>
          </button>
        </section>
        <div className="ld41-note">
          <img className="ld41-note-icon" src="/assets/ui-icons/icon_info.webp" alt="" />
          <span>{tl('앱 잠금을 사용하려면 먼저 PIN을 설정해 주세요.\nPIN은 이 기기에만 저장돼요.')}</span>
        </div>
      </section>
    </div>
  );
}
