import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useFamily, FamilyActionError } from '../context/FamilyContext';
import type { FamilyRoomType } from '../types/database';

interface FamilyOnboardingFormsProps {
  onSuccess?: () => void;
}

export function FamilyOnboardingForms({ onSuccess }: FamilyOnboardingFormsProps) {
  const { t } = useTranslation();
  const { createFamily, joinFamily } = useFamily();

  const [familyName, setFamilyName] = useState('');
  const [roomType, setRoomType] = useState<FamilyRoomType>('family');
  const [creating, setCreating] = useState(false);
  const [createErrorKey, setCreateErrorKey] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinErrorKey, setJoinErrorKey] = useState<string | null>(null);

  const [startingPersonal, setStartingPersonal] = useState(false);
  const [personalErrorKey, setPersonalErrorKey] = useState<string | null>(null);

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
      await createFamily(familyName.trim(), roomType);
      setFamilyName('');
      onSuccess?.();
    } catch (err) {
      setCreateErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setCreating(false);
    }
  };

  // Every "family" is really just a shared task room -- nothing about the
  // schema forces a second member. This skips the naming step entirely so
  // someone who just wants their own private list isn't stuck filling out
  // a "family name" field to get one (name can still be edited later from
  // settings, same as any family room).
  const handleStartPersonal = async () => {
    setPersonalErrorKey(null);
    setStartingPersonal(true);
    try {
      await createFamily(t('family.personalDefaultName'));
      onSuccess?.();
    } catch (err) {
      setPersonalErrorKey(err instanceof FamilyActionError ? err.translationKey : 'family.error.unknown');
    } finally {
      setStartingPersonal(false);
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
      <div className="card family-personal-card">
        <h3>{t('family.personalHeading')}</h3>
        <p className="family-personal-desc">{t('family.personalDescription')}</p>
        {personalErrorKey && <p className="form-error" role="alert">{t(personalErrorKey)}</p>}
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => void handleStartPersonal()}
          disabled={startingPersonal}
        >
          {startingPersonal ? t('family.personalStarting') : t('family.personalButton')}
        </button>
      </div>

      <div className="family-setup-divider">
        <span>{t('family.orDivider')}</span>
      </div>

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
        <div className="field">
          <span>{t('family.purposeLabel')}</span>
          <div className="family-purpose-toggle" role="radiogroup" aria-label={t('family.purposeLabel')}>
            <button
              type="button"
              role="radio"
              aria-checked={roomType === 'family'}
              className={`family-purpose-option ${roomType === 'family' ? 'family-purpose-option-active' : ''}`}
              onClick={() => setRoomType('family')}
            >
              {t('family.purposeFamily')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={roomType === 'business'}
              className={`family-purpose-option ${roomType === 'business' ? 'family-purpose-option-active' : ''}`}
              onClick={() => setRoomType('business')}
            >
              {t('family.purposeBusiness')}
            </button>
          </div>
        </div>
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
