import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { PinPad } from './PinPad';
import { verifyPin, removeLock } from '../lib/lock';

interface LockScreenProps {
  onUnlock: () => void;
  // There is no server/account to recover a forgotten PIN against, so
  // the only honest recovery path is the same one a forgotten device
  // passcode has: wipe and start over. App.tsx wires this to replaceAll
  // with empty data.
  onForgotWipe: () => void;
}

const PIN_LENGTH = 4;

export function LockScreen({ onUnlock, onForgotWipe }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const handleDigit = (digit: string) => {
    if (checking) return;
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    setError(false);
    if (next.length !== PIN_LENGTH) return;

    setChecking(true);
    verifyPin(next).then((ok) => {
      setChecking(false);
      if (ok) {
        onUnlock();
      } else {
        setError(true);
        setPin('');
      }
    });
  };

  return (
    <div className="screen lock-screen">
      <div className="lock-content">
        <p className="lock-title">잠금 해제</p>
        <PinPad length={PIN_LENGTH} value={pin} error={error} onDigit={handleDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} />
        {error && <p className="lock-error">PIN이 올바르지 않아요</p>}
        <button type="button" className="lock-forgot" onClick={() => setConfirmWipe(true)}>
          PIN을 잊으셨나요?
        </button>
      </div>

      {confirmWipe && (
        <ConfirmDialog
          title="PIN 초기화"
          message="서버 계정이 없는 앱이라 PIN을 되찾을 방법이 없어요. 계속하면 잠금과 함께 이 기기의 모든 데이터가 삭제돼요. 계속할까요?"
          confirmLabel="모두 삭제하고 잠금 해제"
          danger
          onConfirm={() => {
            removeLock();
            onForgotWipe();
          }}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
  );
}
