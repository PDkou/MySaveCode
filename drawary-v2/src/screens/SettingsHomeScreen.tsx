import './SettingsHomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';

// Ported from #38's V22 candidate `SettingsHome.tsx`
// (source_code_verification: CANDIDATE_SOURCE_NEEDS_PARITY). Per
// DRAWARY_CLAUDE_ISSUES_RESOLUTION_2026-10-15.md's #38 ruling: body from
// the V22 candidate, footer unified to the one real confirmed V4 navbar.
//
// The candidate embeds its own `<BottomNavFinalConfirmed>` call, but a
// byte diff against this repo's already-integrated nav component shows
// they are NOT the same lineage: the candidate's copy is the
// 2026-10-09 "CONFIRMED_SHARED_BOTTOM_NAV" family (raster per-tab label
// overlay images, class prefix drawary-confirmed-bottom-nav, base asset
// footer_neutral.webp), while this repo's component -- already
// integrated at V2-08, before this screen -- is the 2026-10-13
// "CONFIRMED_SHARED_BOTTOM_NAV_V4_DYNAMIC" family (live DOM text labels,
// class prefix drawary-dynamic-bottom-nav, base asset
// footer_background_plus_only.webp), which is what CLAUDE.md rule 6
// names explicitly as "V4" and "already built... never redesign." The
// later-dated V4_DYNAMIC wins per the resolution doc's own source
// priority (GitHub V2's confirmed shared V4 navbar outranks an older
// per-screen candidate's bundled copy). So: this screen renders no nav at
// all -- App.tsx supplies the real one externally, same as #03/#04/#05.
export interface SettingsHomeAction {
  onTheme?: () => void;
  onSecurity?: () => void;
  onData?: () => void;
  onLanguage?: () => void;
  onHelp?: () => void;
  onInfo?: () => void;
  onFeedback?: () => void;
}

const ROWS = [
  { key: 'theme', icon: 'icon_theme.webp', title: '테마 설정', desc: '앱의 분위기와 강조 색상을 바꿔요.' },
  { key: 'security', icon: 'icon_lock.webp', title: '보안 설정', desc: '앱 잠금과 생체 인증을 관리해요.' },
  { key: 'data', icon: 'icon_upload.webp', title: '데이터 관리', desc: '백업, 복원, 데이터 초기화를 관리해요.' },
  { key: 'language', icon: 'icon_language.webp', title: '언어 설정', desc: '한국어 · 日本語 · English' },
  { key: 'help', icon: 'icon_help.webp', title: '도움말', desc: 'FAQ와 사용 가이드를 확인해요.' },
  { key: 'info', icon: 'icon_info.webp', title: '정보', desc: '버전, 약관, 오픈소스 정보를 확인해요.' },
  { key: 'feedback', icon: 'icon_edit.webp', title: '피드백', desc: '개선 제안이나 오류를 알려주세요.' },
] as const;

export function SettingsHomeScreen(props: SettingsHomeAction) {
  const handlers: Record<(typeof ROWS)[number]['key'], (() => void) | undefined> = {
    theme: props.onTheme,
    security: props.onSecurity,
    data: props.onData,
    language: props.onLanguage,
    help: props.onHelp,
    info: props.onInfo,
    feedback: props.onFeedback,
  };

  return (
    <FixedCanvas height={750}>
      <div className="settings-home-screen">
        <header className="settings-home-header">
          <div className="settings-home-title">설정</div>
        </header>

        <section className="settings-home-hero">
          <h2>Drawary 설정</h2>
          <p>앱의 분위기와 데이터, 보안을 한곳에서 관리할 수 있어요.</p>
        </section>

        <section className="settings-home-list">
          {ROWS.map(row => (
            <button className="settings-home-row" type="button" key={row.key} onClick={handlers[row.key]}>
              <span className="settings-home-iconbox"><img src={`/assets/ui-icons/${row.icon}`} alt="" /></span>
              <span className="settings-home-copy"><strong>{row.title}</strong><span>{row.desc}</span></span>
              <span className="settings-home-chev">›</span>
            </button>
          ))}
        </section>
      </div>
    </FixedCanvas>
  );
}
