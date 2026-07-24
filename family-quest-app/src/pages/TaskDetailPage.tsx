import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useFamily } from '../context/FamilyContext';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { formatDateTime } from '../lib/formatDate';

export function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { members } = useFamily();
  const { task, activities, loading, notFound, completeTask, reopenTask, deleteTask } = useTaskDetail(taskId);

  const [completionNote, setCompletionNote] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const nameFor = (userId: string | null) => (userId ? nameByUserId.get(userId) ?? '' : '');

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

  const handleDelete = async () => {
    if (!window.confirm(t('taskDetail.deleteConfirm'))) return;
    setBusy(true);
    setErrorKey(null);
    try {
      await deleteTask();
      navigate('/', { replace: true });
    } catch {
      setErrorKey('taskDetail.error.unknown');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="screen task-detail-screen">
        <p className="empty-message">{t('common.loading')}</p>
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

  return (
    <div className="screen task-detail-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
        <span className={`status-badge ${task.status === 'done' ? 'status-done' : 'status-open'}`}>
          {task.status === 'done' ? t('taskDetail.statusDone') : t('taskDetail.statusOpen')}
        </span>
      </div>

      <h1 className="task-detail-title">{task.title}</h1>

      <div className="task-detail-section">
        <h2>{t('taskDetail.details')}</h2>
        <p>{task.details || t('taskDetail.noDetails')}</p>
      </div>

      <div className="task-detail-grid">
        <div>
          <span className="label">{t('taskDetail.assignedTo')}</span>
          <span>{task.assigned_to_all ? t('taskForm.everyone') : nameFor(task.assigned_to) || t('dashboard.unassigned')}</span>
        </div>
        <div>
          <span className="label">{t('taskDetail.createdBy')}</span>
          <span>{nameFor(task.created_by)}</span>
        </div>
        <div>
          <span className="label">{t('taskDetail.dueAt')}</span>
          <span>{task.due_at ? formatDateTime(task.due_at, i18n.language) : t('dashboard.noDueDate')}</span>
        </div>
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

      <button type="button" className="btn btn-danger btn-block" onClick={() => void handleDelete()} disabled={busy}>
        {t('taskDetail.deleteButton')}
      </button>
    </div>
  );
}
