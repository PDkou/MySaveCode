import { useState } from 'react';
import { Modal } from './Modal';
import { CATEGORY_TEMPLATES } from '../lib/templates';
import { CATEGORY_COLOR_CHOICES } from '../lib/palette';
import type { FieldDef } from '../types';

const EMOJI_CHOICES = ['📁', '💰', '👕', '💄', '📚', '🏋️', '🐾', '🌱', '🎮', '🚗', '✈️', '🏠'];

interface AddCategoryModalProps {
  onCreate: (input: { name: string; emoji: string; color: string; fields: FieldDef[] }) => void;
  onClose: () => void;
}

type Step = 'template' | 'details';

export function AddCategoryModal({ onCreate, onClose }: AddCategoryModalProps) {
  const [step, setStep] = useState<Step>('template');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [color, setColor] = useState(CATEGORY_COLOR_CHOICES[0]);
  const [fields, setFields] = useState<FieldDef[]>([]);

  const pickTemplate = (templateId: string) => {
    if (templateId === 'blank') {
      setName('');
      setEmoji(EMOJI_CHOICES[0]);
      setColor(CATEGORY_COLOR_CHOICES[0]);
      setFields([]);
      setStep('details');
      return;
    }
    const tpl = CATEGORY_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setName(tpl.name);
    setEmoji(tpl.emoji);
    setColor(tpl.color);
    setFields(tpl.buildFields());
    setStep('details');
  };

  const canSubmit = name.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onCreate({ name: name.trim(), emoji, color, fields });
  };

  if (step === 'template') {
    return (
      <Modal title="카테고리 추가" onClose={onClose}>
        <p className="modal-hint">템플릿으로 빠르게 시작하거나, 빈 카테고리에서 직접 항목을 만들 수 있어요.</p>
        <div className="template-grid">
          {CATEGORY_TEMPLATES.map((tpl) => (
            <button key={tpl.id} type="button" className="template-card" onClick={() => pickTemplate(tpl.id)}>
              <span className="template-emoji">{tpl.emoji}</span>
              <span className="template-name">{tpl.name}</span>
              <span className="template-desc">{tpl.description}</span>
            </button>
          ))}
          <button type="button" className="template-card template-card-blank" onClick={() => pickTemplate('blank')}>
            <span className="template-emoji">➕</span>
            <span className="template-name">빈 카테고리로 시작</span>
            <span className="template-desc">항목을 직접 설계해요</span>
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="카테고리 정보"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('template')}>
            이전
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            만들기
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="category-name">
        이름
      </label>
      <input
        id="category-name"
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 가계부"
        autoFocus
      />

      <span className="field-label">아이콘</span>
      <div className="choice-row">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            className={`emoji-choice ${emoji === e ? 'selected' : ''}`}
            onClick={() => setEmoji(e)}
            aria-label={`아이콘 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      <span className="field-label">색상</span>
      <div className="choice-row">
        {CATEGORY_COLOR_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-choice ${color === c ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            aria-label={`색상 ${c}`}
          />
        ))}
      </div>

      {fields.length > 0 && (
        <>
          <span className="field-label">포함된 항목 ({fields.length}개)</span>
          <ul className="template-field-list">
            {fields.map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
          </ul>
          <p className="modal-hint">항목은 카테고리를 만든 후에도 자유롭게 추가·수정할 수 있어요.</p>
        </>
      )}
    </Modal>
  );
}
