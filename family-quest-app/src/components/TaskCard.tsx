import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { TaskRow } from '../types/database';
import { formatDueDateTime } from '../lib/formatDate';
import { displayStatusForTask } from '../lib/taskStatus';
import { AvatarChip } from './AvatarChip';

interface TaskCardProps {
  task: TaskRow;
  assigneeLabel: string;
  assigneePhotoUrl?: string;
  creatorName: string | null;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  onTogglePin?: (taskId: string, pinned: boolean) => void;
}

export function TaskCard({
  task,
  assigneeLabel,
  assigneePhotoUrl,
  creatorName,
  selectable = false,
  selected = false,
  onToggleSelect,
  onTogglePin,
}: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isOverdue = task.status === 'open' && !!task.due_at && new Date(task.due_at) < new Date();
  const displayStatus = displayStatusForTask(task);
  const unassignedText = t('dashboard.unassigned');
  const everyoneText = t('taskForm.everyone');
  const showAssigneeAvatar = assigneeLabel && assigneeLabel !== unassignedText && assigneeLabel !== everyoneText;

  return (
    <div className={`task-card-wrap ${task.pinned ? 'task-card-pinned' : ''}`}>
      <button
        type="button"
        className={`task-card ${task.status === 'done' ? 'task-card-done' : ''} ${selected ? 'task-card-selected' : ''}`}
        onClick={() => (selectable ? onToggleSelect?.(task.id) : navigate(`/task/${task.id}`))}
      >
        <div className="task-card-top">
          {selectable && (
            <input
              type="checkbox"
              className="task-card-checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(task.id)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <span className={`status-badge status-${displayStatus}`}>
            {displayStatus === 'done'
              ? t('taskDetail.statusDone')
              : displayStatus === 'pending_confirmation'
                ? t('taskDetail.statusPendingConfirmation')
                : displayStatus === 'failed'
                  ? t('taskDetail.statusFailed')
                  : displayStatus === 'scheduled'
                    ? t('taskDetail.statusScheduled')
                    : t('taskDetail.statusOpen')}
          </span>
          {isOverdue && <span className="status-badge status-overdue">{t('dashboard.overdue')}</span>}
          {task.recurrence !== 'none' && (
            <span className="status-badge status-recurring">{t(`taskForm.recurrence.${task.recurrence}`)}</span>
          )}
          <h3 className="task-card-title">{task.title}</h3>
        </div>
        <div className="task-card-meta">
          <span className="task-card-assignee">
            {showAssigneeAvatar && <AvatarChip name={assigneeLabel} size={18} photoUrl={assigneePhotoUrl} />}
            {t('dashboard.assignedTo', { name: assigneeLabel })}
          </span>
          <span>{t('dashboard.createdBy', { name: creatorName ?? '' })}</span>
          {task.starts_at && (
            <span>{t('dashboard.startsAt', { date: formatDueDateTime(task.starts_at, i18n.language, t('taskForm.allDay')) })}</span>
          )}
          <span className={isOverdue ? 'overdue-text' : undefined}>
            {task.due_at
              ? t('dashboard.dueAt', { date: formatDueDateTime(task.due_at, i18n.language, t('taskForm.allDay')) })
              : t('dashboard.noDueDate')}
          </span>
        </div>
      </button>
      {onTogglePin && (
        <button
          type="button"
          className={`task-card-pin-toggle ${task.pinned ? 'task-card-pin-toggle-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(task.id, !task.pinned);
          }}
          aria-label={t(task.pinned ? 'dashboard.unpin' : 'dashboard.pin')}
        >
          📌
        </button>
      )}
    </div>
  );
}
