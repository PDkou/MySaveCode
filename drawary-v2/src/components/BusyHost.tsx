import { useEffect, useState } from 'react';
import { BackupProgressScreen } from '../screens/BackupProgressScreen';
import { onBusy, type BusyCopy } from './busy';
import './BusyHost.css';

export function BusyHost() {
  const [copy, setCopy] = useState<BusyCopy | null>(null);
  useEffect(() => { onBusy(setCopy); return () => onBusy(null); }, []);
  if (!copy) return null;
  return <div className="drawary-busy-layer" role="alert" aria-busy="true"><BackupProgressScreen copy={copy} /></div>;
}
