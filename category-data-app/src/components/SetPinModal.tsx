import { useState } from 'react';
import { Modal } from './Modal';
import { PinPad } from './PinPad';
import { setPin } from '../lib/lock';

interface SetPinModalProps {
  onDone: () => void;
  onClose: () => void;
}

const PIN_LENGTH = 4;

export function SetPinModal({ onDone, onClose }: SetPinModalProps) {
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
      setError('PIN이 일치하지 않아요. 처음부터 다시 입력해 주세요.');
      setFirstPin('');
      setPinValue('');
      setStage('enter');
    }
  };

  return (
    <Modal title="앱 잠금 설정" onClose={onClose}>
      <p className="modal-hint">{stage === 'enter' ? '사용할 4자리 PIN을 입력하세요.' : '확인을 위해 다시 한 번 입력하세요.'}</p>
      {error && <p className="error-hint">{error}</p>}
      <PinPad length={PIN_LENGTH} value={pin} onDigit={handleDigit} onBackspace={() => setPinValue((p) => p.slice(0, -1))} />
    </Modal>
  );
}
