import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RecordFieldControl } from '../components/RecordFieldControl';
import type { Field } from '../data/types';
import { MAX_RECORD_PHOTOS } from '../data/types';
import { emptyDraft, hasControl, type RecordDraft } from '../flow/recordForm';
import './FillDrawerScreen.css';
import { t } from '../i18n';

// Ported from Drawary_13_FINAL_CONFIRMED_CODE's FillDrawer.tsx (the
// empty-photo state) merged with Drawary_14_FINAL_CONFIRMED_CODE's
// PhotoRegisteredState.tsx (the registered-photo state) -- per #14's own
// CONFIRMED.md, these are the same screen's two states ("사진 선택 /
// 등록 상태"), not two separate screens. Markup, classes and asset paths of
// the photo area, labels, buttons and the approved input boxes are
// unchanged. No footer: sub-flow screen.
//
// V2-12 step 1-C: the form now follows the drawer's real 서랍 칸 (any of the
// 10 kinds) instead of the four hard-coded demo inputs, starts empty, and
// photos are real (chosen by the caller, shown here, max 3). Fields of kind
// `photo` have no row: photos are always the area at the top.
interface FillDrawerScreenProps {
  drawerName?: string;
  fields: Field[];
  maxPhotos?: number;
  /** Object URLs of the photos picked so far. */
  photoUris: string[];
  /** True while the record is being saved, so a double tap cannot add it twice. */
  saving?: boolean;
  onBack?: () => void;
  onPickPhotos?: () => void;
  onRemovePhoto?: (index: number) => void;
  onSave?: (draft: RecordDraft) => void;
}

export function FillDrawerScreen({
  drawerName = '화장품',
  fields,
  maxPhotos = MAX_RECORD_PHOTOS,
  photoUris,
  saving = false,
  onBack,
  onPickPhotos,
  onRemovePhoto,
  onSave,
}: FillDrawerScreenProps) {
  const [draft, setDraft] = useState<RecordDraft>(() => emptyDraft(fields));
  const [activeIndex, setActiveIndex] = useState(0);

  const hasPhoto = photoUris.length > 0;
  const shownIndex = Math.min(activeIndex, photoUris.length - 1);
  const activePhoto = photoUris[shownIndex];

  return (
    <main className="fd-screen">
      <ScreenHeader variant="stacked" title={t('{drawerName} 서랍 채우기', { drawerName })} onBack={onBack} height={91} />

      <section className="fd-content">
        {hasPhoto ? (
          <section className="fd-photo-card" aria-label={t('등록한 사진')}>
            <img className="fd-photo" src={activePhoto} alt={t('등록한 보관품 사진')} />
            <button
              type="button"
              className="fd-remove"
              onClick={() => { onRemovePhoto?.(shownIndex); setActiveIndex(0); }}
              aria-label={t('현재 사진 삭제')}
            >×</button>
            <span className="fd-count">{shownIndex + 1} / {maxPhotos}</span>
          </section>
        ) : (
          <button type="button" className="fd-photo-empty" onClick={onPickPhotos} aria-label={t('사진 추가')}>
            <img src="/assets/states/photo/state_photo_empty.webp" alt="" />
          </button>
        )}

        {hasPhoto && photoUris.length > 1 && (
          <div className="fd-thumbs" aria-label={t('등록한 사진 목록')}>
            {photoUris.map((uri, index) => (
              <button
                type="button"
                key={`${uri}-${index}`}
                className={index === shownIndex ? 'is-active' : ''}
                onClick={() => setActiveIndex(index)}
              >
                <img src={uri} alt="" />
              </button>
            ))}
          </div>
        )}

        {photoUris.length < maxPhotos && (
          <button type="button" className="fd-photo-add" onClick={onPickPhotos}>
            <img src="/assets/field-types/field_photo.webp" alt="" />
            <span>{hasPhoto ? t('사진 더 담기') : t('사진 추가하기')}</span>
          </button>
        )}

        {fields.filter((f) => hasControl(f.kind)).map((field) => (
          <div key={field.id}>
            <label className="fd-label" htmlFor={`fd-${field.id}`}>{field.name}{field.required && <> <em>*</em></>}</label>
            <RecordFieldControl
              field={field}
              variant="fd"
              id={`fd-${field.id}`}
              value={draft[field.id] ?? ''}
              onChange={(v) => setDraft((prev) => ({ ...prev, [field.id]: v }))}
            />
          </div>
        ))}

        <button
          type="button"
          className="fd-primary"
          disabled={saving}
          onClick={() => onSave?.(draft)}
        >
          
          {t('담기')}
        </button>
      </section>
    </main>
  );
}
