import { useState } from 'react';
import './DrawerFieldEditScreen.css';

// Ported from Drawary_11_FINAL_CONFIRMED_CODE (CONFIRMED.md: 행 전체 탭 →
// 수정 / 손잡이 → 순서 변경 전용 / 숨겨진 스와이프 액션 사용 안 함).
//
// Reconstruction note: the archive's own TSX still implements an OLDER
// swipe-to-reveal interaction for one row ("category") and has no
// onClick on the other rows at all -- directly contradicting both
// CONFIRMED.md and README.md's "탭하면 수정" requirement, and contradicting
// its own paired CSS file, which carries a `/* V2: no hidden swipe
// actions */` comment introducing `.df-row-tap` (a full-row invisible tap
// button), `.df-row-edit-hint` (a per-row "›" hint) and `.df-row.is-editable`
// (a 5-column grid with room for that hint) -- none of which the given
// TSX ever renders. The CSS is the later revision; the bundled TSX is
// stale. List view below is rebuilt from the CSS's own class names/grid
// column count to match what "V2: no hidden swipe actions" actually
// describes, rather than porting the contradicted swipe-wrap markup.
// The edit/detail view below did NOT have this conflict (its classes all
// appear in both the TSX and CSS) and is ported as-is.
//
// Also fixed: the archive's icon paths (`/assets/field_*.webp`,
// `/assets/icon_*.webp`) don't match this app's actual asset layout
// (`/assets/field-types/...`, `/assets/ui-icons/...`) and a handful of
// literal `\n` escape sequences embedded as text in the source file
// (a mechanical corruption, not a design choice).
const FIELDS = [
  { id: 'product', name: '제품명', type: '글자', icon: '/assets/field-types/field_text.webp' },
  { id: 'brand', name: '브랜드', type: '글자', icon: '/assets/field-types/field_text.webp' },
  { id: 'category', name: '카테고리', type: '선택', icon: '/assets/field-types/field_select.webp' },
  { id: 'purchase', name: '구매일', type: '날짜', icon: '/assets/field-types/field_date.webp' },
  { id: 'price', name: '가격', type: '금액', icon: '/assets/field-types/field_currency.webp' },
  { id: 'rating', name: '별점', type: '별점', icon: '/assets/field-types/field_rating.webp' },
  { id: 'memo', name: '메모', type: '긴 글', icon: '/assets/field-types/field_edit_note.webp' },
];

export function DrawerFieldEditScreen() {
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [name, setName] = useState('카테고리');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState(['스킨케어', '메이크업', '향수']);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (mode === 'list') {
    return (
      <main className="df-screen">
        <header className="df-header">
          <button className="df-back" aria-label="뒤로가기">‹</button>
          <h1>서랍칸 정하기</h1>
        </header>
        <section className="df-content">
          <p className="df-intro">이 서랍에 어떤 내용을 기록할까요?<br />원하는 서랍칸을 직접 정할 수 있어요.</p>
          <p className="df-list-help"><b>서랍칸</b>을 누르면 수정할 수 있고,<br />오른쪽 <b>손잡이</b>를 끌면 순서를 바꿀 수 있어요.</p>
          <div className="df-list">
            {FIELDS.map((field) => (
              <div className="df-row is-editable" key={field.id}>
                <button className="df-row-tap" aria-label={`${field.name} 수정`} onClick={() => setMode('edit')} />
                <div className="df-main"><img src={field.icon} alt="" /><strong>{field.name}</strong></div>
                <span className="df-type">{field.type}</span>
                <span className="df-row-edit-hint" aria-hidden="true">›</span>
                <i className="df-divider" />
                <button className="df-handle" aria-label={`${field.name} 순서 변경`}><b /><b /><b /></button>
              </div>
            ))}
          </div>
          <button className="df-add">＋ 서랍칸 추가</button>
          <button className="df-complete">서랍 만들기 완료하기</button>
        </section>
      </main>
    );
  }

  return (
    <main className="df-screen">
      <header className="df-header">
        <button className="df-back" onClick={() => setMode('list')} aria-label="뒤로가기">‹</button>
        <h1>서랍칸 수정</h1>
      </header>
      <section className="df-edit-content">
        <label className="df-label" htmlFor="field-name">서랍칸 이름</label>
        <div className="df-input-wrap">
          <input id="field-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} />
          <span>{name.length}/20</span>
        </div>

        <span className="df-label">서랍칸 종류</span>
        <button className="df-selected-type">
          <span className="df-type-icon"><img src="/assets/field-types/field_select.webp" alt="" /></span>
          <span className="df-type-copy"><strong>선택</strong><small>여러 옵션 중 하나를 선택</small></span>
          <span className="df-chevron">›</span>
        </button>

        <section className="df-options">
          <h2>선택 옵션</h2>
          <div className="df-option-list">
            {options.map((option, index) => (
              <div className="df-option-row" key={index}>
                <input value={option} onChange={(e) => setOptions(options.map((v, i) => i === index ? e.target.value : v))} />
                <button onClick={() => setOptions(options.filter((_, i) => i !== index))}>−</button>
              </div>
            ))}
          </div>
          <button className="df-add-option" onClick={() => setOptions([...options, `옵션 ${options.length + 1}`])}>＋ 옵션 추가</button>
        </section>

        <div className="df-required">
          <div><strong>필수로 채우기</strong><small>보관품을 담을 때 꼭 채워야 하는 서랍칸이에요.</small></div>
          <button className={`df-switch${required ? ' is-on' : ''}`} onClick={() => setRequired(!required)}><span /></button>
        </div>

        <button className="df-save">저장하기</button>
        <button className="df-delete" onClick={() => setDeleteOpen(true)}><img src="/assets/ui-icons/icon_delete.webp" alt="" /> 서랍칸 삭제</button>
        <p className="df-edit-danger-note">삭제한 서랍칸의 기존 입력값은 함께 사라져요.</p>
        {deleteOpen && (
          <div className="df-modal-backdrop">
            <section className="df-confirm-sheet" role="dialog" aria-modal="true" aria-label="서랍칸 삭제 확인">
              <div className="df-sheet-handle" />
              <div className="df-confirm-icon"><img src="/assets/ui-icons/icon_delete.webp" alt="" /></div>
              <h2>이 서랍칸을 삭제할까요?</h2>
              <p>'카테고리' 서랍칸과 여기에 담긴 입력값이 함께 삭제돼요.<br />삭제한 뒤에는 되돌릴 수 없어요.</p>
              <div className="df-confirm-actions">
                <button className="df-cancel" onClick={() => setDeleteOpen(false)}>취소</button>
                <button className="df-confirm-delete">삭제하기</button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
