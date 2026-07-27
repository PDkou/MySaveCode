const STORAGE_KEY = 'fq_last_path';

// Routes that shouldn't be "resumed into" on a fresh boot -- they only make
// sense as a direct, one-time entry point (an email link, an auth redirect),
// never as a place to silently land back in later.
const EXCLUDED_PREFIXES = ['/reset-password'];

export function saveLastPath(pathname: string): void {
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
  try {
    localStorage.setItem(STORAGE_KEY, pathname);
  } catch {
    // Storage can be unavailable (private browsing, quota) -- resuming to
    // the right page is a nicety, not something worth surfacing an error for.
  }
}

export function getLastPath(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
