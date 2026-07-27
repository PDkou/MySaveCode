import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useFamily, FamilyActionError } from '../context/FamilyContext';

interface FamilyOnboardingFormsProps {
  onSuccess?: () => void;
}

export function FamilyOnboardingForms({ onSuccess }: FamilyOnboardingFormsProps) {
  const { t } = useTranslation();
  const { createFamily, joinFamily } = useFamily();

  const [familyName, setFamilyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErrorKey, setCreateErrorKey] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinErrorKey, setJoinErrorKey] = useState<string | null>(null);

  // Pre-fills the join code when this screen was reached by scanning an
  // invite QR (see InviteQrModal) -- never auto-submits, the user still
  // taps "참여하기" to confirm.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedCode = params.get('joinCode');
    if (scannedCode) {
      setInviteCode(scannedCode.toUpperCase());
      params.delete('joinCode');
      const newSearch = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    }
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateErrorKey(null);
    if (!familyName.trim()) {
      setCreateErrorKey('family.error.nameRequired');
      return;
    }
    setCreating(true);
    try {
      await createFamily(familyName.trim());
      setFamilyName('');
      onSuccess?.();
    } catch (err) {
      setCreateErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinErrorKey(null);
    if (!inviteCode.trim()) {
      setJoinErrorKey('family.error.codeRequired');
      return;
    }
    setJoining(true);
    try {
      await joinFamily(inviteCode.trim());
      setInviteCode('');
      onSuccess?.();
    } catch (err) {
      setJoinErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="family-setup-grid">
      <form className="card" onSubmit={handleCreate}>
        <h3>{t('family.createHeading')}</h3>
        <label className="field">
          <span>{t('family.createNameLabel')}</span>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder={t('family.createNamePlaceholder')}
            maxLength={60}
          />
        </label>
        {createErrorKey && <p className="form-error" role="alert">{t(createErrorKey)}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
          {creating ? t('family.creating') : t('family.createButton')}
        </button>
      </form>

      <form className="card" onSubmit={handleJoin}>
        <h3>{t('family.joinHeading')}</h3>
        <label className="field">
          <span>{t('family.joinCodeLabel')}</span>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder={t('family.joinCodePlaceholder')}
            maxLength={8}
            className="mono-input"
            autoCapitalize="characters"
          />
        </label>
        {joinErrorKey && <p className="form-error" role="alert">{t(joinErrorKey)}</p>}
        <button type="submit" className="btn btn-secondary btn-block" disabled={joining}>
          {joining ? t('family.joining') : t('family.joinButton')}
        </button>
      </form>
    </div>
  );
}
