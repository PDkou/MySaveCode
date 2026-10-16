import { ScreenHeader } from '../components/ScreenHeader';
import './DataManagementHubScreen.css';

export interface DataManagementHubScreenProps {
  onBack?: () => void;
  onBackup?: () => void;
  onRestore?: () => void;
  onReset?: () => void;
}

/**
 * #44 데이터 관리 허브. Ported from
 * `Drawary_44_DATA_MANAGEMENT_HUB_CONFIRMED_2026-10-13`'s `index.html`
 * -- same header/hero/items shell as #40/#41, plus #44's own
 * `.secondary-section`/danger-item styling for "데이터 초기화".
 * README.md: 38/40 확정 디자인 계승, 기존 02A WebP 5개 사용, 메뉴
 * 이동은 현재 프리뷰용 (백업→#45, 복원→#49, 초기화→#53). None of
 * #45/#49/#53 exist yet, so those three rows stay the caller's own
 * no-op handler, same reasoning as other not-yet-built destinations.
 * Back -> #38 (설정 홈), per the archive's own `data-back="38"`.
 */
export function DataManagementHubScreen({ onBack, onBackup, onRestore, onReset }: DataManagementHubScreenProps) {
  return (
    <div className="dmh44-screen">
      <ScreenHeader title="데이터 관리" onBack={onBack} backLabel="설정으로 돌아가기" height={85} />
      <main className="dmh44-panel">
        <h2 className="dmh44-section-title">내 기록 관리하기</h2>
        <section className="dmh44-hero" aria-label="기록 관리 안내">
          <div className="dmh44-hero-art"><img src="/assets/mascot/mascot_default.webp" alt="" /></div>
          <div className="dmh44-hero-copy">
            <strong>소중한 기록을 안전하게</strong>
            <span>백업한 파일을 보관해 두면<br />필요할 때 다시 가져올 수 있어요.</span>
          </div>
        </section>
        <nav className="dmh44-items" aria-label="백업과 복원">
          <button type="button" className="dmh44-item" aria-label="백업하기, 백업 종류 선택 화면으로" onClick={onBackup}>
            <span className="dmh44-item-icon"><img src="/assets/ui-icons/icon_save.webp" alt="" /></span>
            <span className="dmh44-item-copy"><strong>백업하기</strong><small>서랍과 기록을 파일로 저장해요.</small></span>
            <span className="dmh44-right-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="dmh44-item" aria-label="복원하기, 복원 파일 선택 화면으로" onClick={onRestore}>
            <span className="dmh44-item-icon"><img src="/assets/ui-icons/icon_import.webp" alt="" /></span>
            <span className="dmh44-item-copy"><strong>복원하기</strong><small>저장해 둔 백업 파일을 불러와요.</small></span>
            <span className="dmh44-right-arrow" aria-hidden="true" />
          </button>
        </nav>
        <section className="dmh44-secondary-section" aria-label="데이터 초기화">
          <h3 className="dmh44-secondary-title">데이터 정리</h3>
          <div className="dmh44-items dmh44-danger-items">
            <button type="button" className="dmh44-item dmh44-danger" aria-label="데이터 초기화 확인 화면으로" onClick={onReset}>
              <span className="dmh44-item-icon"><img src="/assets/ui-icons/icon_delete.webp" alt="" /></span>
              <span className="dmh44-item-copy"><strong>데이터 초기화</strong><small>기기에 저장된 기록을 모두 삭제해요.</small></span>
              <span className="dmh44-right-arrow" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
