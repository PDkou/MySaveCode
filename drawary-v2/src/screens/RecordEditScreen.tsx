import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RecordEditScreen.css';

export type EditableFieldType = 'text' | 'date' | 'currency' | 'note';

export interface EditableRecordField {
  id: string;
  label: string;
  type: EditableFieldType;
  value: string;
  required?: boolean;
  maxLength?: number;
}

const DEFAULT_FIELDS: EditableRecordField[] = [
  { id: 'product-name', label: '제품명', type: 'text', value: '롬앤 쥬시래스팅 틴트', required: true },
  { id: 'purchase-date', label: '구매일', type: 'date', value: '2024. 03. 12. (화)' },
  { id: 'price', label: '가격', type: 'currency', value: '13,000' },
  { id: 'memo', label: '메모', type: 'note', value: '발색이 자연스럽고 지속력이 좋아요.' },
];

interface RecordEditScreenProps {
  drawerName?: string;
  photoUri?: string;
  fields?: EditableRecordField[];
  onBack?: () => void;
  onPickPhoto?: () => void;
  onRemovePhoto?: () => void;
  onSave?: (values: Record<string, string>) => void;
}

/**
 * #17 보관품 수정. Ported verbatim from `Drawary_17_FINAL_CONFIRMED_CODE`'s
 * `RecordEdit.tsx`/`record-edit.css`. Its own README says "사용자 확정 전
 * 이므로 17번 미확정 유지," contradicted by the sibling `CONFIRMED.md`'s
 * "FINAL CONFIRMED" in the same archive -- same stale-README pattern as
 * #03/#04/#09-#11/#13-#15. `CONFIRMED.md` (and the unflagged top-level
 * `STATUS.md`) wins.
 *
 * CONFIRMED.md flags that this screen's confirmed baseline is the
 * *first* candidate (V1) -- a later V2 draft that added a field-label
 * icon per row was explicitly rolled back. The TSX here already has
 * plain text labels with no per-row icon, confirming it already is V1,
 * not something that needed reverting.
 *
 * The sample photo fixture (`sample_edit_photo.webp`) visibly has a
 * thumbnail-strip sliver and a corner button baked into it -- unlike
 * #16's equivalent fixture, this one actually matches
 * `17_CONFIRMED_RENDER.png`'s own appearance pixel-for-pixel (checked
 * directly), so it's used as-is rather than substituted.
 *
 * Asset paths fixed from the archive's flat layout to this app's real
 * nested layout (`/assets/field-types/...`, `/assets/ui-icons/...`).
 *
 * Caller gotcha found during this screen's own QA: `photoUri`'s default
 * parameter only applies when the prop is literally `undefined`, so a
 * caller representing "removed" with `undefined` (state set from
 * `onRemovePhoto`) silently gets the fixture photo put right back on
 * next render. Represent "no photo" with `''` instead.
 *
 * 2026-10-15, user-requested change: the archive's original empty-photo
 * treatment (a plain generic icon + "등록된 사진이 없어요" caption on a
 * solid pink card) was restyled to match #13's dashed-border +
 * illustration look instead, after the user compared the two directly
 * and asked for the more polished #13 treatment. This is a deliberate
 * deviation from the archived source, not a port.
 */
export function RecordEditScreen({
  drawerName = '화장품',
  photoUri = '/fixtures/sample_edit_photo.webp',
  fields = DEFAULT_FIELDS,
  onBack,
  onPickPhoto,
  onRemovePhoto,
  onSave,
}: RecordEditScreenProps) {
  const initialValues = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.value])),
    [fields]
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  const updateValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <main className="re-screen">
      <ScreenHeader variant="stacked" title="보관품 수정" subtitle={`${drawerName} 서랍`} onBack={onBack} height={100} />

      <section className="re-content">
        {photoUri ? (
          <section className="re-photo-card">
            <img className="re-photo" src={photoUri} alt="등록한 보관품 사진" />
            <button className="re-photo-remove" type="button" onClick={onRemovePhoto} aria-label="사진 제거">×</button>
          </section>
        ) : (
          <button type="button" className="re-photo-card is-empty" onClick={onPickPhoto} aria-label="사진 선택">
            <img src="/assets/states/photo/state_photo_empty.webp" alt="" />
          </button>
        )}

        <button className="re-photo-change" type="button" onClick={onPickPhoto}>
          <img src="/assets/field-types/field_photo.webp" alt="" />
          <span>{photoUri ? '사진 바꾸기' : '사진 선택하기'}</span>
        </button>

        <div className="re-fields">
          {fields.map((field) => (
            <div className="re-field" key={field.id}>
              <label htmlFor={`field-${field.id}`}>
                {field.label}{field.required && <em>*</em>}
              </label>

              {field.type === 'note' ? (
                <div className="re-textarea-wrap">
                  <textarea
                    id={`field-${field.id}`}
                    value={values[field.id] ?? ''}
                    maxLength={field.maxLength ?? 500}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                  />
                  <small>{(values[field.id] ?? '').length}/{field.maxLength ?? 500}</small>
                </div>
              ) : field.type === 'date' || field.type === 'currency' ? (
                <div className="re-input-icon">
                  <img
                    src={field.type === 'date'
                      ? '/assets/ui-icons/icon_calendar.webp'
                      : '/assets/field-types/field_currency.webp'}
                    alt=""
                  />
                  <input
                    id={`field-${field.id}`}
                    value={values[field.id] ?? ''}
                    onChange={(e) => updateValue(field.id, e.target.value)}
                  />
                </div>
              ) : (
                <input
                  id={`field-${field.id}`}
                  className="re-input"
                  value={values[field.id] ?? ''}
                  onChange={(e) => updateValue(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <button className="re-save" type="button" onClick={() => onSave?.(values)}>
          수정 완료
        </button>
      </section>
    </main>
  );
}
