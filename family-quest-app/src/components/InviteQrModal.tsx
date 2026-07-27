import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

interface InviteQrModalProps {
  inviteCode: string;
  onClose: () => void;
}

// Encodes a join link (not just the bare code) so scanning it pre-fills
// the join form on whatever device scans it -- see the joinCode query
// param handling in FamilyOnboardingForms.
export function InviteQrModal({ inviteCode, onClose }: InviteQrModalProps) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const joinUrl = `${window.location.origin}/?joinCode=${inviteCode}`;
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, { width: 240, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('family.qrHeading')}</h2>
        <div className="invite-qr-wrap">
          {dataUrl && <img src={dataUrl} alt={inviteCode} className="invite-qr-image" />}
          <p className="invite-qr-code">{inviteCode}</p>
          <p className="invite-qr-hint">{t('family.qrHint')}</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
