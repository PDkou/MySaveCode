import { useEffect, useRef, useState } from 'react';
import './OnboardingScreen.css';
import { t, tl } from '../i18n';

// Ported from the user-approved
// Drawary_02_ONBOARDING_FINAL_CONFIRMED/OnboardingScreen_FINAL_CONFIRMED.tsx
// (confirmed 2026-10-08). Only the asset path changed, from the archive's
// relative `./icons/drawary/onboarding/final/` to this app's
// `/assets/onboarding/final/` convention -- same treatment #01 splash got.
//
// Bug fix (DRAWARY_CLAUDE_ISSUES_RESOLUTION_2026-10-15): the archive's own
// README/CONFIRMED_STATUS both promised "키보드 ←→ 이동" but the confirmed
// TSX shipped with no keyboard handler at all. Resolution doc's verdict:
// implement and test the arrow-key behavior rather than leave the gap.
// Added below, reusing the exact same prev/next used by the nav buttons
// and the swipe gesture, so all three input paths share one bounds-safe
// step function -- no new navigation semantics invented.
const SLIDES = [
  { id: 'intro', title: <>{tl('나만의 소중한 것들을,\n더 특별하게')}</>, body: <>{tl('Drawary와 함께\n일상을 기록해보세요.')}</> },
  { id: 'create', title: <>{t('나만의 서랍을 만들어보세요')}</>, body: <>{tl('좋아하는 주제로 서랍을 만들고\n소중한 것들을 정리할 수 있어요.')}</> },
  { id: 'fields', title: <>{t('아이콘으로 서랍을 꾸며보세요')}</>, body: <>{tl('다양한 아이콘 중에서\n내 서랍에 어울리는 아이콘을 선택하세요.')}</> },
  { id: 'fill', title: <>{t('소중한 것들을 채워보세요')}</>, body: <>{tl('사진, 메모, 링크 등\n다양한 방식으로 기록할 수 있어요.')}</> },
  { id: 'views', title: <>{t('원하는 방식으로 둘러보세요')}</>, body: <>{tl('카드 보기, 표 보기 등\n나에게 맞는 방식으로 기록을 확인할 수 있어요.')}</> },
  { id: 'reminder', title: <>{t('중요한 일을 놓치지 않도록')}</>, body: <>{tl('원하는 시간에 알림을 설정하고\n소중한 일정을 챙길 수 있어요.')}</> },
  { id: 'backup', title: <>{t('소중한 기록을 안전하게')}</>, body: <>{tl('클라우드 백업으로\n언제 어디서나 안전하게 보관할 수 있어요.')}</> },
  { id: 'complete', title: <>{t('이제, 당신의 이야기를 시작해보세요')}</>, body: <>{tl('Drawary가\n언제나 함께할게요.')}</> },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(SLIDES.length - 1, i + 1));
  const finish = () => {
    try { localStorage.setItem('drawary_onboarding_done', '1'); } catch { /* storage unavailable */ }
    onDone();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <div className="onboarding-screen">
    <section className={`onboarding-card ${last ? 'complete' : ''}`}
      onTouchStart={e => { startX.current = e.changedTouches[0].clientX; }}
      onTouchEnd={e => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) < 40) return;
        dx < 0 ? next() : prev();
      }}>
      <img className="onboarding-art" src={`/assets/onboarding/final/${slide.id}.webp`} alt="" />
      <div className="onboarding-copy"><h1>{slide.title}</h1><p>{slide.body}</p></div>
      {!last && index === 0 && <button className="onboarding-skip" onClick={finish}>{t('건너뛰기')}</button>}
      {!last && index > 0 && <button className="onboarding-nav prev" onClick={prev} aria-label={t('이전')}>‹</button>}
      {!last && <div className="onboarding-progress">{SLIDES.map((_, i) => <span key={i} className={`onboarding-dot ${i === index ? 'active' : ''}`} />)}</div>}
      {!last && <button className="onboarding-nav next" onClick={next} aria-label={t('다음')}>›</button>}
      {last && <button className="onboarding-start" onClick={finish}>{t('시작하기')}</button>}
    </section>
  </div>;
}
