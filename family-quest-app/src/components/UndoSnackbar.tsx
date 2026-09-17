import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '../context/TasksContext';

const ERROR_TOAST_MS = 4000;

export function UndoSnackbar() {
  const { t } = useTranslation();
  const { pendingDeleteCount, undoPendingDelete, deleteFailed, dismissDeleteFailed } = useTasks();

  useEffect(() => {
    if (!deleteFailed) return;
    const timer = window.setTimeout(dismissDeleteFailed, ERROR_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [deleteFailed, dismissDeleteFailed]);

  if (pendingDeleteCount > 0) {
    return (
      <div className="undo-snackbar">
        <span>{t('common.deletedToast', { count: pendingDeleteCount })}</span>
        <button type="button" className="undo-snackbar-button" onClick={undoPendingDelete}>
          {t('common.undo')}
        </button>
      </div>
    );
  }

  // The delete request's undo window already closed (pendingDeleteCount is
  // back to 0) by the time the actual DB call can fail, so this is a
  // separate, later toast rather than a variant of the one above.
  if (deleteFailed) {
    return (
      <div className="undo-snackbar undo-snackbar-error">
        <span>{t('common.deleteFailedToast')}</span>
      </div>
    );
  }

  return null;
}
