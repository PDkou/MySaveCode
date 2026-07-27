import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '../context/TasksContext';
import { useFamily } from '../context/FamilyContext';
import type { FamilyMember } from '../context/FamilyContext';
import type { TaskRecurrence, TaskTemplateRow } from '../types/database';
import { AssigneeCheckboxes } from './AssigneeCheckboxes';
import { AssigneeLotteryButton } from './AssigneeLotteryButton';
import { RecurrenceSelect } from './RecurrenceSelect';
import { DueDateTimeFields } from './DueDateTimeFields';
import { TaskTemplatePicker } from './TaskTemplatePicker';
import { WeekdayCheckboxes } from './WeekdayCheckboxes';

interface NewTaskModalProps {
  members: FamilyMember[];
  onClose: () => void;
}

export function NewTaskModal({ members, onClose }: NewTaskModalProps) {
  const { t } = useTranslation();
  const { createTask } = useTasks();
  const { family } = useFamily();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
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
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        recurrenceWeekdays: recurrence === 'weekly' && recurrenceWeekdays.length > 0 ? recurrenceWeekdays : null,
      });
      onClose();
    } catch {
      setErrorKey('taskForm.error.unknown');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyTemplate = (template: TaskTemplateRow) => {
    setTitle(template.title);
    setDetails(template.details ?? '');
    setRecurrence(template.recurrence);
    // A saved default, not a locked-in choice -- still just checkboxes the
    // user can freely change afterward if this time's assignee differs.
    setAssigneeIds(template.assignee_ids.filter((id) => members.some((m) => m.user_id === id)));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('taskForm.heading')}</h2>
        <form onSubmit={handleSubmit} className="form">
          {family && (
            <TaskTemplatePicker
              familyId={family.id}
              currentTitle={title}
              currentDetails={details}
              currentRecurrence={recurrence}
              currentAssigneeIds={assigneeIds}
              onApply={handleApplyTemplate}
            />
          )}

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
            <div className="field-label-row">
              <span>{t('taskForm.assignedTo')}</span>
              <AssigneeLotteryButton
                members={members}
                onHighlightChange={setHighlightedId}
                onPick={(userId) => setAssigneeIds([userId])}
              />
            </div>
            <AssigneeCheckboxes
              members={members}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              highlightedId={highlightedId}
            />
          </div>

          <div className="field">
            <span>{t('taskForm.startsAt')}</span>
            <DueDateTimeFields value={startsAt} onChange={setStartsAt} />
          </div>

          <div className="field">
            <span>{t('taskForm.dueAt')}</span>
            <DueDateTimeFields value={dueAt} onChange={setDueAt} />
          </div>

          <label className="field">
            <span>{t('taskForm.recurrence.label')}</span>
            <RecurrenceSelect value={recurrence} onChange={setRecurrence} />
          </label>

          {recurrence === 'weekly' && (
            <div className="field">
              <span>{t('taskForm.recurrence.weekdaysLabel')}</span>
              <WeekdayCheckboxes selected={recurrenceWeekdays} onChange={setRecurrenceWeekdays} />
              <p className="field-hint">{t('taskForm.recurrence.weekdaysHint')}</p>
            </div>
          )}

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
