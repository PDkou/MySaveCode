import { useState } from 'react';
import { cooldownMessage, failureMessage, type VerifyResult } from '../flow/appLock';
import { useCooldown } from '../flow/useCooldown';
import './PinSetupScreen.css';

export interface PinSetupScreenProps {
  /**
   * `set`: first PIN (new -> confirm -> done). `change`: asks for the current
   * PIN first. `verify`: only asks for the current PIN (to turn the lock off).
   */
  mode?: 'set' | 'change' | 'verify';
  /** Checks the current PIN (change and verify). */
  verify?: (pin: string) => Promise<VerifyResult>;
  /** Epoch ms until which entering a PIN is paused after too many wrong tries. */
  lockedUntil?: number;
  onBack?: () => void;
  /** set / change: the new PIN, once confirmed and the user taps 확인. */
  onComplete?: (pin: string) => void;
  /** verify: the current PIN was right. */
  onVerified?: () => void;
}

type Phase = 'current' | 'new' | 'confirm' | 'done';

const PHASE_LABELS: Record<Phase, string> = { current: '현재 PIN 입력', new: '새 PIN 입력', confirm: 'PIN 한 번 더 입력', done: 'PIN 설정 완료' };
const STEP_BADGE: Record<Phase, string> = { current: '확인', new: '1 / 2 단계', confirm: '2 / 2 단계', done: '완료' };
const PROMPT: Record<Phase, string> = {
  current: '지금 쓰는 4자리 PIN을 입력해 주세요.',
  new: '숫자 4자리를 입력해 주세요.',
  confirm: '같은 PIN을 한 번 더 입력해 주세요.',
  done: 'PIN 입력을 확인했어요.',
};

/**
 * #42 PIN 설정 / 변경. Ported from
 * `Drawary_42_PIN_SETUP_CONFIRMED_2026-10-13`'s `index.html` -- the
 * vanilla JS's own new->confirm->done state machine (with mismatch
 * recovery back to "new") ported 1:1 as `useState`, not simulated.
 * README.md's confirmed copy ("소중한 기록을 지켜요" / "4자리 PIN을
 * 설정해 / 내 서랍을 안전하게 잠가요.") kept verbatim; new
 * `icon_keypad_erase.webp` asset copied in from the archive.
 *
 * The archive's own markup has no "다음" affordance once `phase ===
 * 'done'` -- it just disables the keypad and shows feedback text. A
 * real integration needs to hand the completed PIN back to the caller
 * somehow, so a `.ps42-done-confirm` button replaces the bottom note
 * once done (same vertical slot, not stacked on top of it -- stacking
 * both pushed the button below the fixed 844px panel, caught during
 * this screen's own QA), rather than guessing an auto-navigate timer
 * the source never specified.
 *
 * V2-12 step 4-A additions (not in the approved source; disclosed):
 * `mode` 'change'/'verify' add a first "현재 PIN 입력" step that reuses the same
 * layout (the old PIN must be known before it can be replaced, or before the
 * lock can be turned off), and 'verify' swaps a few lines of copy ("PIN 확인").
 * After too many wrong tries the keypad pauses and the line under the dots
 * counts the seconds down.
 */

export function PinSetupScreen({ mode = 'set', verify, lockedUntil = 0, onBack, onComplete, onVerified }: PinSetupScreenProps) {
  const [phase, setPhase] = useState<Phase>(mode === 'set' ? 'new' : 'current');
  const [first, setFirst] = useState('');
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState('');
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const wait = useCooldown(lockedUntil);
  const paused = wait > 0;
  const isVerify = mode === 'verify';

  const fail = (message: string) => {
    setTyped('');
    setFeedback(message);
    setShake(true);
    setTimeout(() => setShake(false), 240);
  };

  const press = (digit: string) => {
    if (phase === 'done' || typed.length >= 4 || busy || paused) return;
    setFeedback('');
    const next = typed + digit;
    setTyped(next);
    if (next.length < 4) return;
    if (phase === 'current') {
      setBusy(true);
      void (verify ? verify(next) : Promise.resolve<VerifyResult>({ ok: true }))
        .then((result) => {
          if (result.ok) {
            setTyped('');
            if (isVerify) onVerified?.(); else setPhase('new');
          } else fail(failureMessage(result));
        })
        .catch(() => fail('확인하지 못했어요. 다시 시도해 주세요.'))
        .finally(() => setBusy(false));
    } else if (phase === 'new') {
      setFirst(next);
      setTyped('');
      setPhase('confirm');
    } else if (phase === 'confirm') {
      if (next === first) {
        setPhase('done');
        setTyped('');
        setFeedback('PIN을 설정했어요.');
      } else {
        setFirst('');
        setTyped('');
        setPhase('new');
        fail('PIN이 일치하지 않아요. 다시 입력해 주세요.');
      }
    }
  };

  const erase = () => {
    if (phase === 'done' || busy) return;
    setTyped((v) => v.slice(0, -1));
  };

  const shownFeedback = paused ? cooldownMessage(wait) : feedback;
  const keysOff = phase === 'done' || busy || paused;

  return (
    <div className="ps42-screen">
      <header className="ps42-header">
        {onBack && <button type="button" className="ps42-back" onClick={onBack} aria-label="앱 잠금으로 돌아가기" />}
        <h1>{isVerify ? 'PIN 확인' : 'PIN 설정'}</h1>
      </header>
      <main className="ps42-panel">
        <h2 className="ps42-section-title">{isVerify ? 'PIN 확인하기' : 'PIN 만들기'}</h2>
        <section className="ps42-pin-hero" aria-label="PIN 안내">
          <div className="ps42-pin-hero-icon"><img src="/assets/states/permissions/state_permission_lock.webp" alt="" /></div>
          {isVerify ? (
            <div>
              <strong>본인이 맞는지 확인해요</strong>
              <small>지금 쓰는 PIN을 입력하면<br />앱 잠금을 끌 수 있어요.</small>
            </div>
          ) : (
            <div>
              <strong>소중한 기록을 지켜요</strong>
              <small>4자리 PIN을 설정해<br />내 서랍을 안전하게 잠가요.</small>
            </div>
          )}
        </section>
        <div className="ps42-step">
          <strong>{PHASE_LABELS[phase]}</strong>
          <span className="ps42-step-badge">{STEP_BADGE[phase]}</span>
        </div>
        <p className="ps42-prompt">{PROMPT[phase]}</p>
        <div className={`ps42-pin-indicators${shake ? ' error' : ''}`} aria-label="PIN 4자리 입력 상태">
          {[0, 1, 2, 3].map((i) => <span key={i} className={i < typed.length ? 'filled' : ''} />)}
        </div>
        <div className="ps42-pin-feedback" aria-live="polite">{shownFeedback}</div>
        <section className="ps42-keypad" aria-label="PIN 숫자 키패드">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className="ps42-num" disabled={keysOff} onClick={() => press(d)}>{d}</button>
          ))}
          <span className="ps42-num ps42-void" aria-hidden="true" />
          <button type="button" className="ps42-num" disabled={keysOff} onClick={() => press('0')}>0</button>
          <button
            type="button"
            className="ps42-num ps42-erase"
            aria-label="마지막 숫자 지우기"
            disabled={keysOff}
            onClick={erase}
          >
            <img src="/assets/ui-icons/icon_keypad_erase.webp" alt="" />
          </button>
        </section>
        {phase === 'done' ? (
          <button type="button" className="ps42-done-confirm uf-cta-primary" onClick={() => onComplete?.(first)}>확인</button>
        ) : (
          <div className="ps42-bottom-note">
            <img src="/assets/ui-icons/icon_info.webp" alt="" />
            {isVerify
              ? <span>PIN은 이 기기에서만 사용돼요.<br />잊어버리면 복구할 수 없어요.</span>
              : <span>PIN은 이 기기에서만 사용돼요.<br />다음 단계에서 한 번 더 확인해요.</span>}
          </div>
        )}
      </main>
    </div>
  );
}
