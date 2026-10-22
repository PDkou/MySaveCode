import './SettingsHomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';
import { t, K } from '../i18n';

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
  onPremium?: () => void;
  /** Premium is unlocked: the row says so instead of selling it. */
  premium?: boolean;
  onTheme?: () => void;
  onSecurity?: () => void;
  onData?: () => void;
  onLanguage?: () => void;
  onHelp?: () => void;
  onInfo?: () => void;
  onFeedback?: () => void;
}

export const SETTINGS_ROWS = [
  { key: 'premium', icon: '../drawer-icons/drawer_icon_gifts.webp', title: K('서랍장 키우기'), desc: K('서랍 무제한, 테마, 반복, 내보내기') },
  { key: 'theme', icon: 'icon_theme.webp', title: K('테마 설정'), desc: K('앱의 분위기와 강조 색상을 바꿔요.') },
  { key: 'security', icon: 'icon_lock.webp', title: K('보안 설정'), desc: K('앱 잠금과 생체 인증을 관리해요.') },
  { key: 'data', icon: 'icon_upload.webp', title: K('데이터 관리'), desc: K('백업, 복원, 데이터 초기화를 관리해요.') },
  { key: 'language', icon: 'icon_language.webp', title: K('언어 설정'), desc: K('한국어, 日本語, English') },
  { key: 'help', icon: 'icon_help.webp', title: K('도움말'), desc: K('FAQ와 사용 가이드를 확인해요.') },
  { key: 'info', icon: 'icon_info.webp', title: K('정보'), desc: K('버전, 약관, 오픈소스 정보를 확인해요.') },
  { key: 'feedback', icon: 'icon_edit.webp', title: K('피드백'), desc: K('개선 제안이나 오류를 알려주세요.') },
] as const;

export function SettingsHomeScreen(props: SettingsHomeAction) {
  const handlers: Record<(typeof SETTINGS_ROWS)[number]['key'], (() => void) | undefined> = {
    premium: props.onPremium,
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
          <img className="settings-home-brand" src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" draggable={false} />
          <p className="settings-home-tagline">{t('나만의 소중한 것들을, 더 특별하게')}</p>
          <h1 className="settings-home-title">{t('설정')}</h1>
        </header>

        <section className="settings-home-hero">
          <h2>{t('Drawary 설정')}</h2>
          <p>{t('앱의 분위기와 데이터, 보안을 한곳에서 관리할 수 있어요.')}</p>
        </section>

        <section className="settings-home-list">
          {SETTINGS_ROWS.map(row => (
            <button className="settings-home-row" type="button" key={row.key} onClick={handlers[row.key]}>
              <span className="settings-home-iconbox"><img src={`/assets/ui-icons/${row.icon}`} alt="" /></span>
              <span className="settings-home-copy"><strong>{t(row.title)}</strong><span>{t(row.key === 'premium' && props.premium ? K('서랍장이 활짝 열려 있어요. 고마워요!') : row.desc)}</span></span>
              <span className="settings-home-chev">›</span>
            </button>
          ))}
        </section>
      </div>
    </FixedCanvas>
  );
}
