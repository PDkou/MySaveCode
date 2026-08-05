import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSmartBack } from '../lib/backNav';

interface HelpSection {
  title: string;
  body: string;
}

export function HelpPage() {
  const { t } = useTranslation();
  const goBack = useSmartBack('/');
  const sections = t('help.sections', { returnObjects: true }) as HelpSection[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="screen help-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={goBack}>
          {t('common.back')}
        </button>
        <h1 className="help-heading">{t('help.heading')}</h1>
      </div>

      <div className="help-list">
        {sections.map((section, i) => (
          <details key={section.title} className="help-section" open={openIndex === i}>
            {/* preventDefault so the browser's native toggle never fires --
                open/closed state is fully driven by openIndex below, which
                is how only one section stays open at a time. */}
            <summary
              className="help-section-title"
              onClick={(e) => {
                e.preventDefault();
                setOpenIndex(openIndex === i ? null : i);
              }}
            >
              {section.title}
            </summary>
            <p className="help-section-body">{section.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
