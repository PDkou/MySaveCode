import { useEffect, useState } from 'react';
import './InfoScreen.css';

export type InfoDestination = 'privacy' | 'terms' | 'licenses';

export interface InfoScreenProps {
  onBack?: () => void;
  onNavigate?: (destination: InfoDestination) => void;
}

/**
 * #58 정보. Ported from `FINAL_STAGED_2026-10-14`'s `index.html` --
 * the real version-info dialog logic (Escape-to-close, backdrop-click-
 * to-close, focus management) ported 1:1. New
 * `brand_symbol_flower_small.webp` asset copied in.
 *
 * The source's own comment is explicit: "We do not invent an app
 * version or document URL in the design preview" -- kept the exact
 * same placeholder copy ("앱 빌드 정보에서 표시") rather than making up
 * a version number. "개인정보 처리방침"/"이용약관"/"오픈소스 라이선스"
 * have no destination screen among the 59 approved designs, so those
 * three rows stay the caller's own no-op handler. Back -> #38.
 */
export function InfoScreen({ onBack, onNavigate }: InfoScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDialogOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  return (
    <main className="info58-screen" aria-label="Drawary 정보 화면">
      <header className="info58-appbar">
        <button className="info58-back" type="button" aria-label="이전 화면" onClick={onBack} />
        <span className="info58-appbar-title">정보</span>
      </header>
      <section className="info58-brand" aria-label="Drawary 브랜드 소개">
        <img className="info58-flower" src="/assets/brand/brand_symbol_flower_small.webp" alt="Drawary 꽃 로고" />
        <h1 className="info58-brand-name">Drawary</h1>
        <p className="info58-tagline">나만의 소중한 것들을,<br />더 특별하게 간직해요.</p>
        <button className="info58-version-chip" type="button" onClick={() => setDialogOpen(true)}>버전 정보</button>
      </section>
      <div className="info58-content">
        <h2 className="info58-section-label">앱 정보</h2>
        <section className="info58-card" aria-label="앱 정보 메뉴">
          <div className="info58-row"><span className="info58-item-name">현재 버전</span><span className="info58-current-version">앱 빌드 정보에서 표시</span></div>
          <button className="info58-row info58-row-action" type="button" onClick={() => onNavigate?.('privacy')}>
            <span className="info58-item-name">개인정보 처리방침</span><span className="info58-chevron" aria-hidden="true" />
          </button>
          <button className="info58-row info58-row-action" type="button" onClick={() => onNavigate?.('terms')}>
            <span className="info58-item-name">이용약관</span><span className="info58-chevron" aria-hidden="true" />
          </button>
          <button className="info58-row info58-row-action" type="button" onClick={() => onNavigate?.('licenses')}>
            <span className="info58-item-name">오픈소스 라이선스</span><span className="info58-chevron" aria-hidden="true" />
          </button>
        </section>
        <h2 className="info58-section-label info58-about-label">Drawary 소개</h2>
        <section className="info58-about-card">Drawary는 내가 필요한 방식으로 서랍을 만들고, 원하는 정보들을 자유롭게 기록할 수 있는 개인 정리 앱이에요.</section>
        <p className="info58-credit">Made by Howling Creative Studio</p>
      </div>
      {dialogOpen && (
        <div className="info58-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}>
          <section className="info58-dialog" role="dialog" aria-modal="true">
            <h2>버전 정보</h2>
            <p>실제 앱에서 빌드 버전을 표시해요.</p>
            <button type="button" onClick={() => setDialogOpen(false)}>확인</button>
          </section>
        </div>
      )}
    </main>
  );
}
