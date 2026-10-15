import { useState } from 'react';
import './RecordDetailScreen.css';

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
  fields?: RecordFieldValue[];
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
 */
export function RecordDetailScreen({
  drawerName = '화장품',
  title = '롬앤 쥬시래스팅 틴트',
  photoUri = '/fixtures/sample_selected_photo.webp',
  fields = DEFAULT_FIELDS,
  onBack,
  onEdit,
  onDelete,
}: RecordDetailScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="rd-screen">
      <header className="rd-header">
        <button className="rd-back" type="button" onClick={onBack} aria-label="뒤로가기">‹</button>
        <h1>보관품 상세</h1>
        <button
          className="rd-menu"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="보관품 메뉴"
        >•••</button>

        {menuOpen && (
          <div className="rd-menu-popover" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete?.(); }}>
              <img src="/assets/ui-icons/icon_delete.webp" alt="" />
              <span>보관품 삭제</span>
            </button>
          </div>
        )}
      </header>

      <section className="rd-content">
        <div className="rd-photo">
          {photoUri
            ? <img src={photoUri} alt={`${title} 사진`} />
            : <div className="rd-photo-empty">사진 없음</div>}
        </div>

        <div className="rd-heading">
          <small>{drawerName} 서랍</small>
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
          <span>수정하기</span>
        </button>
      </section>
    </main>
  );
}
