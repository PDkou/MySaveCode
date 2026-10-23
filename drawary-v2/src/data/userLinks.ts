/**
 * Links in a record's link field: what the person typed (with or without "https://") turned into an address that is safe to open,
 * or null when it is not a web address. Only http and https pages are ever opened (never javascript:, intent:, file: ...).
 */
export function normalizeWebLink(raw: string): string | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  if (/^https?:\/\//i.test(text)) {
    try { return new URL(text).href; } catch { return null; }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/]+:\d+(\/|$)/.test(text)) return null; // another scheme
  if (!/^[^\s/@]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(text)) return null;
  try { return new URL(`https://${text}`).href; } catch { return null; }
}

/** Opens the link in the phone's browser (the Android shell) or a new tab. Returns false when it is not a web address. */
export function openWebLink(raw: string): boolean {
  const url = normalizeWebLink(raw);
  if (!url) return false;
  try {
    if (typeof window.DrawaryNative?.openWebLink === 'function') window.DrawaryNative.openWebLink(url);
    else window.open(url, '_blank', 'noopener');
  } catch (e) { console.error('could not open the link', e); return false; }
  return true;
}
