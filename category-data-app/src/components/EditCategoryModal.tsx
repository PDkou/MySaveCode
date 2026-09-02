import { useState } from 'react';
import { Modal } from './Modal';
import { CATEGORY_COLOR_CHOICES, CATEGORY_EMOJI_CHOICES } from '../lib/palette';
import type { Category } from '../types';

interface EditCategoryModalProps {
  category: Category;
  onSave: (patch: { name: string; emoji: string; color: string }) => void;
  onClose: () => void;
}

export function EditCategoryModal({ category, onSave, onClose }: EditCategoryModalProps) {
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const [color, setColor] = useState(category.color);
  const canSubmit = name.trim().length > 0;

  return (
    <Modal
      title="카테고리 편집"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit}
          onClick={() => onSave({ name: name.trim(), emoji, color })}
        >
          저장
        </button>
      }
    >
      <label className="field-label" htmlFor="edit-category-name">
        이름
      </label>
      <input id="edit-category-name" className="text-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

      <span className="field-label">아이콘</span>
      <div className="choice-row wrap">
        {CATEGORY_EMOJI_CHOICES.map((e) => (
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
      <div className="choice-row wrap">
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
    </Modal>
  );
}
