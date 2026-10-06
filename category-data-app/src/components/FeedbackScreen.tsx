import { useState, type FormEvent } from 'react';
import { BackIcon } from './icons';
import { useI18n } from '../i18n';

interface FeedbackScreenProps {
  onBack: () => void;
  contactEmail: string;
}

export function FeedbackScreen({ onBack, contactEmail }: FeedbackScreenProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(t('feedbackScreen.subject'));
    const body = encodeURIComponent(message.trim());
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="screen settings-detail-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('common.back')}>
          <BackIcon />
        </button>
        <h1>{t('feedbackScreen.title')}</h1>
      </header>

      <div className="screen-content">
        <section className="settings-detail-card">
          <h2>{t('feedbackScreen.promptTitle')}</h2>
          <p>{t('feedbackScreen.promptBody')}</p>
          <form className="settings-feedback-form" onSubmit={submit}>
            <label className="field-label" htmlFor="feedback-message">
              {t('feedbackScreen.messageLabel')}
            </label>
            <textarea
              id="feedback-message"
              className="text-input settings-feedback-textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('feedbackScreen.placeholder')}
              rows={7}
            />
            <button type="submit" className="btn btn-primary" disabled={!message.trim()}>
              {t('feedbackScreen.send')}
            </button>
          </form>
        </section>

        <p className="settings-detail-note">{t('feedbackScreen.emailNote', { email: contactEmail })}</p>
      </div>
    </div>
  );
}
