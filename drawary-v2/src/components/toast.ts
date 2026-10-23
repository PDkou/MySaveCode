type Listener = (text: string) => void;
let listener: Listener | null = null;

/** A short note at the bottom of the screen ("저장했어요") that goes away by itself. Needs <ToastHost /> to be mounted. */
export function showToast(text: string): void {
  listener?.(text);
}

export function onToast(fn: Listener | null): void {
  listener = fn;
}
