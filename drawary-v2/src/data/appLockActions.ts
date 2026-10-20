import { actions, getState } from './store';
import {
  afterWrongPin, hashPin, NO_ATTEMPTS, pinMatches, readSecurity, SECURITY_KEYS, triesLeft, waitMs,
  type VerifyResult,
} from '../flow/appLock';

/** Saves a (new) PIN's hash and forgets earlier wrong tries. */
export async function savePin(pin: string): Promise<void> {
  const record = await hashPin(pin);
  await actions.setSettings({ [SECURITY_KEYS.pin]: record, [SECURITY_KEYS.attempts]: NO_ATTEMPTS });
}

/** Turning the lock off also turns off what only makes sense with it. */
export const setAppLock = (on: boolean) =>
  on
    ? actions.setSetting(SECURITY_KEYS.appLock, true)
    : actions.setSettings({ [SECURITY_KEYS.appLock]: false, [SECURITY_KEYS.autoLock]: false, [SECURITY_KEYS.biometric]: false });

export const setAutoLock = (on: boolean) => actions.setSetting(SECURITY_KEYS.autoLock, on);
export const setBiometric = (on: boolean) => actions.setSetting(SECURITY_KEYS.biometric, on);

// One try at a time, so two quick taps cannot both be counted against a stale number.
let chain: Promise<unknown> = Promise.resolve();

/**
 * Checks a typed PIN against the saved hash and keeps the wrong-try count.
 * While entry is paused even the right PIN is refused.
 */
export function verifyPin(pin: string, now = Date.now()): Promise<VerifyResult> {
  const run = chain.then(async (): Promise<VerifyResult> => {
    const sec = readSecurity(getState().settings);
    if (!sec.pin) return { ok: false, reason: 'wrong', triesLeft: 0, waitMs: 0 };
    const wait = waitMs(sec.attempts, now);
    if (wait > 0) return { ok: false, reason: 'cooldown', waitMs: wait };
    if (await pinMatches(pin, sec.pin)) {
      if (sec.attempts.fails > 0 || sec.attempts.lockedUntil > 0) await actions.setSetting(SECURITY_KEYS.attempts, NO_ATTEMPTS);
      return { ok: true };
    }
    const next = afterWrongPin(sec.attempts, now);
    await actions.setSetting(SECURITY_KEYS.attempts, next);
    return { ok: false, reason: 'wrong', triesLeft: triesLeft(next), waitMs: waitMs(next, now) };
  });
  chain = run.catch(() => undefined);
  return run;
}

/** A correct fingerprint/face also clears wrong PIN tries. */
export async function clearAttempts(): Promise<void> {
  const sec = readSecurity(getState().settings);
  if (sec.attempts.fails > 0 || sec.attempts.lockedUntil > 0) await actions.setSetting(SECURITY_KEYS.attempts, NO_ATTEMPTS);
}
