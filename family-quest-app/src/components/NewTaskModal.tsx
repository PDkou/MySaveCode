import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '../context/TasksContext';
import type { FamilyMember } from '../context/FamilyContext';

interface NewTaskModalProps {
  members: FamilyMember[];
  onClose: () => void;
}

export function NewTaskModal({ members, onClose }: NewTaskModalProps) {
  const { t } = useTranslation();
  const { createTask } = useTasks();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
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
        assignedTo: assignedTo === 'ALL' || assignedTo === '' ? null : assignedTo,
        assignedToAll: assignedTo === 'ALL',
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

          <label className="field">
            <span>{t('taskForm.assignedTo')}</span>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">{t('taskForm.noAssignee')}</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
              {members.length > 1 && <option value="ALL">{t('taskForm.everyone')}</option>}
            </select>
          </label>

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
