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

// Settings menu rows that navigate to a real route (help/privacy/terms)
// intentionally leave that route's own history entry in place instead of
// consuming it (see useBackDismiss's cleanup below) -- so pressing back
// does correctly land the browser back on the page that had Settings open.
// But AuthPage/DashboardPage/FamilySetupPage (whichever one it was) always
// fully unmounts across a real route change and remounts fresh on the way
// back, which throws away its showSettings React state -- there is no
// history-based mechanism that can resurrect already-discarded state, so
// without this the user lands back on the bare page instead of Settings
// reopened (reported: "뒤로가기 누르면 전에 모달이 아니라 초기 화면이 표시됨").
// sessionStorage is the one thing that survives that unmount/remount to
// carry the "reopen" intent across it.
const REOPEN_SETTINGS_KEY = 'familyquest.reopenSettingsOnReturn';

// Called right before navigating away from an open Settings modal to
// /help, /privacy, or /terms.
export function markSettingsShouldReopen() {
  try {
    window.sessionStorage.setItem(REOPEN_SETTINGS_KEY, '1');
  } catch {
    // Unavailable (private browsing, storage quota) -- worst case, back
    // navigation just doesn't reopen Settings, same as before this fix.
  }
}

// Read once by each page's own showSettings useState initializer. Consumes
// the flag immediately so it only ever fires for the one remount right
// after navigating away from Settings, not on every future mount of that
// page for the rest of the session.
export function consumeSettingsReopenFlag(): boolean {
  try {
    const shouldReopen = window.sessionStorage.getItem(REOPEN_SETTINGS_KEY) === '1';
    if (shouldReopen) window.sessionStorage.removeItem(REOPEN_SETTINGS_KEY);
    return shouldReopen;
  } catch {
    return false;
  }
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
//
// installBackDismissListener() (below) MUST attach before React Router's
// own popstate listener does, i.e. before <BrowserRouter> ever mounts --
// see main.tsx's call to it. React Router's `useSyncExternalStore`-based
// history subscription forces a *synchronous* re-render+effect-flush in
// reaction to a popstate (to avoid tearing), all inside that same event's
// dispatch. Landing back on a route that reopens Settings (see
// consumeSettingsReopenFlag above) remounts SettingsModal, whose own
// useBackDismiss effect pushes a brand-new entry for the reopened
// modal -- synchronously, still within that one popstate's dispatch. If
// our own listener were registered *after* React Router's (which it is
// when only attached lazily on first overlay-open, since React Router's
// listener always exists first, from app boot), our listener runs second
// and sees that brand-new entry sitting on top of the stack -- and pops
// it, instantly closing the overlay that had just correctly reopened
// (reported: "뒤로가기 누르면 전에 모달이 아니라 초기 화면이 표시됨" --
// reproduced with instrumented logging: a single popstate event, with
// AuthPage's full remount-and-reopen happening *before* our listener's
// turn). Attaching first means our listener always acts on the stack as
// it stood before this event's own route-driven side effects ran.
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

// Exported so main.tsx can call this *before* `createRoot(...).render(<App
// />)` -- see the long comment on the call site for why that ordering is
// load-bearing, not just early-is-safer tidiness. useBackDismiss below also
// calls this (idempotent) so any test/harness that renders a component tree
// without going through main.tsx still gets a working listener.
export function installBackDismissListener() {
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
    installBackDismissListener();

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
