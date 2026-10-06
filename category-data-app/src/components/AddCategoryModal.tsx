import { useState } from 'react';
import { Modal } from './Modal';
import { CATEGORY_TEMPLATES } from '../lib/templates';
import { CATEGORY_COLOR_CHOICES, CATEGORY_EMOJI_CHOICES } from '../lib/palette';
import { CategoryBadgeEmoji, CategoryTemplateEmoji } from './categoryIcons';
import type { FieldDef } from '../types';
import { useI18n } from '../i18n';

interface AddCategoryModalProps {
  onCreate: (input: { name: string; emoji: string; color: string; fields: FieldDef[] }) => void;
  onClose: () => void;
}

type Step = 'template' | 'details';

export function AddCategoryModal({ onCreate, onClose }: AddCategoryModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('template');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(CATEGORY_EMOJI_CHOICES[0]);
  const [color, setColor] = useState(CATEGORY_COLOR_CHOICES[0]);
  const [fields, setFields] = useState<FieldDef[]>([]);

  const pickTemplate = (templateId: string) => {
    if (templateId === 'blank') {
      setName('');
      setEmoji(CATEGORY_EMOJI_CHOICES[0]);
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
      <Modal title={t('addDrawer.title')} onClose={onClose}>
        <p className="modal-hint">{t('addDrawer.hint')}</p>
        <div className="template-grid">
          {CATEGORY_TEMPLATES.map((tpl) => (
            <button key={tpl.id} type="button" className="template-card" onClick={() => pickTemplate(tpl.id)}>
              <span className="template-emoji">
                <CategoryTemplateEmoji value={tpl.emoji} size={34} />
              </span>
              <span className="template-name">{tpl.name}</span>
              <span className="template-desc">{tpl.description}</span>
            </button>
          ))}
          <button type="button" className="template-card template-card-blank" onClick={() => pickTemplate('blank')}>
            <span className="template-emoji template-emoji-plus">+</span>
            <span className="template-name">{t('addDrawer.blank')}</span>
            <span className="template-desc">{t('addDrawer.blankDesc')}</span>
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={t('addDrawer.info')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('template')}>
            {t('common.previous')}
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            {t('common.create')}
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="category-name">
        {t('common.name')}
      </label>
      <input
        id="category-name"
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('addDrawer.namePlaceholder')}
        autoFocus
      />

      <span className="field-label">{t('common.icon')}</span>
      <div className="choice-row wrap">
        {CATEGORY_EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            className={`emoji-choice ${emoji === e ? 'selected' : ''}`}
            onClick={() => setEmoji(e)}
            aria-label={`${t('common.icon')} ${e}`}
          >
            <CategoryBadgeEmoji value={e} size={26} />
          </button>
        ))}
      </div>

      <span className="field-label">{t('common.color')}</span>
      <div className="choice-row wrap">
        {CATEGORY_COLOR_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-choice ${color === c ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            aria-label={`${t('common.color')} ${c}`}
          />
        ))}
      </div>

      {fields.length > 0 && (
        <>
          <span className="field-label">{t('addDrawer.includedFields', { count: fields.length })}</span>
          <ul className="template-field-list">
            {fields.map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
          </ul>
          <p className="modal-hint">{t('addDrawer.fieldsEditable')}</p>
        </>
      )}
    </Modal>
  );
}
