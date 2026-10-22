import { useSyncExternalStore } from 'react';
import type { PremiumReason } from './premium';

/**
 * Two small pieces of state shared between the app and the "결제할까요?" dialog:
 *  - `prompt`: which Free limit the dialog is asking about (null = closed);
 *  - `reason`: what the Premium screen shows at its top once the person goes there.
 */
interface PremiumUi { prompt: PremiumReason | null; reason: PremiumReason | null }

let state: PremiumUi = { prompt: null, reason: null };
const listeners = new Set<() => void>();
const set = (next: Partial<PremiumUi>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };

/** Opens the dialog for a limit the person just ran into. */
export const askPremium = (reason: PremiumReason): void => set({ prompt: reason });
export const closePremiumPrompt = (): void => set({ prompt: null });
/** The dialog's "알아보기": remember why, close the dialog (the caller then opens the Premium screen). */
export const takePremiumPrompt = (): PremiumReason | null => { const r = state.prompt; set({ prompt: null, reason: r }); return r; };
export const setPremiumScreenReason = (reason: PremiumReason | null): void => set({ reason });

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const usePremiumUi = (): PremiumUi => useSyncExternalStore(subscribe, () => state, () => state);
