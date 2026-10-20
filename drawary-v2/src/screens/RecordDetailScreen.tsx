import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RecordDetailScreen.css';
import { RecordDeleteConfirmScreen } from './RecordDeleteConfirmScreen';
import { t } from '../i18n';

export type RecordFieldType =
  | 'text'
  | 'note'
  | 'number'
  | 'currency'
  | 'date'
  | 'photo'
  | 'select'
  | 'checkbox'
  | 'rating'
  | 'link';

export interface RecordFieldValue {
  id: string;
  label: string;
  value: string;
  type?: RecordFieldType;
}

const FIELD_ASSET: Record<RecordFieldType, string> = {
  text: '/assets/field-types/field_text.webp',
  note: '/assets/field-types/field_edit_note.webp',
  number: '/assets/field-types/field_number.webp',
  currency: '/assets/field-types/field_currency.webp',
  date: '/assets/field-types/field_date.webp',
  photo: '/assets/field-types/field_photo.webp',
  select: '/assets/field-types/field_select.webp',
  checkbox: '/assets/field-types/field_checkbox.webp',
  rating: '/assets/field-types/field_rating.webp',
  link: '/assets/field-types/field_link.webp',
};

const DEFAULT_FIELDS: RecordFieldValue[] = [
  { id: 'purchase-date', label: '구매일', value: '2024. 03. 12. (화)', type: 'date' },
  { id: 'price', label: '가격', value: '13,000', type: 'currency' },
  { id: 'memo', label: '메모', value: '발색이 자연스럽고 지속력이 좋아요.', type: 'note' },
];

interface RecordDetailScreenProps {
  drawerName?: string;
  title?: string;
  photoUri?: string;
  /** True while the photo is still being read, so "사진 없음" is not flashed first. */
  photoLoading?: boolean;
  fields?: RecordFieldValue[];
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenPhoto?: () => void;
}

/**
 * #16 보관품 상세. Ported verbatim from `Drawary_16_FINAL_CONFIRMED_CODE`'s
 * `RecordDetail.tsx`/`record-detail.css` (CONFIRMED.md: "FINAL CONFIRMED /
 * Revised" -- no README contradiction this time, both agree it's final).
 * Each field's `type` auto-maps to one of the 10 approved
 * `field-types/*.webp` icons; CONFIRMED.md is explicit that prices are
 * shown as stored ("13,000"), never given an invented currency symbol.
 * Asset paths fixed from the archive's flat layout to this app's real
 * nested layout (`/assets/field-types/...`, `/assets/ui-icons/...`).
 * The default sample photo deliberately reuses #14's own
 * `sample_selected_photo.webp` fixture (both are the same 롬앤 쥬시래스팅
 * 틴트 record): this archive's own `sample_record_photo.webp` fixture
 * turned out to be a mis-captured screenshot crop with a "1/3" badge
 * and thumbnail-strip sliver baked into it, not a clean product photo
 * -- confirmed by comparing it against `16_CONFIRMED_MAIN.png`, which
 * shows a clean zoomed photo with no UI chrome. Not production data,
 * since there's no real item data model yet (V2-12).
 *
 * #18 보관품 삭제 확인 is rendered here as a local overlay (triggered by
 * the "•••" menu's "보관품 삭제"), matching the established
 * component-local-modal convention already used for #11's delete
 * confirm. The `onDelete` prop only fires once the user actually
 * confirms in that sheet, not just from opening the menu.
 *
 * `onOpenPhoto` is an addition beyond the confirmed #16 source: #19's
 * own CONFIRMED.md says closing the photo viewer "복귀" (returns) to
 * #16, implying #16 is meant to launch it, but the confirmed #16
 * source itself never defines that tap target. Added here as the
 * natural integration point (tapping the photo) rather than inventing
 * a different entry point #19's own spec doesn't support.
 */
export function RecordDetailScreen({
  drawerName = '화장품',
  title = '롬앤 쥬시래스팅 틴트',
  photoUri = '/fixtures/sample_selected_photo.webp',
  photoLoading = false,
  fields = DEFAULT_FIELDS,
  onBack,
  onEdit,
  onDelete,
  onOpenPhoto,
}: RecordDetailScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <section className="rd-screen">
      <ScreenHeader
        variant="stacked"
        title={t('보관품 상세')}
        onBack={onBack}
        height={92}
        rightSlot={
          <>
            <button
              className="rd-menu"
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={t('보관품 메뉴')}
            >•••</button>
            {menuOpen && (
              <div className="rd-menu-popover" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setDeleteConfirmOpen(true); }}>
                  <img src="/assets/ui-icons/icon_delete.webp" alt="" />
                  <span>{t('보관품 삭제')}</span>
                </button>
              </div>
            )}
          </>
        }
      />

      <section className="rd-content">
        {photoLoading ? (
          <div className="rd-photo" aria-busy="true" />
        ) : photoUri ? (
          <button type="button" className="rd-photo" onClick={onOpenPhoto} aria-label={t('사진 크게 보기')}>
            <img src={photoUri} alt={t('{title} 사진', { title })} />
          </button>
        ) : (
          <div className="rd-photo"><div className="rd-photo-empty">{t('사진 없음')}</div></div>
        )}

        <div className="rd-heading">
          <small>{t('{name} 서랍', { name: drawerName })}</small>
          <h2>{title}</h2>
        </div>

        <dl className="rd-fields">
          {fields.map((field) => (
            <div className="rd-field-row" key={field.id}>
              <dt>
                <img
                  className="rd-field-icon"
                  src={FIELD_ASSET[field.type ?? 'text']}
                  alt=""
                  aria-hidden="true"
                />
                <span>{field.label}</span>
              </dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>

        <button className="rd-edit" type="button" onClick={onEdit}>
          <img src="/assets/ui-icons/icon_edit.webp" alt="" />
          <span>{t('수정하기')}</span>
        </button>
      </section>

      {deleteConfirmOpen && (
        <RecordDeleteConfirmScreen
          recordTitle={title}
          onCancel={() => setDeleteConfirmOpen(false)}
          onDelete={() => { setDeleteConfirmOpen(false); onDelete?.(); }}
        />
      )}
    </section>
  );
}
