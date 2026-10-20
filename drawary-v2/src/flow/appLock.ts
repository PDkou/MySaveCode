import { t } from '../i18n';
/**
 * App lock logic with no screen in it: PIN hashing, the wrong-PIN limiter and
 * how the saved security settings are read. Everything is saved as settings
 * (`security.*`), on this device only.
 *
 * The PIN is never stored. What is stored is a salted PBKDF2-SHA256 hash, so a
 * copy of the database does not show the PIN at a glance. A 4-digit PIN has only
 * 10,000 possibilities, so the hash alone could still be guessed by someone who
 * copies the file; the real protection is the limiter below plus the phone's own
 * app sandbox. That is why wrong tries are counted and saved (a restart does not
 * reset them).
 *
 * `crypto.subtle` only exists on secure pages (https or localhost). The Android
 * shell must load the app from a secure origin (e.g. WebViewAssetLoader).
 */

export const PIN_LENGTH = 4;

export const SECURITY_KEYS = {
  pin: 'security.pin',
  appLock: 'security.appLock',
  autoLock: 'security.autoLock',
  biometric: 'security.biometric',
  attempts: 'security.attempts',
} as const;

export interface PinRecord {
  v: 1;
  /** base64 */
  salt: string;
  /** base64 */
  hash: string;
  iterations: number;
}

export interface AttemptState {
  /** Wrong tries in a row since the last correct one. */
  fails: number;
  /** Epoch ms; PIN entry is refused until then. 0 = not waiting. */
  lockedUntil: number;
}

export interface SecuritySettings {
  pin: PinRecord | null;
  appLock: boolean;
  autoLock: boolean;
  biometric: boolean;
  attempts: AttemptState;
}

export const PBKDF2_ITERATIONS = 100_000;
/** After every this-many wrong tries in a row, entry pauses. */
export const FAILS_PER_PAUSE = 5;
const BASE_PAUSE_MS = 30_000;
const MAX_PAUSE_MS = 10 * 60_000;

export const isValidPin = (pin: unknown): pin is string =>
  typeof pin === 'string' && /^\d{4}$/.test(pin);

const toB64 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error(t('이 환경에서는 PIN을 안전하게 저장할 수 없어요 (보안 연결이 필요해요).'));
  const key = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Hashes a new PIN with a fresh random salt. */
export async function hashPin(pin: string): Promise<PinRecord> {
  if (!isValidPin(pin)) throw new Error(t('PIN은 숫자 4자리여야 해요.'));
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  return { v: 1, salt: toB64(salt), hash: toB64(hash), iterations: PBKDF2_ITERATIONS };
}

/** Compares in constant time so the answer does not leak through timing. */
export async function pinMatches(pin: string, record: PinRecord): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const expected = fromB64(record.hash);
  const actual = await derive(pin, fromB64(record.salt), record.iterations);
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  return diff === 0;
}

// ------------------------------------------------------------------ limiter

export const NO_ATTEMPTS: AttemptState = { fails: 0, lockedUntil: 0 };

/** How long entry stays paused after the `fails`-th wrong try (0 if it does not pause yet). */
export function pauseAfterFails(fails: number): number {
  if (fails <= 0 || fails % FAILS_PER_PAUSE !== 0) return 0;
  const step = fails / FAILS_PER_PAUSE - 1; // 0 for the 5th, 1 for the 10th...
  return Math.min(BASE_PAUSE_MS * 2 ** step, MAX_PAUSE_MS);
}

export const waitMs = (a: AttemptState, now: number): number => Math.max(0, a.lockedUntil - now);

export function afterWrongPin(a: AttemptState, now: number): AttemptState {
  const fails = a.fails + 1;
  const pause = pauseAfterFails(fails);
  return { fails, lockedUntil: pause > 0 ? now + pause : a.lockedUntil };
}

/** Wrong tries left before the next pause. */
export const triesLeft = (a: AttemptState): number => FAILS_PER_PAUSE - (a.fails % FAILS_PER_PAUSE);

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'wrong'; triesLeft: number; waitMs: number }
  | { ok: false; reason: 'cooldown'; waitMs: number };

/** The message under the PIN dots after a failed try. */
export const cooldownMessage = (waitMs: number): string =>
  t('너무 많이 틀렸어요. {seconds}초 뒤에 다시 입력해 주세요.', { seconds: Math.ceil(waitMs / 1000) });

export function failureMessage(r: Extract<VerifyResult, { ok: false }>): string {
  if (r.waitMs > 0) return cooldownMessage(r.waitMs);
  return t('PIN이 일치하지 않아요. 다시 입력해 주세요.');
}

// ----------------------------------------------------------------- settings

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

function readPin(raw: unknown): PinRecord | null {
  const r = asObj(raw);
  if (r.v === 1 && typeof r.salt === 'string' && typeof r.hash === 'string'
    && typeof r.iterations === 'number' && Number.isInteger(r.iterations) && r.iterations > 0) {
    return { v: 1, salt: r.salt, hash: r.hash, iterations: r.iterations };
  }
  return null;
}

/**
 * Reads the saved settings. The lock only counts as on when a valid PIN is
 * there too (a broken record must never lock the user out of nothing), and
 * the two helpers only count when the lock is on.
 */
export function readSecurity(settings: Record<string, unknown>): SecuritySettings {
  const pin = readPin(settings[SECURITY_KEYS.pin]);
  const appLock = pin !== null && settings[SECURITY_KEYS.appLock] === true;
  const a = asObj(settings[SECURITY_KEYS.attempts]);
  const fails = typeof a.fails === 'number' && a.fails >= 0 ? Math.floor(a.fails) : 0;
  const lockedUntil = typeof a.lockedUntil === 'number' && a.lockedUntil > 0 ? a.lockedUntil : 0;
  return {
    pin,
    appLock,
    autoLock: appLock && settings[SECURITY_KEYS.autoLock] === true,
    biometric: appLock && settings[SECURITY_KEYS.biometric] === true,
    attempts: { fails, lockedUntil },
  };
}
