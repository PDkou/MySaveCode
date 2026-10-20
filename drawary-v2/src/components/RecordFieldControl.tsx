import './RecordFieldControl.css';
import type { Field } from '../data/types';
import type { FieldDraft } from '../flow/recordForm';
import { t } from '../i18n';

interface Props {
  field: Field;
  value: FieldDraft;
  onChange: (value: FieldDraft) => void;
  /** Which approved screen's input styling to borrow: #13 (`fd`) or #17 (`re`). */
  variant: 'fd' | 're';
  id: string;
}

const LONG_TEXT_MAX = 500;

/**
 * The input for one 서랍 칸 in the fill (#13) and edit (#17) forms. Text,
 * long text, money and date reuse those screens' approved input styles; the
 * kinds the approved forms never showed (number, select, check, rating,
 * link) are drawn in the same colors and sizes -- see docs/V2_12_04.
 */
export function RecordFieldControl({ field, value, onChange, variant: p, id }: Props) {
  const text = typeof value === 'string' ? value : '';

  switch (field.kind) {
    case 'long_text':
      return (
        <div className={`${p}-textarea-wrap`}>
          <textarea id={id} value={text} maxLength={LONG_TEXT_MAX} onChange={(e) => onChange(e.target.value)} />
          {p === 'fd' ? <span>{text.length}/{LONG_TEXT_MAX}</span> : <small>{text.length}/{LONG_TEXT_MAX}</small>}
        </div>
      );
    case 'currency':
    case 'date':
      return (
        <div className={`${p}-input-icon`}>
          <img src={field.kind === 'date' ? '/assets/ui-icons/icon_calendar.webp' : '/assets/field-types/field_currency.webp'} alt="" />
          {field.kind === 'date'
            ? <input id={id} type="date" value={text} onChange={(e) => onChange(e.target.value)} />
            : <input id={id} inputMode="numeric" value={text} onChange={(e) => onChange(e.target.value)} />}
        </div>
      );
    case 'number':
      return <input id={id} className={`${p}-input`} inputMode="decimal" value={text} onChange={(e) => onChange(e.target.value)} />;
    case 'link':
      return <input id={id} className={`${p}-input`} type="url" inputMode="url" placeholder="https://" value={text} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return (
        <select id={id} className={`${p}-input rfc-select`} value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="">{t('선택 안 함')}</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'check':
      return (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={value === true}
          className={`${p}-input rfc-check${value === true ? ' is-on' : ''}`}
          onClick={() => onChange(value !== true)}
        >
          <span className="rfc-check-box" aria-hidden="true">{value === true ? '✓' : ''}</span>
          <span>{value === true ? t('체크함') : t('체크 안 함')}</span>
        </button>
      );
    case 'rating': {
      const stars = typeof value === 'number' ? value : 0;
      return (
        <div id={id} className={`${p}-input rfc-rating`} role="group" aria-label={t('{name} 별점', { name: field.name })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= stars ? 'is-on' : ''}
              aria-label={t('{n}점', { n })}
              aria-pressed={n === stars}
              // Tapping the current score again clears it back to "not rated".
              onClick={() => onChange(n === stars ? 0 : n)}
            >{n <= stars ? '★' : '☆'}</button>
          ))}
        </div>
      );
    }
    default:
      return <input id={id} className={`${p}-input`} value={text} onChange={(e) => onChange(e.target.value)} />;
  }
}
