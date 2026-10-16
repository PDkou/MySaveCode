import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './FillDrawerScreen.css';

// Ported from Drawary_13_FINAL_CONFIRMED_CODE's FillDrawer.tsx (the
// empty-photo state) merged with Drawary_14_FINAL_CONFIRMED_CODE's
// PhotoRegisteredState.tsx (the registered-photo state) -- per #14's own
// CONFIRMED.md, these are the same screen's two states ("사진 선택 /
// 등록 상태"), not two separate screens: same title, same product-name/
// date/price/memo fields, same primary button, differing only in
// whether a photo has been picked yet. Only the flat archive asset
// paths changed to this app's real layout (`/assets/states/photo/...`,
// `/assets/field-types/...`, `/assets/ui-icons/...`). No footer:
// sub-flow screen.
//
// #14's CONFIRMED.md: photo selection assumes the Android Photo Picker,
// returning real URIs for dynamic preview; the sample image is a
// render-QA fixture, not a fixed app asset. This app has no Android
// picker to call, so `onAddPhoto` defaults to adding that same QA
// fixture (`/fixtures/sample_selected_photo.webp`) to local state --
// enough to exercise and verify the registered-state UI in a browser --
// while still calling a caller-supplied `onAddPhoto` first, so a real
// picker integration can take over this responsibility later without
// changing this component.
interface FillDrawerScreenProps {
  drawerName?: string;
  maxPhotos?: number;
  onBack?: () => void;
  onAddPhoto?: () => void;
  onSave?: (data: {
    productName: string;
    purchaseDate: string;
    price: string;
    memo: string;
    photoUris: string[];
  }) => void;
}

const QA_FIXTURE_PHOTO = '/fixtures/sample_selected_photo.webp';

export function FillDrawerScreen({
  drawerName = '화장품',
  maxPhotos = 3,
  onBack,
  onAddPhoto,
  onSave,
}: FillDrawerScreenProps) {
  const [productName, setProductName] = useState('롬앤 쥬시래스팅 틴트');
  const [purchaseDate, setPurchaseDate] = useState('2024. 03. 12. (화)');
  const [price, setPrice] = useState('13,000');
  const [memo, setMemo] = useState('발색이 자연스럽고 지속력이 좋아요.');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const hasPhoto = photoUris.length > 0;
  const activePhoto = photoUris[activeIndex] ?? photoUris[0];

  const handleAddPhoto = () => {
    onAddPhoto?.();
    if (photoUris.length < maxPhotos) {
      setPhotoUris((prev) => [...prev, QA_FIXTURE_PHOTO]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex(0);
  };

  return (
    <main className="fd-screen">
      <ScreenHeader variant="stacked" title={`${drawerName} 서랍 채우기`} onBack={onBack} height={91} />

      <section className="fd-content">
        {hasPhoto ? (
          <section className="fd-photo-card" aria-label="등록한 사진">
            <img className="fd-photo" src={activePhoto} alt="등록한 보관품 사진" />
            <button
              type="button"
              className="fd-remove"
              onClick={() => handleRemovePhoto(activeIndex)}
              aria-label="현재 사진 삭제"
            >×</button>
            <span className="fd-count">{activeIndex + 1} / {maxPhotos}</span>
          </section>
        ) : (
          <button type="button" className="fd-photo-empty" onClick={handleAddPhoto} aria-label="사진 추가">
            <img src="/assets/states/photo/state_photo_empty.webp" alt="" />
          </button>
        )}

        {hasPhoto && photoUris.length > 1 && (
          <div className="fd-thumbs" aria-label="등록한 사진 목록">
            {photoUris.map((uri, index) => (
              <button
                type="button"
                key={`${uri}-${index}`}
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => setActiveIndex(index)}
              >
                <img src={uri} alt="" />
              </button>
            ))}
          </div>
        )}

        {photoUris.length < maxPhotos && (
          <button type="button" className="fd-photo-add" onClick={handleAddPhoto}>
            <img src="/assets/field-types/field_photo.webp" alt="" />
            <span>{hasPhoto ? '사진 더 담기' : '사진 추가하기'}</span>
          </button>
        )}

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
          onClick={() => onSave?.({ productName, purchaseDate, price, memo, photoUris })}
        >
          담기
        </button>
      </section>
    </main>
  );
}
