import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfettiBurst } from './ConfettiBurst';
import { BADGE_EMOJI } from '../lib/gamification';
import type { CompletionResult } from '../lib/gamification';

const AUTO_DISMISS_MS = 3200;

interface CelebrationOverlayProps {
  result: CompletionResult;
  onDismiss: () => void;
}

export function CelebrationOverlay({ result, onDismiss }: CelebrationOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const message = useMemo(() => {
    const messages = t('celebration.messages', { returnObjects: true }) as string[];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [t]);

  return (
    <div className="celebration-backdrop" onClick={onDismiss} role="presentation">
      <ConfettiBurst />
      <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
        <p className="celebration-message">{message}</p>
        <p className="celebration-points">{t('celebration.pointsGained', { points: result.pointsGained })}</p>

        {result.leveledUp && (
          <p className="celebration-levelup">{t('celebration.levelUp', { level: result.newLevel })}</p>
        )}

        {result.streakIncreased && result.newStreak >= 2 && (
          <p className="celebration-streak">{t('celebration.streak', { count: result.newStreak })}</p>
        )}

        {result.newBadges.length > 0 && (
          <div className="celebration-badges">
            <p className="celebration-badges-heading">{t('celebration.newBadgeHeading')}</p>
            <div className="celebration-badges-row">
              {result.newBadges.map((key) => (
                <span key={key} className="celebration-badge">
                  <span className="celebration-badge-emoji">{BADGE_EMOJI[key]}</span>
                  {t(`badges.${key}.name`)}
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block celebration-dismiss" onClick={onDismiss}>
          {t('common.confirm')}
        </button>
      </div>
    </div>
  );
}
