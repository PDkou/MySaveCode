// App-lock PIN storage -- deliberately its own localStorage key, entirely
// outside AppData (types.ts) and therefore outside the JSON backup/CSV
// export paths too: restoring someone else's backup (or your own, on a
// new device) must never carry a PIN along with it, and exporting a
// backup must never leak the PIN hash either.
const LOCK_STORAGE_KEY = 'category-data-app:lock:v1';

interface LockConfig {
  hash: string;
}

function readLockConfig(): LockConfig | null {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.hash !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isLockEnabled(): boolean {
  return readLockConfig() !== null;
}

// SHA-256, no salt -- this is a casual "keep it from a glance" lock for
// a client-only app with no server and no account system, not a
// cryptographic secret worth defending against an attacker who already
// has the device's storage. crypto.subtle requires a secure context
// (https, or localhost during dev), which every real deployment target
// here already is (the installed PWA, the Android WebView's own
// https://appassets.androidplatform.net/ virtual origin).
async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ hash }));
}

export function removeLock(): void {
  localStorage.removeItem(LOCK_STORAGE_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = readLockConfig();
  if (!config) return true;
  const hash = await hashPin(pin);
  return hash === config.hash;
}
