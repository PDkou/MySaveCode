import { useState } from 'react';
import { Modal } from './Modal';
import { PinPad } from './PinPad';
import { setPin } from '../lib/lock';
import { useI18n } from '../i18n';

interface SetPinModalProps {
  onDone: () => void;
  onClose: () => void;
}

const PIN_LENGTH = 4;

export function SetPinModal({ onDone, onClose }: SetPinModalProps) {
  const { t } = useI18n();
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDigit = (digit: string) => {
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPinValue(next);
    if (next.length !== PIN_LENGTH) return;

    if (stage === 'enter') {
      setFirstPin(next);
      setPinValue('');
      setStage('confirm');
      return;
    }

    if (next === firstPin) {
      setPin(next).then(onDone);
    } else {
      setError(t('lock.pinMismatch'));
      setFirstPin('');
      setPinValue('');
      setStage('enter');
    }
  };

  return (
    <Modal title={t('lock.setup')} onClose={onClose}>
      <p className="modal-hint">{stage === 'enter' ? t('lock.enterPin') : t('lock.confirmPin')}</p>
      {error && <p className="error-hint">{error}</p>}
      <PinPad length={PIN_LENGTH} value={pin} onDigit={handleDigit} onBackspace={() => setPinValue((p) => p.slice(0, -1))} />
    </Modal>
  );
}
