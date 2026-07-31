import { useTranslation } from 'react-i18next';

import { FamilyOnboardingForms } from './FamilyOnboardingForms';
import { ModalHeader } from './ModalHeader';

interface AddFamilyModalProps {
  onClose: () => void;
}

export function AddFamilyModal({ onClose }: AddFamilyModalProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={t('family.addAnotherHeading')} onClose={onClose} />
        <FamilyOnboardingForms onSuccess={onClose} />
        <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
