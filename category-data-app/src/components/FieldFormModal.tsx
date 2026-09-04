import { useState } from 'react';
import { Modal } from './Modal';
import type { FieldDef, FieldType } from '../types';

const TYPE_LABELS: Record<FieldType, string> = {
  text: '텍스트',
  number: '숫자',
  currency: '금액',
  date: '날짜',
  select: '선택 목록',
  checkbox: '체크박스',
  rating: '별점',
};

interface FieldFormModalProps {
  initial?: FieldDef;
  onSave: (field: { name: string; type: FieldType; options?: string[]; required: boolean }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function FieldFormModal({ initial, onSave, onDelete, onClose }: FieldFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<FieldType>(initial?.type ?? 'text');
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join(', '));
  const [required, setRequired] = useState(initial?.required ?? false);

  const canSubmit = name.trim().length > 0 && (type !== 'select' || optionsText.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    const options =
      type === 'select'
        ? optionsText
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
    onSave({ name: name.trim(), type, options, required });
  };

  return (
    <Modal
      title={initial ? '항목 수정' : '항목 추가'}
      onClose={onClose}
      footer={
        <>
          {initial && onDelete && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              삭제
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            저장
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="field-name">
        항목 이름
      </label>
      <input
        id="field-name"
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 지출 항목"
        autoFocus
      />

      <span className="field-label">유형</span>
      <div className="choice-row wrap">
        {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`type-choice ${type === t ? 'selected' : ''}`}
            onClick={() => setType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {type === 'select' && (
        <>
          <label className="field-label" htmlFor="field-options">
            선택지 (쉼표로 구분)
          </label>
          <input
            id="field-options"
            className="text-input"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="예: 수입, 지출"
          />
        </>
      )}

      <label className="checkbox-row">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        <span>필수 입력 항목으로 지정</span>
      </label>
    </Modal>
  );
}
