import { useState } from 'react';
import { cooldownMessage, failureMessage, type VerifyResult } from '../flow/appLock';
import { useCooldown } from '../flow/useCooldown';
import './AppLockScreen.css';
import { t, tl } from '../i18n';

export interface AppLockScreenProps {
  /** Checks the typed PIN against the saved one. */
  verify: (pin: string) => Promise<VerifyResult>;
  /** Epoch ms until which entry is paused after too many wrong tries. */
  lockedUntil?: number;
  onUnlock?: () => void;
}

/**
 * #43 앱 잠금 화면. Ported from
 * `Drawary_43_APP_LOCK_CONFIRMED_2026-10-13`'s `index.html` -- the
 * vanilla JS's verify/error-shake/unlock flow. No back button at all,
 * matching the source exactly (a fullscreen authentication gate has
 * nowhere to go back to).
 *
 * V2-12 step 4-A: the archive compared the typed digits with a hardcoded
 * demo PIN ("NEVER use this as an application PIN"). Here `verify` checks
 * the saved PIN hash instead and counts wrong tries; after too many the
 * keypad pauses and the line under the dots counts the seconds down
 * (`lockedUntil`, saved, so closing the app does not skip the wait). That
 * pause line is new copy, not in the approved source.
 */
export function AppLockScreen({ verify, lockedUntil = 0, onUnlock }: AppLockScreenProps) {
  const [typed, setTyped] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const wait = useCooldown(lockedUntil);
  const paused = wait > 0;

  const enter = (digit: string) => {
    if (unlocked || typed.length >= 4 || busy || paused) return;
    setFeedback('');
    const next = typed + digit;
    setTyped(next);
    if (next.length < 4) return;
    setBusy(true);
    verify(next)
      .then((result) => {
        if (result.ok) {
          setUnlocked(true);
          onUnlock?.();
          return;
        }
        setTyped('');
        setFeedback(failureMessage(result));
        setShake(true);
        setTimeout(() => setShake(false), 240);
      })
      .catch(() => { setTyped(''); setFeedback(t('확인하지 못했어요. 다시 시도해 주세요.')); })
      .finally(() => setBusy(false));
  };

  const erase = () => {
    if (unlocked || busy) return;
    setTyped((v) => v.slice(0, -1));
    setFeedback('');
  };

  const shownFeedback = paused ? cooldownMessage(wait) : feedback;
  const keysOff = unlocked || busy || paused;

  return (
    <div className="al43-screen">
      <header className="al43-header"><h1>{t('앱 잠금')}</h1></header>
      <main className="al43-panel">
        <h2 className="al43-section-title">{t('내 서랍 열기')}</h2>
        <section className="al43-pin-hero" aria-label={t('PIN 안내')}>
          <div className="al43-pin-hero-icon"><img src="/assets/states/permissions/state_permission_lock.webp" alt="" /></div>
          <div>
            <strong>{t('내 서랍을 열어볼까요?')}</strong>
            <small>{tl('PIN을 입력하면\n저장한 기록을 볼 수 있어요.')}</small>
          </div>
        </section>
        <div className="al43-step">
          <strong>{unlocked ? t('잠금 해제 완료') : t('PIN 입력')}</strong>
          <span className="al43-step-badge">{unlocked ? t('열림') : t('잠금 상태')}</span>
        </div>
        <p className="al43-prompt">{unlocked ? t('내 서랍을 열었어요.') : t('설정한 4자리 PIN을 입력해 주세요.')}</p>
        <div className={`al43-pin-indicators${shake ? ' error' : ''}`} aria-label={t('PIN 4자리 입력 상태')}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < typed.length ? 'filled' : ''} />)}
        </div>
        <div className="al43-pin-feedback" aria-live="polite">{shownFeedback}</div>
        <section className="al43-keypad" aria-label={t('PIN 숫자 키패드')}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className="al43-num" disabled={keysOff} onClick={() => enter(d)}>{d}</button>
          ))}
          <span className="al43-num al43-void" aria-hidden="true" />
          <button type="button" className="al43-num" disabled={keysOff} onClick={() => enter('0')}>0</button>
          <button
            type="button"
            className="al43-num al43-erase"
            aria-label={t('마지막 숫자 지우기')}
            disabled={keysOff}
            onClick={erase}
          >
            <img src="/assets/ui-icons/icon_keypad_erase.webp" alt="" />
          </button>
        </section>
      </main>
    </div>
  );
}
