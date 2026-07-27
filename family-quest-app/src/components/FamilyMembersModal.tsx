import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { FamilyActionError, useFamily } from '../context/FamilyContext';
import { AvatarChip } from './AvatarChip';
import { ConfirmModal } from './ConfirmModal';

interface FamilyMembersModalProps {
  onClose: () => void;
}

export function FamilyMembersModal({ onClose }: FamilyMembersModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { family, members, avatarUrlByUserId, leaveFamily, removeMember, regenerateInviteCode } = useFamily();
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const isOwner = myRole === 'owner';

  const handleLeave = async () => {
    if (!family) return;
    setConfirmLeave(false);
    setBusy(true);
    setErrorKey(null);
    try {
      await leaveFamily(family.id);
      onClose();
      navigate('/', { replace: true });
    } catch (err) {
      setErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    if (!family) return;
    setConfirmRemoveId(null);
    setBusy(true);
    setErrorKey(null);
    try {
      await removeMember(family.id, targetUserId);
    } catch (err) {
      setErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!family) return;
    setConfirmRegenerate(false);
    setBusy(true);
    setErrorKey(null);
    try {
      await regenerateInviteCode(family.id);
    } catch (err) {
      setErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('family.membersHeading')}</h2>

        <ul className="family-member-list">
          {members.map((member) => (
            <li key={member.user_id} className="family-member-row">
              <span className="family-member-info">
                <AvatarChip name={member.display_name} size={28} photoUrl={avatarUrlByUserId.get(member.user_id)} />
                <span>
                  {member.display_name}
                  {member.role === 'owner' && <span className="family-member-owner-tag"> · {t('family.ownerTag')}</span>}
                </span>
              </span>
              {isOwner && member.user_id !== user?.id && (
                <button
                  type="button"
                  className="family-member-remove"
                  onClick={() => setConfirmRemoveId(member.user_id)}
                  disabled={busy}
                >
                  {t('family.removeMember')}
                </button>
              )}
            </li>
          ))}
        </ul>

        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

        {isOwner && (
          <button
            type="button"
            className="settings-row-button"
            onClick={() => setConfirmRegenerate(true)}
            disabled={busy}
          >
            {t('family.regenerateInviteCode')}
          </button>
        )}

        <button
          type="button"
          className="settings-row-button settings-row-danger"
          onClick={() => setConfirmLeave(true)}
          disabled={busy}
        >
          {t('family.leaveFamily')}
        </button>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>

      {confirmLeave && (
        <ConfirmModal
          message={t('family.leaveFamilyConfirm')}
          confirmLabel={t('family.leaveFamily')}
          onConfirm={() => void handleLeave()}
          onCancel={() => setConfirmLeave(false)}
        />
      )}

      {confirmRemoveId && (
        <ConfirmModal
          message={t('family.removeMemberConfirm')}
          confirmLabel={t('family.removeMember')}
          onConfirm={() => void handleRemove(confirmRemoveId)}
          onCancel={() => setConfirmRemoveId(null)}
        />
      )}

      {confirmRegenerate && (
        <ConfirmModal
          message={t('family.regenerateInviteCodeConfirm')}
          confirmLabel={t('family.regenerateInviteCode')}
          onConfirm={() => void handleRegenerate()}
          onCancel={() => setConfirmRegenerate(false)}
        />
      )}
    </div>
  );
}
