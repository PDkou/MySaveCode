import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface HelpSection {
  title: string;
  body: string;
}

export function HelpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sections = t('help.sections', { returnObjects: true }) as HelpSection[];

  return (
    <div className="screen help-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
        <h1 className="help-heading">{t('help.heading')}</h1>
      </div>

      <div className="help-list">
        {sections.map((section, i) => (
          <details key={section.title} className="help-section" open={i === 0}>
            <summary className="help-section-title">{section.title}</summary>
            <p className="help-section-body">{section.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
