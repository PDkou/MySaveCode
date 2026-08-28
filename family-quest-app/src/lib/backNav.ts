import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Plain `navigate(-1)` silently does nothing if there's no earlier in-app
// history entry to go back to -- which is exactly what happens after
// ResumeLastRoute (lastRoute.ts) lands a fresh app boot directly on a
// sub-page via `navigate(path, { replace: true })`. That replace leaves a
// single history entry pointing at the sub-page with nothing before it, so
// on iOS -- where backgrounded PWAs get killed and relaunched into a fresh
// WebView more readily than they do on desktop -- the in-app "뒤로" button
// on that page just stops responding after any relaunch. (Reported twice:
// once before ResumeLastRoute existed, and again after -- same underlying
// "no history to go back to" cause, just a different trigger each time.)
//
// React Router's history package stamps `{ idx, ... }` onto
// `window.history.state` for every entry it manages, starting at 0. `idx >
// 0` means there's at least one earlier in-app entry `navigate(-1)` can
// actually land on; otherwise fall back to a known-safe route instead of a
// dead button.
export function useSmartBack(fallbackPath: string) {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  };
}

// Every modal/overlay in this app (SettingsModal, NewTaskModal, the
// onboarding/tutorial overlays, ...) is a plain conditional render --
// `{open && <Thing onClose={...} />}` -- not a route, so opening one never
// touches browser/OS history. The Android hardware back button (and any
// other "back" gesture the OS provides) only ever sees the *route* history
// underneath, completely blind to whatever overlay happens to be sitting
// on top: if there's an earlier route entry, back pops the route instead
// of just closing the overlay (leaving a half-navigated mess); if the
// overlay is open on the very first entry, back has nothing left to pop
// and the OS falls through to closing/backgrounding the installed PWA
// entirely. That's the "sometimes it exits, sometimes it goes back"
// behavior -- it was never actually inconsistent, it always did "pop the
// route history," it just happened to look like a normal in-app back
// press whenever there was an earlier route underneath to land on.
//
// Fix: give every open overlay its own history entry the instant it
// mounts, and close *only that overlay* on popstate instead of letting the
// pop fall through to the route underneath. If the overlay closes some
// other way (its own close/cancel button, a selection, ...) rather than
// via the hardware button, consume the entry we pushed ourselves so the
// back-stack doesn't grow one dead entry per overlay ever opened.
//
// Overlays nest in this app (Settings -> edit name / members -> confirm
// dialog). A first attempt had *each* overlay register its own popstate
// listener and compare tokens -- wrong: popping a child's entry fires the
// same window-level popstate event, and every ancestor's listener sees it
// too, so every ancestor thought its own entry had just been popped
// instead of only the actual topmost one (caught by driving real
// browser-back navigation through a stacked A -> B -> C test, not just
// reasoning about it). Correct model: a single shared stack of open
// overlays in push order, and exactly one global listener that pops *only
// the top* of that stack on every popstate -- so a hardware back press
// always closes the most recently opened overlay, however many are
// stacked underneath it.
let backDismissTokenCounter = 0;
interface BackDismissEntry {
  token: number;
  onClose: () => void;
}
const backDismissStack: BackDismissEntry[] = [];
let popstateListenerAttached = false;
// Consuming a dead entry (closed via its own button, not the hardware
// button) means calling history.back() ourselves -- which fires a real
// popstate indistinguishable from a genuine hardware-back press. Without
// this, that self-triggered popstate would pop the *next* stack entry
// (whatever overlay is left underneath) and wrongly close it too (caught
// the same way as the stacking bug: driving real back-navigation through a
// self-close case, not just reasoning about it). Each entry we
// self-consume marks one upcoming popstate as "ours" for the listener to
// swallow instead of acting on.
let suppressNextPopCount = 0;

function ensureBackDismissListener() {
  if (popstateListenerAttached) return;
  popstateListenerAttached = true;
  window.addEventListener('popstate', () => {
    if (suppressNextPopCount > 0) {
      suppressNextPopCount -= 1;
      return;
    }
    const top = backDismissStack.pop();
    top?.onClose();
  });
}

export function useBackDismiss(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    ensureBackDismissListener();

    const entry: BackDismissEntry = {
      token: ++backDismissTokenCounter,
      onClose: () => onCloseRef.current(),
    };
    window.history.pushState({ backDismiss: entry.token }, '');
    backDismissStack.push(entry);

    return () => {
      const idx = backDismissStack.indexOf(entry);
      if (idx === -1) {
        // Already popped off by a real back-button press -- nothing left
        // to consume.
        return;
      }
      backDismissStack.splice(idx, 1);
      // Closed some other way -- normally its own close button, in which
      // case we're still sitting on the entry we pushed and should consume
      // it with a self-triggered back so the stack doesn't grow one dead
      // step per overlay ever opened. But a menu action inside the overlay
      // can *navigate to a real route* instead of just closing (e.g.
      // SettingsModal's "개인정보처리방침" row calls onClose() then
      // navigate('/privacy')) -- that navigate() pushes its own new entry
      // on top of ours before this cleanup runs (React defers the unmount,
      // so the synchronous navigate() call always lands first). Blindly
      // calling history.back() here would then pop *that* new entry
      // instead of ours, silently undoing the navigation the instant it
      // happened (reported as "the privacy policy link does nothing" --
      // reproduced: URL flips to /privacy then immediately back). Only
      // self-consume when our entry is still actually the current one.
      if ((window.history.state as { backDismiss?: number } | null)?.backDismiss === entry.token) {
        suppressNextPopCount += 1;
        window.history.back();
      }
    };
  }, [isOpen]);
}
