import { useTranslation } from 'react-i18next';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

// Every modal needs a way out that doesn't require scrolling down to the
// footer button -- most obviously the tall ones (NewTaskModal, shop/stats/
// tycoon), but consistency matters more than any single modal's height
// here, so every modal with a heading gets the same top-right X.
export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-header">
      <h2>{title}</h2>
      <button type="button" className="btn btn-ghost btn-icon btn-sm modal-close-btn" onClick={onClose} aria-label={t('common.close')}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
