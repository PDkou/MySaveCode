import { BackIcon } from './icons';
import { useI18n } from '../i18n';

interface InfoScreenProps {
  onBack: () => void;
  version: string;
}

export function InfoScreen({ onBack, version }: InfoScreenProps) {
  const { t } = useI18n();

  return (
    <div className="screen settings-detail-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('common.back')}>
          <BackIcon />
        </button>
        <h1>{t('infoScreen.title')}</h1>
      </header>

      <div className="screen-content">
        <section className="settings-detail-card settings-about-card">
          <h2>Drawary</h2>
          <p>{t('infoScreen.tagline')}</p>
          <div className="settings-about-row">
            <span>{t('infoScreen.version')}</span>
            <b>{version}</b>
          </div>
        </section>

        <section className="settings-detail-card">
          <h2>{t('infoScreen.storageTitle')}</h2>
          <p>{t('infoScreen.storageBody')}</p>
        </section>
      </div>
    </div>
  );
}
