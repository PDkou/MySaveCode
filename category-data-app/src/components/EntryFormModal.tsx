import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import type { Category, Entry } from '../types';

interface EntryFormModalProps {
  category: Category;
  initial?: Entry;
  onSave: (values: Record<string, string>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function EntryFormModal({ category, initial, onSave, onDelete, onClose }: EntryFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const f of category.fields) {
      base[f.id] = initial?.values[f.id] ?? (f.type === 'date' ? '' : '');
    }
    return base;
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const setValue = (fieldId: string, v: string) => setValues((prev) => ({ ...prev, [fieldId]: v }));

  const missingRequired = category.fields.filter((f) => f.required && !values[f.id]?.trim());
  const canSubmit = missingRequired.length === 0;

  const submit = () => {
    if (!canSubmit) {
      setAttemptedSubmit(true);
      return;
    }
    onSave(values);
  };

  return (
    <Modal
      title={initial ? '데이터 수정' : `${category.name} 데이터 입력`}
      onClose={onClose}
      footer={
        <>
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
              <input
                id={`entry-${f.id}`}
                type="date"
                className={`text-input ${invalid ? 'invalid' : ''}`}
                value={values[f.id] ?? ''}
                onChange={(e) => setValue(f.id, e.target.value)}
              />
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
