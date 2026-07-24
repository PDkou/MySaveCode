import { useTranslation } from 'react-i18next';

import { useTasks } from '../context/TasksContext';

export function UndoSnackbar() {
  const { t } = useTranslation();
  const { pendingDeleteCount, undoPendingDelete } = useTasks();

  if (pendingDeleteCount === 0) return null;

  return (
    <div className="undo-snackbar">
      <span>{t('common.deletedToast', { count: pendingDeleteCount })}</span>
      <button type="button" className="undo-snackbar-button" onClick={undoPendingDelete}>
        {t('common.undo')}
      </button>
    </div>
  );
}
