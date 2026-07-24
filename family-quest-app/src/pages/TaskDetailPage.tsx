import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { formatDateTime, toDateTimeLocalValue } from '../lib/formatDate';
import { AssigneeCheckboxes } from '../components/AssigneeCheckboxes';
import { RecurrenceSelect } from '../components/RecurrenceSelect';
import { Spinner } from '../components/Spinner';
import type { TaskRecurrence } from '../types/database';

export function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { members } = useFamily();
  const { requestDelete } = useTasks();
  const { task, assigneeIds, activities, loading, notFound, completeTask, reopenTask, updateTask } =
    useTaskDetail(taskId);

  const [completionNote, setCompletionNote] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>('none');

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const nameFor = (userId: string | null) => (userId ? nameByUserId.get(userId) ?? '' : '');

  const assigneeLabel = useMemo(() => {
    if (assigneeIds.length === 0) return t('dashboard.unassigned');
    if (assigneeIds.length > 1 && assigneeIds.length === members.length) return t('taskForm.everyone');
    return assigneeIds.map((id) => nameByUserId.get(id) ?? '').join(', ');
  }, [assigneeIds, members.length, nameByUserId, t]);

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDetails(task.details ?? '');
    setEditDueAt(toDateTimeLocalValue(task.due_at));
    setEditAssigneeIds(assigneeIds);
    setEditRecurrence(task.recurrence);
    setErrorKey(null);
    setEditing(true);
  };

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTitle.trim()) {
      setErrorKey('taskForm.error.titleRequired');
      return;
    }
    setErrorKey(null);
    setBusy(true);
    try {
      await updateTask({
        title: editTitle,
        details: editDetails,
        dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
        assigneeIds: editAssigneeIds,
        recurrence: editRecurrence,
      });
      setEditing(false);
    } catch {
      setErrorKey('taskForm.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!completionNote.trim()) {
      setErrorKey('taskDetail.error.completionNoteRequired');
      return;
    }
    setErrorKey(null);
    setBusy(true);
    try {
      await completeTask(completionNote);
      setCompletionNote('');
    } catch {
      setErrorKey('taskDetail.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      await reopenTask();
    } catch {
      setErrorKey('taskDetail.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!taskId) return;
    requestDelete([taskId]);
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="screen task-detail-screen">
        <Spinner label={t('common.loading')} />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="screen task-detail-screen">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
        <p className="empty-message">{t('taskDetail.error.notFound')}</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="screen task-detail-screen">
        <div className="topbar">
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="form task-detail-section">
          <h2>{t('taskDetail.editHeading')}</h2>
          <label className="field">
            <span>{t('taskForm.title')}</span>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={t('taskForm.titlePlaceholder')}
              maxLength={120}
            />
          </label>

          <label className="field">
            <span>{t('taskForm.details')}</span>
            <textarea
              value={editDetails}
              onChange={(e) => setEditDetails(e.target.value)}
              placeholder={t('taskForm.detailsPlaceholder')}
              rows={3}
              maxLength={2000}
            />
          </label>

          <div className="field">
            <span>{t('taskForm.assignedTo')}</span>
            <AssigneeCheckboxes members={members} selectedIds={editAssigneeIds} onChange={setEditAssigneeIds} />
          </div>

          <label className="field">
            <span>{t('taskForm.dueAt')}</span>
            <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
          </label>

          <label className="field">
            <span>{t('taskForm.recurrence.label')}</span>
            <RecurrenceSelect value={editRecurrence} onChange={setEditRecurrence} />
          </label>

          {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="screen task-detail-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
        <div className="topbar-actions">
          <span className={`status-badge ${task.status === 'done' ? 'status-done' : 'status-open'}`}>
            {task.status === 'done' ? t('taskDetail.statusDone') : t('taskDetail.statusOpen')}
          </span>
          <button type="button" className="btn btn-ghost" onClick={startEditing}>
            {t('taskDetail.editButton')}
          </button>
        </div>
      </div>

      <h1 className="task-detail-title">{task.title}</h1>

      <div className="task-detail-section">
        <h2>{t('taskDetail.details')}</h2>
        <p>{task.details || t('taskDetail.noDetails')}</p>
      </div>

      <div className="task-detail-grid">
        <div>
          <span className="label">{t('taskDetail.assignedTo')}</span>
          <span>{assigneeLabel}</span>
        </div>
        <div>
          <span className="label">{t('taskDetail.createdBy')}</span>
          <span>{nameFor(task.created_by)}</span>
        </div>
        <div>
          <span className="label">{t('taskDetail.dueAt')}</span>
          <span>{task.due_at ? formatDateTime(task.due_at, i18n.language) : t('dashboard.noDueDate')}</span>
        </div>
        {task.recurrence !== 'none' && (
          <div>
            <span className="label">{t('taskForm.recurrence.label')}</span>
            <span>{t(`taskForm.recurrence.${task.recurrence}`)}</span>
          </div>
        )}
        <div>
          <span className="label">{t('taskDetail.createdAt')}</span>
          <span>{formatDateTime(task.created_at, i18n.language)}</span>
        </div>
        {task.status === 'done' && (
          <div>
            <span className="label">{t('taskDetail.completedAt')}</span>
            <span>{formatDateTime(task.completed_at, i18n.language)}</span>
          </div>
        )}
      </div>

      {task.status === 'done' && task.completion_note && (
        <div className="task-detail-section">
          <h2>{t('taskDetail.completionNote')}</h2>
          <p>{task.completion_note}</p>
        </div>
      )}

      {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

      {task.status === 'open' ? (
        <form className="form task-detail-section" onSubmit={handleComplete}>
          <h2>{t('taskDetail.completionNote')}</h2>
          <textarea
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            placeholder={t('taskDetail.completionNotePlaceholder')}
            rows={3}
            maxLength={2000}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('taskDetail.completing') : t('taskDetail.completeButton')}
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => void handleReopen()} disabled={busy}>
          {busy ? t('taskDetail.reopening') : t('taskDetail.reopenButton')}
        </button>
      )}

      <div className="task-detail-section">
        <h2>{t('taskDetail.activityLog')}</h2>
        {activities.length === 0 ? (
          <p className="empty-message">{t('taskDetail.noActivity')}</p>
        ) : (
          <ul className="activity-list">
            {activities.map((activity) => (
              <li key={activity.id}>
                <span className="activity-time">{formatDateTime(activity.created_at, i18n.language)}</span>
                <span>{t(`taskDetail.activity.${activity.action}`, { name: nameFor(activity.actor_id) })}</span>
                {activity.note && <p className="activity-note">{activity.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
        {t('taskDetail.deleteButton')}
      </button>
    </div>
  );
}
