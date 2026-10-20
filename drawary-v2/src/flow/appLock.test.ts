import { describe, expect, it } from 'vitest';
import {
  afterWrongPin, FAILS_PER_PAUSE, hashPin, isValidPin, NO_ATTEMPTS, pauseAfterFails, pinMatches,
  readSecurity, SECURITY_KEYS, triesLeft, waitMs, failureMessage, type AttemptState,
} from './appLock';

describe('PIN hashing', () => {
  it('accepts exactly four digits', () => {
    expect(['0000', '1234', '9999'].every(isValidPin)).toBe(true);
    expect(['', '123', '12345', 'abcd', '12 4', 1234, null].some(isValidPin)).toBe(false);
  });

  it('never keeps the PIN, verifies the right one and refuses a wrong one', async () => {
    const rec = await hashPin('2468');
    expect(JSON.stringify(rec)).not.toContain('2468');
    expect(rec).toMatchObject({ v: 1, iterations: 100_000 });
    expect(await pinMatches('2468', rec)).toBe(true);
    expect(await pinMatches('2469', rec)).toBe(false);
    expect(await pinMatches('', rec)).toBe(false);
    expect(await pinMatches('24680', rec)).toBe(false);
  });

  it('uses a fresh salt each time, so the same PIN gives different records', async () => {
    const [a, b] = await Promise.all([hashPin('1111'), hashPin('1111')]);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(await pinMatches('1111', a)).toBe(true);
    expect(await pinMatches('1111', b)).toBe(true);
  });

  it('rejects a malformed PIN when hashing', async () => {
    await expect(hashPin('12')).rejects.toThrow();
  });
});

describe('wrong-PIN limiter', () => {
  const NOW = 1_000_000;
  const fail = (a: AttemptState, n: number, now = NOW) => { for (let i = 0; i < n; i++) a = afterWrongPin(a, now); return a; };

  it('lets the first four tries through without a pause', () => {
    const a = fail(NO_ATTEMPTS, 4);
    expect(a).toEqual({ fails: 4, lockedUntil: 0 });
    expect(triesLeft(a)).toBe(1);
    expect(waitMs(a, NOW)).toBe(0);
  });

  it('pauses 30s on the 5th wrong try, then doubles every 5, up to 10 minutes', () => {
    expect(pauseAfterFails(5)).toBe(30_000);
    expect(pauseAfterFails(10)).toBe(60_000);
    expect(pauseAfterFails(15)).toBe(120_000);
    expect(pauseAfterFails(100)).toBe(600_000);
    expect(pauseAfterFails(6)).toBe(0);
    expect(pauseAfterFails(0)).toBe(0);
    const a = fail(NO_ATTEMPTS, FAILS_PER_PAUSE);
    expect(a.lockedUntil).toBe(NOW + 30_000);
    expect(waitMs(a, NOW + 10_000)).toBe(20_000);
    expect(waitMs(a, NOW + 30_000)).toBe(0);
  });

  it('says how long to wait in the message', () => {
    expect(failureMessage({ ok: false, reason: 'cooldown', waitMs: 20_001 })).toContain('21초');
    expect(failureMessage({ ok: false, reason: 'wrong', triesLeft: 3, waitMs: 0 })).toContain('일치하지');
  });
});

describe('reading the saved security settings', () => {
  it('is all off by default', () => {
    expect(readSecurity({})).toEqual({ pin: null, appLock: false, autoLock: false, biometric: false, attempts: NO_ATTEMPTS });
  });

  it('only counts the lock as on when a valid PIN record exists', async () => {
    const pin = await hashPin('1357');
    const on = readSecurity({ [SECURITY_KEYS.pin]: pin, [SECURITY_KEYS.appLock]: true, [SECURITY_KEYS.autoLock]: true, [SECURITY_KEYS.biometric]: true });
    expect(on).toMatchObject({ appLock: true, autoLock: true, biometric: true });
    expect(readSecurity({ [SECURITY_KEYS.appLock]: true, [SECURITY_KEYS.autoLock]: true }).appLock).toBe(false);
    expect(readSecurity({ [SECURITY_KEYS.pin]: { v: 1, salt: 1 }, [SECURITY_KEYS.appLock]: true }).appLock).toBe(false);
    expect(readSecurity({ [SECURITY_KEYS.pin]: 'junk', [SECURITY_KEYS.appLock]: true }).pin).toBeNull();
  });

  it('ignores auto-lock and fingerprint while the lock is off', async () => {
    const pin = await hashPin('1357');
    const s = readSecurity({ [SECURITY_KEYS.pin]: pin, [SECURITY_KEYS.appLock]: false, [SECURITY_KEYS.autoLock]: true, [SECURITY_KEYS.biometric]: true });
    expect(s).toMatchObject({ appLock: false, autoLock: false, biometric: false });
  });

  it('survives junk in the saved wrong-try count', () => {
    expect(readSecurity({ [SECURITY_KEYS.attempts]: { fails: -3, lockedUntil: 'x' } }).attempts).toEqual(NO_ATTEMPTS);
    expect(readSecurity({ [SECURITY_KEYS.attempts]: 7 }).attempts).toEqual(NO_ATTEMPTS);
    expect(readSecurity({ [SECURITY_KEYS.attempts]: { fails: 6.9, lockedUntil: 5 } }).attempts).toEqual({ fails: 6, lockedUntil: 5 });
  });
});
