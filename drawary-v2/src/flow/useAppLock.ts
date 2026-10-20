import { useCallback, useEffect, useRef, useState } from 'react';
import { readSecurity, type SecuritySettings } from './appLock';
import { autoLockSuspended } from '../data/appLockGuard';
import { authenticateBiometric, hasNativeBiometric } from '../data/nativeBridge';
import { clearAttempts } from '../data/appLockActions';

export interface AppLockState {
  security: SecuritySettings;
  /** The lock screen must cover the app right now. */
  locked: boolean;
  /** Call after a correct PIN. */
  unlock: () => void;
}

/**
 * Decides whether the app is locked. It starts locked (when the lock is on)
 * and unlocks only after a correct PIN or fingerprint. With 자동 잠금 on it
 * locks again whenever the app goes to the background. While the saved data
 * has not loaded yet nothing is shown, so a locked app never flashes content.
 */
export function useAppLock(ready: boolean, settings: Record<string, unknown>): AppLockState {
  const security = readSecurity(settings);
  const [unlocked, setUnlocked] = useState(false);
  const autoLockRef = useRef(false);
  autoLockRef.current = security.autoLock;

  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'hidden' && autoLockRef.current && !autoLockSuspended()) setUnlocked(false);
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  // While the lock is off the session counts as unlocked, so switching it on does not lock the person out of the app they are using.
  useEffect(() => { if (ready && !security.appLock) setUnlocked(true); }, [ready, security.appLock]);

  const locked = ready && security.appLock && !unlocked;
  const unlock = useCallback(() => setUnlocked(true), []);

  // Fingerprint/face: ask as soon as the lock screen appears and each time the app comes back to the front.
  const biometricOn = ready && security.appLock && security.biometric && !unlocked;
  useEffect(() => {
    if (!biometricOn || !hasNativeBiometric()) return;
    let cancelled = false;
    let asking = false;
    const ask = () => {
      if (asking || document.visibilityState !== 'visible') return;
      asking = true;
      void authenticateBiometric().then(async (ok) => {
        asking = false;
        if (cancelled || !ok) return;
        await clearAttempts().catch(() => undefined);
        setUnlocked(true);
      });
    };
    ask();
    document.addEventListener('visibilitychange', ask);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', ask); };
  }, [biometricOn]);

  return { security, locked, unlock };
}
