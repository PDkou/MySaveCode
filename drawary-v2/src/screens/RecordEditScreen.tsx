import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RecordFieldControl } from '../components/RecordFieldControl';
import type { Field } from '../data/types';
import { hasControl, type RecordDraft } from '../flow/recordForm';
import './RecordEditScreen.css';
import { t } from '../i18n';

interface RecordEditScreenProps {
  drawerName?: string;
  /** '' means "no photo" (see the gotcha in the comment below). */
  photoUri?: string;
  fields: Field[];
  /** What the form starts with; mount the screen with a `key` per record. */
  initialDraft: RecordDraft;
  saving?: boolean;
  onBack?: () => void;
  onPickPhoto?: () => void;
  onRemovePhoto?: () => void;
  onSave?: (draft: RecordDraft) => void;
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
 * V2-12 step 1-C: the form follows the record's real 서랍 칸 (all 10 kinds)
 * and saves what was typed. Photos here are one set of up to 3: "사진 바꾸기"
 * replaces the whole set with newly picked photos, × removes them all.
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
  photoUri = '',
  fields,
  initialDraft,
  saving = false,
  onBack,
  onPickPhoto,
  onRemovePhoto,
  onSave,
}: RecordEditScreenProps) {
  const [draft, setDraft] = useState<RecordDraft>(initialDraft);

  return (
    <main className="re-screen">
      <ScreenHeader variant="stacked" title={t('보관품 수정')} subtitle={t('{drawerName} 서랍', { drawerName })} onBack={onBack} height={94} />

      <section className="re-content">
        {photoUri ? (
          <section className="re-photo-card">
            <img className="re-photo" src={photoUri} alt={t('등록한 보관품 사진')} />
            <button className="re-photo-remove" type="button" onClick={onRemovePhoto} aria-label={t('사진 제거')}>×</button>
          </section>
        ) : (
          <button type="button" className="re-photo-card is-empty" onClick={onPickPhoto} aria-label={t('사진 선택')}>
            <img src="/assets/states/photo/state_photo_empty.webp" alt="" />
          </button>
        )}

        <button className="re-photo-change" type="button" onClick={onPickPhoto}>
          <img src="/assets/field-types/field_photo.webp" alt="" />
          <span>{photoUri ? t('사진 바꾸기') : t('사진 선택하기')}</span>
        </button>

        <div className="re-fields">
          {fields.filter((f) => hasControl(f.kind)).map((field) => (
            <div className="re-field" key={field.id}>
              <label htmlFor={`field-${field.id}`}>
                {field.name}{field.required && <em>*</em>}
              </label>
              <RecordFieldControl
                field={field}
                variant="re"
                id={`field-${field.id}`}
                value={draft[field.id] ?? ''}
                onChange={(v) => setDraft((prev) => ({ ...prev, [field.id]: v }))}
              />
            </div>
          ))}
        </div>

        <button className="re-save" type="button" disabled={saving} onClick={() => onSave?.(draft)}>
          
          {t('수정 완료')}
        </button>
      </section>
    </main>
  );
}
