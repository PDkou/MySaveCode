interface PinPadProps {
  length: number;
  value: string;
  error?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

// The dot row + numeric keypad shared by LockScreen.tsx (unlocking) and
// SetPinModal.tsx (choosing/confirming a new PIN) -- same widget, two
// different call sites for what happens once `length` digits are in.
export function PinPad({ length, value, error, onDigit, onBackspace }: PinPadProps) {
  return (
    <>
      <div className={`lock-dots ${error ? 'error' : ''}`}>
        {Array.from({ length }).map((_, i) => (
          <span key={i} className={`lock-dot ${i < value.length ? 'filled' : ''}`} />
        ))}
      </div>
      <div className="lock-keypad">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className="lock-key"
              onClick={() => (k === '⌫' ? onBackspace() : onDigit(k))}
              aria-label={k === '⌫' ? '지우기' : k}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </>
  );
}
