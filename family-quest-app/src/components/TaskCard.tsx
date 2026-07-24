import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { TaskRow } from '../types/database';
import { formatDateTime } from '../lib/formatDate';

interface TaskCardProps {
  task: TaskRow;
  assigneeLabel: string;
  creatorName: string | null;
}

export function TaskCard({ task, assigneeLabel, creatorName }: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isOverdue = task.status === 'open' && !!task.due_at && new Date(task.due_at) < new Date();

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
        {isOverdue && <span className="status-badge status-overdue">{t('dashboard.overdue')}</span>}
        <h3 className="task-card-title">{task.title}</h3>
      </div>
      <div className="task-card-meta">
        <span>{t('dashboard.assignedTo', { name: assigneeLabel })}</span>
        <span>{t('dashboard.createdBy', { name: creatorName ?? '' })}</span>
        <span className={isOverdue ? 'overdue-text' : undefined}>
          {task.due_at
            ? t('dashboard.dueAt', { date: formatDateTime(task.due_at, i18n.language) })
            : t('dashboard.noDueDate')}
        </span>
      </div>
    </button>
  );
}
