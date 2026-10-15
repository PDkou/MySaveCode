import './GuideScreen.css';

export type GuideRoute = 'new_drawer' | 'drawer_fields' | 'record_add' | 'table_view';

export interface GuideScreenProps {
  onBack?: () => void;
  onNavigate?: (route: GuideRoute) => void;
}

/**
 * #57 사용 가이드. Ported from `FINAL_STAGED_2026-10-14`'s `index.html`
 * -- README.md: 기존 확정 `08_guide_final`의 4단계 카드/색상/마스코트/
 * 경로 유지, 1단계는 `ui_add.webp` 강조, 2~4단계는 온보딩 에셋을 잘라
 * 재배치한 WebP 사용. New `guide_step2/3/4_focus.webp` + `ui_add.webp`
 * assets copied in from this archive.
 *
 * Each step's `data-route` names an existing screen already built in
 * this app (new_drawer/drawer_fields/record_add/table_view), not a
 * guess -- App.tsx maps these to the real `create-drawer`/
 * `drawer-fields`/`fill-drawer`/`table-view` routes, a genuine
 * integration rather than a no-op. Back -> #55.
 */
export function GuideScreen({ onBack, onNavigate }: GuideScreenProps) {
  return (
    <main className="guide57-screen" aria-label="Drawary 사용 가이드">
      <header className="guide57-appbar">
        <button className="guide57-back" type="button" aria-label="뒤로가기" onClick={onBack} />
        <span className="guide57-appbar-title">사용 가이드</span>
      </header>
      <div className="guide57-scroll">
        <section className="guide57-hero">
          <small>Drawary와 함께</small>
          <h1>나만의 소중한<br />서랍을 만들어보세요!</h1>
          <p>좋아하는 것들을 기록하고,<br />더 특별하게 간직할 수 있어요.</p>
          <img src="/assets/mascot/mascot_lean_on_drawer.webp" alt="서랍 위에서 인사하는 마스코트" />
        </section>
        <div className="guide57-steps" aria-label="사용 순서">
          <button className="guide57-step" type="button" aria-label="1. 서랍 만들기" onClick={() => onNavigate?.('new_drawer')}>
            <span className="guide57-step-image">
              <span className="guide57-step-number">1</span>
              <span className="guide57-step-1-visual">
                <span className="guide57-plus-halo"><img src="/assets/ui-icons/ui_add.webp" alt="" /></span>
                <span className="guide57-tap-label">+ 버튼을 눌러요</span>
              </span>
            </span>
            <span className="guide57-step-copy">
              <h2>서랍 만들기</h2>
              <p>정리하고 싶은 주제로<br />새 서랍을 만들어요.</p>
              <span className="guide57-step-path">홈 → + 버튼<br />→ 새 서랍 만들기</span>
            </span>
          </button>
          <button className="guide57-step" type="button" aria-label="2. 서랍 칸 정하기" onClick={() => onNavigate?.('drawer_fields')}>
            <span className="guide57-step-image guide57-step2">
              <span className="guide57-step-number">2</span>
              <span className="guide57-step-art-zoom"><img src="/assets/guide/guide_step2_focus.webp" alt="아이콘으로 서랍 칸을 정하는 안내 일러스트" /></span>
            </span>
            <span className="guide57-step-copy">
              <h2>서랍 칸 정하기</h2>
              <p>기록할 정보 칸을<br />자유롭게 정해요.</p>
              <span className="guide57-step-path">새 서랍 만들기<br />→ 서랍 칸 정하기</span>
            </span>
          </button>
          <button className="guide57-step" type="button" aria-label="3. 서랍 채우기" onClick={() => onNavigate?.('record_add')}>
            <span className="guide57-step-image guide57-step3">
              <span className="guide57-step-number">3</span>
              <span className="guide57-step-art-zoom"><img src="/assets/guide/guide_step3_focus.webp" alt="사진과 메모로 서랍을 채우는 안내 일러스트" /></span>
            </span>
            <span className="guide57-step-copy">
              <h2>서랍 채우기</h2>
              <p>보관품을 하나씩 추가해<br />내용을 채워요.</p>
              <span className="guide57-step-path">서랍 상세 → + 버튼<br />→ 서랍 채우기</span>
            </span>
          </button>
          <button className="guide57-step" type="button" aria-label="4. 표로 보기" onClick={() => onNavigate?.('table_view')}>
            <span className="guide57-step-image guide57-step4">
              <span className="guide57-step-number">4</span>
              <span className="guide57-step-art-zoom"><img src="/assets/guide/guide_step4_focus.webp" alt="카드와 표 형태로 내용을 보는 안내 일러스트" /></span>
            </span>
            <span className="guide57-step-copy">
              <h2>표로 보기</h2>
              <p>검색·정렬·필터와<br />CSV/PDF를 사용할 수 있어요.</p>
              <span className="guide57-step-path">서랍 상세<br />→ 표로 보기</span>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
