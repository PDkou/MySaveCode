import { useEffect, useRef, useState } from 'react';
import { onToast } from './toast';
import './ToastHost.css';

const SHOW_MS = 2200;

export function ToastHost() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let id = 0;
    onToast((text) => {
      id += 1;
      setToast({ id, text });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), SHOW_MS);
    });
    return () => { onToast(null); window.clearTimeout(timer.current); };
  }, []);
  return (
    <div className="drawary-toast-wrap" role="status" aria-live="polite">
      {toast && <div className="drawary-toast" key={toast.id}>{toast.text}</div>}
    </div>
  );
}
