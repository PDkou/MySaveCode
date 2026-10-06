import { Modal } from './Modal';
import { useI18n } from '../i18n';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
          {confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}
