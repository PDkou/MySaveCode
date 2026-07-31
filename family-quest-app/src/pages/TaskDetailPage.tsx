import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { formatDateTime, formatDueDateTime, toDateTimeLocalValue } from '../lib/formatDate';
import { AssigneeCheckboxes } from '../components/AssigneeCheckboxes';
import { AssigneeLotteryButton } from '../components/AssigneeLotteryButton';
import { RecurrenceSelect } from '../components/RecurrenceSelect';
import { WeekdayCheckboxes } from '../components/WeekdayCheckboxes';
import { DueDateTimeFields } from '../components/DueDateTimeFields';
import { AvatarChip } from '../components/AvatarChip';
import { Spinner } from '../components/Spinner';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { ConfirmModal } from '../components/ConfirmModal';
import { getTaskPhotoUrl, TaskPhotoError, uploadTaskPhoto } from '../lib/taskPhotos';
import { displayStatusForTask } from '../lib/taskStatus';
import type { CompletionResult } from '../lib/gamification';
import type { TaskRecurrence } from '../types/database';

export function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const { family, members, avatarUrlByUserId } = useFamily();
  const { requestDelete } = useTasks();
  const {
    task,
    assigneeIds,
    activities,
    comments,
    loading,
    notFound,
    reportTaskCompletion,
    confirmTaskCompletion,
    rejectTaskCompletion,
    reopenTask,
    updateTask,
    addComment,
    deleteComment,
  } = useTaskDetail(taskId);

  const [completionNote, setCompletionNote] = useState('');
  const [completionPhotoFile, setCompletionPhotoFile] = useState<File | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [celebration, setCelebration] = useState<CompletionResult | null>(null);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  const QUICK_EMOJIS = ['👍', '❤️', '🎉', '😊', '🙏', '💪'];

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editHighlightedId, setEditHighlightedId] = useState<string | null>(null);
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>('none');
  const [editRecurrenceWeekdays, setEditRecurrenceWeekdays] = useState<number[]>([]);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const nameFor = (userId: string | null) => (userId ? nameByUserId.get(userId) ?? '' : '');

  useEffect(() => {
    if (!task?.completion_photo_path) {
      setPhotoUrl(null);
      return;
    }
    let cancelled = false;
    void getTaskPhotoUrl(task.completion_photo_path).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [task?.completion_photo_path]);

  // Assignee-picking doesn't mean anything in a 1-member personal room --
  // there's no one else who could ever fulfill a request -- so the field is
  // hidden there, matching NewTaskModal.
  const hasOtherMembers = members.length > 1;

  const assigneeLabel = useMemo(() => {
    if (assigneeIds.length === 0) return t('dashboard.unassigned');
    if (assigneeIds.length > 1 && assigneeIds.length === members.length) return t('taskForm.everyone');
    return assigneeIds.map((id) => nameByUserId.get(id) ?? '').join(', ');
  }, [assigneeIds, members.length, nameByUserId, t]);

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDetails(task.details ?? '');
    setEditStartsAt(toDateTimeLocalValue(task.starts_at));
    setEditDueAt(toDateTimeLocalValue(task.due_at));
    setEditAssigneeIds(assigneeIds);
    setEditRecurrence(task.recurrence);
    setEditRecurrenceWeekdays(task.recurrence_weekdays ?? []);
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
        startsAt: editStartsAt ? new Date(editStartsAt).toISOString() : null,
        recurrenceWeekdays: editRecurrence === 'weekly' && editRecurrenceWeekdays.length > 0 ? editRecurrenceWeekdays : null,
      });
      setEditing(false);
    } catch {
      setErrorKey('taskForm.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCompletionPhotoFile(event.target.files?.[0] ?? null);
  };

  const handleReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!completionNote.trim()) {
      setErrorKey('taskDetail.error.completionNoteRequired');
      return;
    }
    setErrorKey(null);
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (completionPhotoFile && task && family) {
        try {
          photoPath = await uploadTaskPhoto(family.id, task.id, completionPhotoFile);
        } catch (err) {
          setErrorKey(err instanceof TaskPhotoError ? err.translationKey : 'taskDetail.error.photoUploadFailed');
          setBusy(false);
          return;
        }
      }
      const result = await reportTaskCompletion(completionNote, photoPath);
      setCompletionNote('');
      setCompletionPhotoFile(null);
      // A result means it paid out immediately (self-claim / personal room)
      // -- show the celebration. No result means it's sitting in
      // 'pending_confirmation' now -- the "확인 대기중" banner below (driven
      // straight off task.status) covers that, no separate toast needed.
      if (result) setCelebration(result);
    } catch {
      setErrorKey('taskDetail.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      await confirmTaskCompletion();
    } catch {
      setErrorKey('taskDetail.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      await rejectTaskCompletion();
    } catch {
      setErrorKey('taskDetail.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setShowReopenConfirm(false);
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

  const handleAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentBody.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      await addComment(commentBody);
      setCommentBody('');
    } catch {
      // Best-effort -- keep the draft in the input so nothing is lost.
    } finally {
      setCommentBusy(false);
    }
  };

  const handleQuickEmoji = async (emoji: string) => {
    if (commentBusy) return;
    setCommentBusy(true);
    try {
      await addComment(emoji);
    } catch {
      // ignore -- a failed reaction isn't worth surfacing an error for
    } finally {
      setCommentBusy(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch {
      // ignore
    }
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

          {hasOtherMembers && (
            <div className="field">
              <div className="field-label-row">
                <span>{t('taskForm.assignedTo')}</span>
                <AssigneeLotteryButton
                  members={members}
                  onHighlightChange={setEditHighlightedId}
                  onPick={(userId) => setEditAssigneeIds([userId])}
                />
              </div>
              <AssigneeCheckboxes
                members={members}
                selectedIds={editAssigneeIds}
                onChange={setEditAssigneeIds}
                highlightedId={editHighlightedId}
              />
            </div>
          )}

          <div className="field">
            <span>{t('taskForm.startsAt')}</span>
            <DueDateTimeFields value={editStartsAt} onChange={setEditStartsAt} />
          </div>

          <div className="field">
            <span>{t('taskForm.dueAt')}</span>
            <DueDateTimeFields value={editDueAt} onChange={setEditDueAt} />
          </div>

          <label className="field">
            <span>{t('taskForm.recurrence.label')}</span>
            <RecurrenceSelect value={editRecurrence} onChange={setEditRecurrence} />
          </label>

          {editRecurrence === 'weekly' && (
            <div className="field">
              <span>{t('taskForm.recurrence.weekdaysLabel')}</span>
              <WeekdayCheckboxes selected={editRecurrenceWeekdays} onChange={setEditRecurrenceWeekdays} />
              <p className="field-hint">{t('taskForm.recurrence.weekdaysHint')}</p>
            </div>
          )}

          {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </div>
    );
  }

  const displayStatus = displayStatusForTask(task);

  return (
    <div className="screen task-detail-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
        <div className="topbar-actions">
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
          <span className="task-card-assignee">
            {assigneeLabel && assigneeLabel !== t('dashboard.unassigned') && assigneeLabel !== t('taskForm.everyone') && (
              <AvatarChip
                name={assigneeLabel}
                size={18}
                photoUrl={assigneeIds.length === 1 ? avatarUrlByUserId.get(assigneeIds[0]) : undefined}
              />
            )}
            {assigneeLabel}
          </span>
        </div>
        <div>
          <span className="label">{t('taskDetail.createdBy')}</span>
          <span className="task-card-assignee">
            {nameFor(task.created_by) && (
              <AvatarChip name={nameFor(task.created_by)} size={18} photoUrl={avatarUrlByUserId.get(task.created_by)} />
            )}
            {nameFor(task.created_by)}
          </span>
        </div>
        {task.starts_at && (
          <div>
            <span className="label">{t('taskDetail.startsAt')}</span>
            <span>{formatDueDateTime(task.starts_at, i18n.language, t('taskForm.allDay'))}</span>
          </div>
        )}
        <div>
          <span className="label">{t('taskDetail.dueAt')}</span>
          <span>{task.due_at ? formatDueDateTime(task.due_at, i18n.language, t('taskForm.allDay')) : t('dashboard.noDueDate')}</span>
        </div>
        {task.recurrence !== 'none' && (
          <div>
            <span className="label">{t('taskForm.recurrence.label')}</span>
            <span>
              {t(`taskForm.recurrence.${task.recurrence}`)}
              {task.recurrence === 'weekly' && task.recurrence_weekdays && task.recurrence_weekdays.length > 0 && (
                <>
                  {' '}
                  ({task.recurrence_weekdays
                    .slice()
                    .sort()
                    .map((day) => t(`taskForm.recurrence.weekdayShort.${day}`))
                    .join(', ')})
                </>
              )}
            </span>
          </div>
        )}
        <div>
          <span className="label">{t('taskDetail.createdAt')}</span>
          <span>{formatDateTime(task.created_at, i18n.language)}</span>
        </div>
        {(task.status === 'done' || task.status === 'pending_confirmation') && (
          <div>
            <span className="label">{t('taskDetail.completedAt')}</span>
            <span>{formatDateTime(task.completed_at, i18n.language)}</span>
          </div>
        )}
      </div>

      {(task.status === 'done' || task.status === 'pending_confirmation') && task.completion_note && (
        <div className="task-detail-section">
          <h2>{t('taskDetail.completionNote')}</h2>
          <p>{task.completion_note}</p>
        </div>
      )}

      {(task.status === 'done' || task.status === 'pending_confirmation') && photoUrl && (
        <div className="task-detail-section">
          <h2>{t('taskDetail.completionPhoto')}</h2>
          <a href={photoUrl} target="_blank" rel="noreferrer">
            <img src={photoUrl} alt={t('taskDetail.completionPhoto')} className="completion-photo" />
          </a>
        </div>
      )}

      {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

      {task.status === 'open' && (
        <form className="form task-detail-section" onSubmit={handleReport}>
          <h2>{t('taskDetail.completionNote')}</h2>
          <textarea
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            placeholder={t('taskDetail.completionNotePlaceholder')}
            rows={3}
            maxLength={2000}
          />
          <label className="field">
            <span>{t('taskDetail.completionPhoto')}</span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('taskDetail.completing') : t('taskDetail.completeButton')}
          </button>
        </form>
      )}

      {task.status === 'pending_confirmation' && (
        <div className="task-detail-section pending-confirmation-panel">
          {user?.id === task.created_by ? (
            <>
              <p>{t('taskDetail.pendingConfirmationRequesterMessage', { name: nameFor(task.completed_by) })}</p>
              <div className="pending-confirmation-actions">
                <button type="button" className="btn btn-ghost" onClick={() => void handleReject()} disabled={busy}>
                  {t('taskDetail.rejectButton')}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void handleConfirm()} disabled={busy}>
                  {busy ? t('taskDetail.confirming') : t('taskDetail.confirmButton')}
                </button>
              </div>
            </>
          ) : (
            <p>{t('taskDetail.pendingConfirmationWaitingMessage')}</p>
          )}
        </div>
      )}

      {task.status === 'done' && (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => setShowReopenConfirm(true)}
          disabled={busy}
        >
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

      <div className="task-detail-section">
        <h2>{t('taskDetail.comments')}</h2>
        {comments.length === 0 ? (
          <p className="empty-message">{t('taskDetail.noComments')}</p>
        ) : (
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className="comment-item">
                <div className="comment-item-header">
                  <span className="comment-item-author">
                    <AvatarChip name={nameFor(c.author_id)} size={16} photoUrl={avatarUrlByUserId.get(c.author_id)} />
                    {nameFor(c.author_id)}
                  </span>
                  <span className="comment-item-time">{formatDateTime(c.created_at, i18n.language)}</span>
                </div>
                <p className="comment-item-body">{c.body}</p>
                {user?.id === c.author_id && (
                  <button
                    type="button"
                    className="comment-item-delete"
                    onClick={() => void handleDeleteComment(c.id)}
                  >
                    {t('taskDetail.commentDelete')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="comment-quick-emoji-row">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="comment-emoji-btn"
              onClick={() => void handleQuickEmoji(emoji)}
              disabled={commentBusy}
            >
              {emoji}
            </button>
          ))}
        </div>

        <form className="comment-form" onSubmit={handleAddComment}>
          <input
            type="text"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder={t('taskDetail.commentPlaceholder')}
            maxLength={500}
          />
          <button type="submit" className="btn btn-primary" disabled={commentBusy || !commentBody.trim()}>
            {t('taskDetail.commentSend')}
          </button>
        </form>
      </div>

      <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
        {t('taskDetail.deleteButton')}
      </button>

      {celebration && <CelebrationOverlay result={celebration} onDismiss={() => setCelebration(null)} />}

      {showReopenConfirm && (
        <ConfirmModal
          message={t('taskDetail.reopenConfirm')}
          confirmLabel={t('taskDetail.reopenButton')}
          onConfirm={() => void handleReopen()}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}
    </div>
  );
}
