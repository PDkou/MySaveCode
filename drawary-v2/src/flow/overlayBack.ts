import { t } from '../i18n';

const visible = (e: Element): boolean => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
};

/**
 * Closes whatever is open on top of the screen for the phone's back button: a pop-up menu (the "•••" lists) or a dialog /
 * bottom sheet. Returns true when something was open (and was closed). Dialogs are closed through their own cancel / close
 * button when they have one, otherwise like a tap on the dimmed area outside the sheet (a backdrop button next to it, or the
 * wrapper itself).
 */
export function closeOpenOverlay(root: ParentNode = document): boolean {
  const dialogs = [...root.querySelectorAll('[role="dialog"]')].filter(visible);
  const dialog = dialogs[dialogs.length - 1];
  if (dialog) {
    const wanted = new Set([t('취소'), t('닫기'), t('아니요')]);
    const button = [...dialog.querySelectorAll('button')].find((b) => wanted.has((b.textContent ?? '').trim()) || wanted.has(b.getAttribute('aria-label') ?? ''));
    if (button) { (button as HTMLElement).click(); return true; }
    const backdropButton = dialog.parentElement?.querySelector('button[class*="backdrop"]');
    if (backdropButton) { (backdropButton as HTMLElement).click(); return true; }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    (dialog.parentElement as HTMLElement | null)?.click();
    return true;
  }
  const menu = [...root.querySelectorAll('[role="menu"]')].filter(visible)[0];
  const opener = menu?.previousElementSibling;
  if (opener instanceof HTMLElement) { opener.click(); return true; }
  return false;
}
