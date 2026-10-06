import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { PinPad } from './PinPad';
import { verifyPin, removeLock } from '../lib/lock';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
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
        <p className="lock-title">{t('lock.unlock')}</p>
        <PinPad length={PIN_LENGTH} value={pin} error={error} onDigit={handleDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} />
        {error && <p className="lock-error">{t('lock.invalidPin')}</p>}
        <button type="button" className="lock-forgot" onClick={() => setConfirmWipe(true)}>
          {t('lock.forgotPin')}
        </button>
      </div>

      {confirmWipe && (
        <ConfirmDialog
          title={t('lock.resetPin')}
          message={t('lock.resetMessage')}
          confirmLabel={t('lock.wipeAndUnlock')}
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
