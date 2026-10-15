import { useState } from 'react';
import './AppLockScreen.css';

export interface AppLockScreenProps {
  correctPin: string;
  onUnlock?: () => void;
}

/**
 * #43 앱 잠금 화면. Ported from
 * `Drawary_43_APP_LOCK_CONFIRMED_2026-10-13`'s `index.html` -- the
 * vanilla JS's real verify/error-shake/unlock logic ported 1:1, not
 * simulated. No back button at all, matching the source exactly (a
 * fullscreen authentication gate has nowhere to go back to).
 *
 * `correctPin` is the real PIN committed via #42's flow (App.tsx wires
 * it through), not the archive's own hardcoded `demoPIN='2468'` --
 * falls back to that same demo value only when no PIN has been set yet
 * (e.g. a standalone QA visit to this route), so the archive's own
 * explicit "NEVER use this as an application PIN" caveat still holds:
 * this is still a design-preview verifier, not a secure credential
 * store.
 */
export function AppLockScreen({ correctPin, onUnlock }: AppLockScreenProps) {
  const [typed, setTyped] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [shake, setShake] = useState(false);

  const enter = (digit: string) => {
    if (unlocked || typed.length >= 4) return;
    setFeedback('');
    const next = typed + digit;
    setTyped(next);
    if (next.length === 4) {
      if (next === correctPin) {
        setUnlocked(true);
        onUnlock?.();
      } else {
        setTyped('');
        setFeedback('PIN이 일치하지 않아요. 다시 입력해 주세요.');
        setShake(true);
        setTimeout(() => setShake(false), 240);
      }
    }
  };

  const erase = () => {
    if (unlocked) return;
    setTyped((v) => v.slice(0, -1));
    setFeedback('');
  };

  return (
    <div className="al43-screen">
      <header className="al43-header"><h1>앱 잠금</h1></header>
      <main className="al43-panel">
        <h2 className="al43-section-title">내 서랍 열기</h2>
        <section className="al43-pin-hero" aria-label="PIN 안내">
          <div className="al43-pin-hero-icon"><img src="/assets/states/permissions/state_permission_lock.webp" alt="" /></div>
          <div>
            <strong>내 서랍을 열어볼까요?</strong>
            <small>PIN을 입력하면<br />저장한 기록을 볼 수 있어요.</small>
          </div>
        </section>
        <div className="al43-step">
          <strong>{unlocked ? '잠금 해제 완료' : 'PIN 입력'}</strong>
          <span className="al43-step-badge">{unlocked ? '열림' : '잠금 상태'}</span>
        </div>
        <p className="al43-prompt">{unlocked ? '내 서랍을 열었어요.' : '설정한 4자리 PIN을 입력해 주세요.'}</p>
        <div className={`al43-pin-indicators${shake ? ' error' : ''}`} aria-label="PIN 4자리 입력 상태">
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < typed.length ? 'filled' : ''} />)}
        </div>
        <div className="al43-pin-feedback" aria-live="polite">{feedback}</div>
        <section className="al43-keypad" aria-label="PIN 숫자 키패드">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className="al43-num" disabled={unlocked} onClick={() => enter(d)}>{d}</button>
          ))}
          <span className="al43-num al43-void" aria-hidden="true" />
          <button type="button" className="al43-num" disabled={unlocked} onClick={() => enter('0')}>0</button>
          <button
            type="button"
            className="al43-num al43-erase"
            aria-label="마지막 숫자 지우기"
            disabled={unlocked}
            onClick={erase}
          >
            <img src="/assets/ui-icons/icon_keypad_erase.webp" alt="" />
          </button>
        </section>
      </main>
    </div>
  );
}
