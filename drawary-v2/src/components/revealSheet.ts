/**
 * `ref` for a bottom sheet's backdrop. Inside a short tablet window the phone-sized screen scrolls behind the sheet, so the sheet
 * (at the bottom of that screen) would open out of view: scroll it into view. On a phone the screen already fits, so nothing moves.
 */
export const revealSheet = (el: HTMLElement | null): void => {
  el?.scrollIntoView({ block: 'end' });
};
