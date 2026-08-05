import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfettiBurst } from './ConfettiBurst';
import { BADGE_ICON_SRC } from '../lib/gamification';
import type { CompletionResult } from '../lib/gamification';
import { useBackDismiss } from '../lib/backNav';

const AUTO_DISMISS_MS = 3200;

interface CelebrationOverlayProps {
  result: CompletionResult;
  onDismiss: () => void;
}

export function CelebrationOverlay({ result, onDismiss }: CelebrationOverlayProps) {
  const { t } = useTranslation();

  // The parent (TaskDetailPage) re-renders on every realtime activity/comment
  // event while this overlay is up, minting a new `onDismiss` closure each
  // time -- a dep-array timer would keep re-arming and never actually fire.
  // A ref keeps the auto-dismiss tied to mount, not to the parent's renders.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useBackDismiss(true, onDismiss);

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  <img className="celebration-badge-emoji" src={BADGE_ICON_SRC[key]} alt="" aria-hidden="true" />
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
