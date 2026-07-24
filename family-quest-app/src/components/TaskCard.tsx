import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { TaskRow } from '../types/database';
import { formatDateTime } from '../lib/formatDate';

interface TaskCardProps {
  task: TaskRow;
  assigneeName: string | null;
  creatorName: string | null;
}

export function TaskCard({ task, assigneeName, creatorName }: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const assignedLabel = task.assigned_to_all ? t('taskForm.everyone') : assigneeName ?? t('dashboard.unassigned');

  return (
    <button
      type="button"
      className={`task-card ${task.status === 'done' ? 'task-card-done' : ''}`}
      onClick={() => navigate(`/task/${task.id}`)}
    >
      <div className="task-card-top">
        <span className={`status-badge ${task.status === 'done' ? 'status-done' : 'status-open'}`}>
          {task.status === 'done' ? t('taskDetail.statusDone') : t('taskDetail.statusOpen')}
        </span>
        <h3 className="task-card-title">{task.title}</h3>
      </div>
      <div className="task-card-meta">
        <span>{t('dashboard.assignedTo', { name: assignedLabel })}</span>
        <span>{t('dashboard.createdBy', { name: creatorName ?? '' })}</span>
        <span>
          {task.due_at
            ? t('dashboard.dueAt', { date: formatDateTime(task.due_at, i18n.language) })
            : t('dashboard.noDueDate')}
        </span>
      </div>
    </button>
  );
}
