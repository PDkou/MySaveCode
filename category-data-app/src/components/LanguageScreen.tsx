import { BackIcon } from './icons';
import { useI18n, type Locale } from '../i18n';

interface LanguageScreenProps {
  onBack: () => void;
}

const LANGUAGES: Locale[] = ['ko', 'ja', 'en'];

export function LanguageScreen({ onBack }: LanguageScreenProps) {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="screen language-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('common.back')}>
          <BackIcon />
        </button>
        <h1>{t('language.title')}</h1>
      </header>

      <div className="screen-content language-screen-content">
        <div className="language-intro">
          <p>{t('language.subtitle')}</p>
        </div>

        <div className="language-card-list" role="radiogroup" aria-label={t('language.title')}>
          {LANGUAGES.map((code) => {
            const selected = locale === code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`language-card language-card-${code} ${selected ? 'selected' : ''}`}
                onClick={() => setLocale(code)}
              >
                <div className="language-mascot-wrap" aria-hidden="true">
                  <img src="/icons/icon-512.png" alt="" className="language-mascot-placeholder" />
                  <span className="language-asset-note">{t(`language.${code}ArtNote`)}</span>
                </div>

                <div className="language-card-copy">
                  <strong>{t(`language.${code}`)}</strong>
                  <span>{t(`language.${code}Desc`)}</span>
                </div>

                <span className="language-check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="language-applied-note">
          <span className="language-info-mark" aria-hidden="true">i</span>
          <p>{t('language.applied')}</p>
        </div>
      </div>
    </div>
  );
}
