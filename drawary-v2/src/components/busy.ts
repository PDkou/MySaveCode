export interface BusyCopy { title: string; heading: string; lines: string[]; status: string }
type Listener = (copy: BusyCopy | null) => void;
let listener: Listener | null = null;

/** Covers the screen with a waiting screen ("PDF를 만들고 있어요") until hideBusy(). Needs <BusyHost /> to be mounted. */
export function showBusy(copy: BusyCopy): void { listener?.(copy); }
export function hideBusy(): void { listener?.(null); }
export function onBusy(fn: Listener | null): void { listener = fn; }

/** Lets the browser paint what was just shown before a long piece of work blocks the page. */
export const nextPaint = (): Promise<void> => new Promise((resolve) => { requestAnimationFrame(() => setTimeout(resolve, 30)); });
