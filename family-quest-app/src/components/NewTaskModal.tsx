import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '../context/TasksContext';
import type { FamilyMember } from '../context/FamilyContext';
import type { TaskRecurrence } from '../types/database';
import { AssigneeCheckboxes } from './AssigneeCheckboxes';
import { RecurrenceSelect } from './RecurrenceSelect';
import { DueDateTimeFields } from './DueDateTimeFields';

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
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
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
        recurrence,
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

          <div className="field">
            <span>{t('taskForm.dueAt')}</span>
            <DueDateTimeFields value={dueAt} onChange={setDueAt} />
          </div>

          <label className="field">
            <span>{t('taskForm.recurrence.label')}</span>
            <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
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
