import { SETTINGS_ROWS, type SettingsHomeAction } from '../screens/SettingsHomeScreen';
import { t, K } from '../i18n';

/**
 * Settings (#38) for landscape windows: the same rows as the approved list (same icons, titles and texts), laid out as a
 * grid of cards that fills the window. A card opens that settings screen, magnified, with its own back arrow returning here.
 */
export function WideSettingsGrid(props: SettingsHomeAction) {
  const handlers: Record<(typeof SETTINGS_ROWS)[number]['key'], (() => void) | undefined> = {
    premium: props.onPremium, theme: props.onTheme, security: props.onSecurity, data: props.onData, language: props.onLanguage,
    help: props.onHelp, info: props.onInfo, feedback: props.onFeedback,
  };
  return (
    <section className="wsg">
      <header className="wsg-head">
        <div className="wsg-brand">
          <img src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" draggable={false} />
          <p>{t('나만의 소중한 것들을, 더 특별하게')}</p>
        </div>
        <h1>{t('설정')}</h1>
        <div className="wsg-hero">
          <h2>{t('Drawary 설정')}</h2>
          <p>{t('앱의 분위기와 데이터, 보안을 한곳에서 관리할 수 있어요.')}</p>
        </div>
      </header>
      <div className="wsg-grid">
        {SETTINGS_ROWS.map((row) => (
          <button key={row.key} type="button" className="wsg-card" onClick={handlers[row.key]}>
            <span className="wsg-icon"><img src={`/assets/ui-icons/${row.icon}`} alt="" /></span>
            <span className="wsg-copy"><strong>{t(row.title)}</strong><span>{t(row.key === 'premium' && props.premium ? K('서랍장이 활짝 열려 있어요. 고마워요!') : row.desc)}</span></span>
            <span className="wsg-chev" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}
