import { ScreenHeader } from '../components/ScreenHeader';
import './HelpMainScreen.css';

export interface HelpMainScreenProps {
  onBack?: () => void;
  onOpenFaq?: (topic?: string) => void;
  onOpenGuide?: () => void;
}

/**
 * #55 도움말 메인. Ported from
 * `Drawary_55_HELP_MAIN_CANDIDATE_2026-10-14`'s `index.html`.
 * README.md: historical layout reconstruction, not a new redesign;
 * source assets preserved intact. Back -> #38 (설정); "자주 묻는 질문"
 * card -> #56; "사용 가이드" card -> #57; both quick-help rows -> #56
 * with a specific topic deep-link (`data-storage`/`backup-restore`),
 * matching the archive's own `routeMap`.
 */
export function HelpMainScreen({ onBack, onOpenFaq, onOpenGuide }: HelpMainScreenProps) {
  return (
    <main className="help55-screen" aria-label="도움말 메인">
      <ScreenHeader title="도움말" onBack={onBack} height={71} />
      <div className="help55-content">
        <section className="help55-hero" aria-label="도움말 안내">
          <p className="help55-eyebrow">무엇이 궁금한가요?</p>
          <h1>필요한 도움을<br />빠르게 찾아보세요.</h1>
          <p>궁금한 내용을 선택하면<br />필요한 안내를 확인할 수 있어요.</p>
          <img src="/assets/mascot/mascot_help_approved.webp" alt="손을 흔드는 Drawary 마스코트" />
        </section>
        <nav className="help55-main-options" aria-label="도움말 메뉴">
          <button className="help55-menu-card" type="button" onClick={() => onOpenFaq?.()}>
            <span className="help55-icon-holder"><img src="/assets/ui-icons/help_question_final.webp" alt="" /></span>
            <span className="help55-card-copy"><span className="help55-card-title">자주 묻는 질문</span><span className="help55-card-desc">자주 궁금해하는 내용을<br />빠르게 확인해요.</span></span>
            <span className="help55-chevron" aria-hidden="true" />
          </button>
          <button className="help55-menu-card" type="button" onClick={onOpenGuide}>
            <span className="help55-icon-holder"><img src="/assets/ui-icons/help_list_final.webp" alt="" /></span>
            <span className="help55-card-copy"><span className="help55-card-title">사용 가이드</span><span className="help55-card-desc">Drawary의 주요 기능을<br />그림으로 쉽게 알아봐요.</span></span>
            <span className="help55-chevron" aria-hidden="true" />
          </button>
        </nav>
        <div className="help55-quick-label">빠른 도움말</div>
        <nav className="help55-quick-list" aria-label="빠른 도움말">
          <button className="help55-quick-item" type="button" onClick={() => onOpenFaq?.('data-storage')}>
            <span>내 데이터는 어디에 저장되나요?</span><span className="help55-chevron" aria-hidden="true" />
          </button>
          <button className="help55-quick-item" type="button" onClick={() => onOpenFaq?.('backup-restore')}>
            <span>백업과 복원은 어디에서 하나요?</span><span className="help55-chevron" aria-hidden="true" />
          </button>
        </nav>
        <p className="help55-footnote">필요한 내용을 찾지 못했다면 설정의 피드백에서 알려주세요.</p>
      </div>
    </main>
  );
}
