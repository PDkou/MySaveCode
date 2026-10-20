import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, closeDB } from './db';
import { actions, getState, resetStoreForTests, startStore } from './store';
import { clearAttempts, savePin, setAppLock, setAutoLock, setBiometric, verifyPin } from './appLockActions';
import { readSecurity, SECURITY_KEYS } from '../flow/appLock';

beforeEach(async () => {
  resetStoreForTests();
  await closeDB();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  await startStore();
});

const sec = () => readSecurity(getState().settings);
const T = 5_000_000;

describe('app lock actions', () => {
  it('saves only a hash and lets the right PIN in', async () => {
    await savePin('2468');
    expect(JSON.stringify(getState().settings)).not.toContain('2468');
    expect(await verifyPin('2468', T)).toEqual({ ok: true });
  });

  it('counts wrong tries, pauses on the 5th, and refuses even the right PIN while paused', async () => {
    await savePin('2468');
    for (let i = 1; i <= 4; i++) {
      expect(await verifyPin('0000', T)).toMatchObject({ ok: false, reason: 'wrong', waitMs: 0 });
    }
    expect(await verifyPin('0000', T)).toMatchObject({ ok: false, reason: 'wrong', waitMs: 30_000 });
    expect(await verifyPin('2468', T + 1_000)).toEqual({ ok: false, reason: 'cooldown', waitMs: 29_000 });
    expect(await verifyPin('2468', T + 30_000)).toEqual({ ok: true });
    expect(sec().attempts).toEqual({ fails: 0, lockedUntil: 0 });
  });

  it('keeps the count across a restart (it is saved, not in memory)', async () => {
    await savePin('2468');
    for (let i = 0; i < 5; i++) await verifyPin('1111', T);
    resetStoreForTests();
    await startStore();
    expect(await verifyPin('2468', T + 5_000)).toMatchObject({ ok: false, reason: 'cooldown' });
  });

  it('counts two quick tries separately, not as one', async () => {
    await savePin('2468');
    await Promise.all([verifyPin('0001', T), verifyPin('0002', T), verifyPin('0003', T)]);
    expect(sec().attempts.fails).toBe(3);
  });

  it('a new PIN replaces the old one and clears the wrong tries', async () => {
    await savePin('2468');
    for (let i = 0; i < 5; i++) await verifyPin('1111', T);
    await savePin('1357');
    expect(sec().attempts).toEqual({ fails: 0, lockedUntil: 0 });
    expect(await verifyPin('2468', T + 100)).toMatchObject({ ok: false, reason: 'wrong' });
    expect(await verifyPin('1357', T + 100)).toEqual({ ok: true });
  });

  it('turning the lock off also turns off auto-lock and fingerprint; they come back off', async () => {
    await savePin('2468');
    await setAppLock(true); await setAutoLock(true); await setBiometric(true);
    expect(sec()).toMatchObject({ appLock: true, autoLock: true, biometric: true });
    await setAppLock(false);
    expect(getState().settings[SECURITY_KEYS.autoLock]).toBe(false);
    expect(getState().settings[SECURITY_KEYS.biometric]).toBe(false);
    await setAppLock(true);
    expect(sec()).toMatchObject({ appLock: true, autoLock: false, biometric: false });
  });

  it('a correct fingerprint clears the wrong tries', async () => {
    await savePin('2468');
    for (let i = 0; i < 5; i++) await verifyPin('1111', T);
    await clearAttempts();
    expect(await verifyPin('2468', T + 100)).toEqual({ ok: true });
  });

  it('without a saved PIN nothing verifies', async () => {
    expect(await verifyPin('0000', T)).toMatchObject({ ok: false });
  });

  it('a reset removes the PIN and the lock', async () => {
    await savePin('2468'); await setAppLock(true);
    await actions.resetAllData();
    expect(sec()).toMatchObject({ pin: null, appLock: false });
  });
});
