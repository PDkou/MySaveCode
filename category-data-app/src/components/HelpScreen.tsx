import { BackIcon } from './icons';
import { useI18n } from '../i18n';

interface HelpScreenProps {
  onBack: () => void;
  contactEmail: string;
}

export function HelpScreen({ onBack, contactEmail }: HelpScreenProps) {
  const { t } = useI18n();

  return (
    <div className="screen settings-detail-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('common.back')}>
          <BackIcon />
        </button>
        <h1>{t('helpScreen.title')}</h1>
      </header>

      <div className="screen-content">
        <section className="settings-detail-card">
          <h2>{t('helpScreen.guideTitle')}</h2>
          <p>{t('helpScreen.guideBody')}</p>
          <ol className="settings-guide-list">
            <li>{t('helpScreen.guideStep1')}</li>
            <li>{t('helpScreen.guideStep2')}</li>
            <li>{t('helpScreen.guideStep3')}</li>
          </ol>
        </section>

        <section className="settings-detail-card">
          <h2>{t('helpScreen.faqTitle')}</h2>
          <details className="settings-faq">
            <summary>{t('helpScreen.faqStorageQ')}</summary>
            <p>{t('helpScreen.faqStorageA')}</p>
          </details>
          <details className="settings-faq">
            <summary>{t('helpScreen.faqBackupQ')}</summary>
            <p>{t('helpScreen.faqBackupA')}</p>
          </details>
        </section>

        <section className="settings-detail-card">
          <h2>{t('helpScreen.contactTitle')}</h2>
          <p>{t('helpScreen.contactBody')}</p>
          <a className="btn btn-secondary settings-detail-action" href={`mailto:${contactEmail}`}>
            {t('helpScreen.contactAction')}
          </a>
        </section>
      </div>
    </div>
  );
}
