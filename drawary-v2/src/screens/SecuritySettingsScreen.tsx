import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './SecuritySettingsScreen.css';

export interface SecuritySettingsScreenProps {
  onBack?: () => void;
  onOpenAppLock?: () => void;
}

/**
 * #40 보안 설정. Ported from `Drawary_40_SECURITY_CONFIRMED_2026-10-13`'s
 * `index.html` -- the vanilla JS switch-toggle handler ported to
 * `useState`. README.md: 38/39와 동일 기준 유지, 신규 승인 에셋
 * `icon_security_biometric.webp` (copied into `ui-icons/`, the already-
 * downscaled `_512` variant used here since the full original is
 * 426KB -- far larger than this icon ever renders). "자동 잠금" reuses
 * the existing `icon_lock.webp` with a CSS-drawn clock overlay, exactly
 * as the source's own comment specifies (no new art). "앱 잠금" row ->
 * #41; 41번/42번은 README's own words "별도, 미확정"이었지만 이번
 * 배치에서 함께 확정/통합.
 */
export function SecuritySettingsScreen({ onBack, onOpenAppLock }: SecuritySettingsScreenProps) {
  const [biometric, setBiometric] = useState(false);
  const [autoLock, setAutoLock] = useState(false);

  return (
    <div className="sec40-screen">
      <ScreenHeader title="보안 설정" onBack={onBack} backLabel="설정으로 돌아가기" height={85} />
      <main className="sec40-panel">
        <h2 className="sec40-section-title">내 서랍 보호하기</h2>
        <section className="sec40-hero">
          <div className="sec40-hero-art"><img src="/assets/states/permissions/state_permission_lock.webp" alt="" /></div>
          <div className="sec40-hero-copy">
            <strong>소중한 기록을 안전하게</strong>
            <span>앱을 열 때 잠금을 설정하고<br />내 기록을 보호할 수 있어요.</span>
          </div>
        </section>
        <section className="sec40-items" aria-label="보안 항목">
          <button className="sec40-item" type="button" aria-label="앱 잠금 설정 상세로 이동" onClick={onOpenAppLock}>
            <span className="sec40-item-icon"><img src="/assets/ui-icons/icon_lock.webp" alt="" /></span>
            <span className="sec40-item-copy"><strong>앱 잠금</strong><small>PIN과 잠금 방식을 관리해요.</small></span>
            <span className="sec40-right-arrow">›</span>
          </button>
          <div className="sec40-item">
            <span className="sec40-item-icon"><img src="/assets/ui-icons/icon_security_biometric_512.webp" alt="" /></span>
            <span className="sec40-item-copy"><strong>생체 인증</strong><small>지문이나 얼굴 인식으로 잠금을 풀어요.</small></span>
            <button
              type="button"
              role="switch"
              aria-label="생체 인증 사용"
              aria-checked={biometric}
              className="sec40-switch"
              onClick={() => setBiometric((v) => !v)}
            />
          </div>
          <div className="sec40-item">
            <span className="sec40-item-icon sec40-icon-autolock">
              <img src="/assets/ui-icons/icon_lock.webp" alt="" />
              <span className="sec40-clock-overlay" aria-hidden="true" />
            </span>
            <span className="sec40-item-copy"><strong>자동 잠금</strong><small>앱을 벗어나면 자동으로 잠가요.</small></span>
            <button
              type="button"
              role="switch"
              aria-label="자동 잠금 사용"
              aria-checked={autoLock}
              className="sec40-switch"
              onClick={() => setAutoLock((v) => !v)}
            />
          </div>
        </section>
        <div className="sec40-note">
          <img className="sec40-note-icon" src="/assets/ui-icons/icon_info.webp" alt="" />
          <span>보안 설정은 이 기기에서만 사용돼요.<br />언제든 설정을 바꿀 수 있어요.</span>
        </div>
      </main>
    </div>
  );
}
