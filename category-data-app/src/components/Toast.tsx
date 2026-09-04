import { useEffect } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

// A bottom snackbar that auto-dismisses -- currently only used for the
// delete-entry undo affordance (CategoryDetail.tsx / TableScreen.tsx), but
// kept generic (plain message + optional action) rather than named after
// that one use.
export function Toast({ message, actionLabel, onAction, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    // Clearing on unmount also covers "the action was taken" -- the
    // caller's onAction sets the state that unmounts this, so there's
    // nothing further to dismiss once that happens.
    return () => clearTimeout(t);
  }, [onDismiss, durationMs]);

  return (
    <div className="toast" role="status">
      <span className="toast-message">{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="toast-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
