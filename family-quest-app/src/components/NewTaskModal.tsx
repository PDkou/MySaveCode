import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '../context/TasksContext';
import type { FamilyMember } from '../context/FamilyContext';
import { AssigneeCheckboxes } from './AssigneeCheckboxes';

interface NewTaskModalProps {
  members: FamilyMember[];
  onClose: () => void;
}

export function NewTaskModal({ members, onClose }: NewTaskModalProps) {
  const { t } = useTranslation();
  const { createTask } = useTasks();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setErrorKey('taskForm.error.titleRequired');
      return;
    }
    setErrorKey(null);
    setSubmitting(true);
    try {
      await createTask({
        title,
        details,
        assigneeIds,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      onClose();
    } catch {
      setErrorKey('taskForm.error.unknown');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('taskForm.heading')}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>{t('taskForm.title')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('taskForm.titlePlaceholder')}
              maxLength={120}
              autoFocus
            />
          </label>

          <label className="field">
            <span>{t('taskForm.details')}</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t('taskForm.detailsPlaceholder')}
              rows={3}
              maxLength={2000}
            />
          </label>

          <div className="field">
            <span>{t('taskForm.assignedTo')}</span>
            <AssigneeCheckboxes members={members} selectedIds={assigneeIds} onChange={setAssigneeIds} />
          </div>

          <label className="field">
            <span>{t('taskForm.dueAt')}</span>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>

          {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('taskForm.submitting') : t('taskForm.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
