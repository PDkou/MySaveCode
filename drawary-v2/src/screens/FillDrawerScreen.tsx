import { useState } from 'react';
import './FillDrawerScreen.css';

// Ported verbatim from Drawary_13_FINAL_CONFIRMED_CODE's FillDrawer.tsx
// (CONFIRMED.md: title is `{drawerName} 서랍 채우기`, drawerName is live,
// the 화장품 default is just sample data for rendering, not a fixed
// value). Only the flat archive asset paths changed to this app's real
// layout (`/assets/states/photo/...`, `/assets/field-types/...`,
// `/assets/ui-icons/...`). No footer: sub-flow screen.
interface FillDrawerScreenProps {
  drawerName?: string;
  onBack?: () => void;
  onAddPhoto?: () => void;
  onSave?: (data: {
    productName: string;
    purchaseDate: string;
    price: string;
    memo: string;
  }) => void;
}

export function FillDrawerScreen({
  drawerName = '화장품',
  onBack,
  onAddPhoto,
  onSave,
}: FillDrawerScreenProps) {
  const [productName, setProductName] = useState('롬앤 쥬시래스팅 틴트');
  const [purchaseDate, setPurchaseDate] = useState('2024. 03. 12. (화)');
  const [price, setPrice] = useState('13,000');
  const [memo, setMemo] = useState('발색이 자연스럽고 지속력이 좋아요.');

  return (
    <main className="fd-screen">
      <header className="fd-header">
        <button type="button" className="fd-back" onClick={onBack} aria-label="뒤로가기">‹</button>
        <h1>{drawerName} 서랍 채우기</h1>
      </header>

      <section className="fd-content">
        <button type="button" className="fd-photo-empty" onClick={onAddPhoto} aria-label="사진 추가">
          <img src="/assets/states/photo/state_photo_empty.webp" alt="" />
        </button>

        <button type="button" className="fd-photo-add" onClick={onAddPhoto}>
          <img src="/assets/field-types/field_photo.webp" alt="" />
          <span>사진 추가하기</span>
        </button>

        <label className="fd-label" htmlFor="fd-product">제품명 <em>*</em></label>
        <input
          id="fd-product"
          className="fd-input"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />

        <label className="fd-label" htmlFor="fd-date">구매일</label>
        <div className="fd-input-icon">
          <img src="/assets/ui-icons/icon_calendar.webp" alt="" />
          <input
            id="fd-date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>

        <label className="fd-label" htmlFor="fd-price">가격</label>
        <div className="fd-input-icon">
          <img src="/assets/field-types/field_currency.webp" alt="" />
          <input
            id="fd-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <label className="fd-label" htmlFor="fd-memo">메모</label>
        <div className="fd-textarea-wrap">
          <textarea
            id="fd-memo"
            maxLength={500}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <span>{memo.length}/500</span>
        </div>

        <button
          type="button"
          className="fd-primary"
          onClick={() => onSave?.({ productName, purchaseDate, price, memo })}
        >
          담기
        </button>
      </section>
    </main>
  );
}
