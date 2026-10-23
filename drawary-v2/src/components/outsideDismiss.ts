import { closeOpenOverlay } from '../flow/overlayBack';

const visible = (e: Element): boolean => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/**
 * Tap anywhere outside an open pop-up menu (the "•••" lists) to close it, instead of having to press its button again. That first tap
 * only closes the menu; it does not also press whatever was under the finger. Escape closes whatever is open on top (menu, dialog,
 * sheet) for a keyboard. Installed once for the whole app; returns the function that removes it.
 */
export function installOutsideDismiss(): () => void {
  let swallowUntil = 0;
  const onDown = (e: PointerEvent) => {
    const menu = [...document.querySelectorAll('[role="menu"]')].find(visible);
    if (!menu) return;
    const opener = menu.previousElementSibling;
    const target = e.target as Node | null;
    if (!target || menu.contains(target) || (opener && opener.contains(target))) return;
    if (opener instanceof HTMLElement) {
      opener.click();
      swallowUntil = Date.now() + 600;
    }
  };
  const onClick = (e: MouseEvent) => {
    if (Date.now() >= swallowUntil) return;
    swallowUntil = 0;
    e.stopPropagation();
    e.preventDefault();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !e.defaultPrevented && closeOpenOverlay()) e.preventDefault();
  };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey);
  };
}
