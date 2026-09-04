import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { StarIcon, CopyIcon, BellIcon } from './icons';
import type { Category, Entry } from '../types';

interface EntryFormModalProps {
  category: Category;
  initial?: Entry;
  onSave: (values: Record<string, string>, reminders: Record<string, boolean>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
}

export function EntryFormModal({ category, initial, onSave, onDelete, onDuplicate, onClose }: EntryFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const f of category.fields) {
      base[f.id] = initial?.values[f.id] ?? (f.type === 'date' ? '' : '');
    }
    return base;
  });
  const [reminders, setReminders] = useState<Record<string, boolean>>(() => ({ ...initial?.reminders }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const setValue = (fieldId: string, v: string) => setValues((prev) => ({ ...prev, [fieldId]: v }));
  const setReminder = (fieldId: string, on: boolean) => setReminders((prev) => ({ ...prev, [fieldId]: on }));

  const missingRequired = category.fields.filter((f) => f.required && !values[f.id]?.trim());
  const canSubmit = missingRequired.length === 0;

  const submit = () => {
    if (!canSubmit) {
      setAttemptedSubmit(true);
      return;
    }
    onSave(values, reminders);
  };

  return (
    <Modal
      title={initial ? '데이터 수정' : `${category.name} 데이터 입력`}
      onClose={onClose}
      footer={
        <>
          {initial && onDuplicate && (
            <button type="button" className="btn btn-secondary" onClick={onDuplicate} aria-label="복제">
              <CopyIcon size={16} />
              복제
            </button>
          )}
          {initial && onDelete && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              삭제
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={submit}>
            저장
          </button>
        </>
      }
    >
      {category.fields.length === 0 && (
        <p className="empty-hint">이 카테고리에는 아직 항목이 없어요. 먼저 "필드 관리"에서 항목을 추가해 주세요.</p>
      )}
      {category.fields.map((f) => {
        const invalid = attemptedSubmit && f.required && !values[f.id]?.trim();
        return (
          <div key={f.id} className="entry-field">
            <label className="field-label" htmlFor={`entry-${f.id}`}>
              {f.name}
              {f.required && <span className="required-mark">*</span>}
            </label>
            {f.type === 'select' ? (
              <select
                id={`entry-${f.id}`}
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
              >
                <option value="">선택 안 함</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === 'date' ? (
              <>
                <input
                  id={`entry-${f.id}`}
                  type="date"
                  className={`text-input ${invalid ? 'invalid' : ''}`}
                  value={values[f.id] ?? ''}
                  onChange={(e) => setValue(f.id, e.target.value)}
                />
                {values[f.id] && (
                  <label className="checkbox-row reminder-row">
                    <input
                      type="checkbox"
                      checked={!!reminders[f.id]}
                      onChange={(e) => setReminder(f.id, e.target.checked)}
                    />
                    <BellIcon size={14} />
                    <span>홈 화면의 "다가오는 일정"에 표시</span>
                  </label>
                )}
              </>
            ) : f.type === 'number' || f.type === 'currency' ? (
              <input
                id={`entry-${f.id}`}
                type="number"
                inputMode="decimal"
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
                placeholder={f.type === 'currency' ? '금액 입력 (원)' : '숫자 입력'}
              />
            ) : f.type === 'checkbox' ? (
              <input
                id={`entry-${f.id}`}
                type="checkbox"
                className="entry-checkbox"
                checked={values[f.id] === 'true'}
                onChange={(e) => setValue(f.id, e.target.checked ? 'true' : '')}
              />
            ) : f.type === 'rating' ? (
              <div className="rating-input" role="group" aria-label={f.name}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="rating-star-btn"
                    onClick={() => setValue(f.id, values[f.id] === String(n) ? '' : String(n))}
                    aria-label={`${n}점`}
                    aria-pressed={Number(values[f.id]) >= n}
                  >
                    <StarIcon size={24} filled={Number(values[f.id]) >= n} />
                  </button>
                ))}
              </div>
            ) : (
              <input
                id={`entry-${f.id}`}
                type="text"
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
              />
            )}
          </div>
        );
      })}

      {confirmDelete && onDelete && (
        <ConfirmDialog
          title="데이터 삭제"
          message="이 데이터를 삭제할까요? 삭제하면 되돌릴 수 없어요."
          confirmLabel="삭제"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
