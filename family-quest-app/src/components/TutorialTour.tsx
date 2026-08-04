import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TutorialStep {
  // data-tutorial attribute value to spotlight, or null for a centered,
  // untargeted step (used for the closing "check 도움말 for more" step).
  target: string | null;
  titleKey: string;
  bodyKey: string;
}

const STEPS: TutorialStep[] = [
  { target: 'new-task', titleKey: 'tutorial.steps.newTask.title', bodyKey: 'tutorial.steps.newTask.body' },
  { target: 'filters', titleKey: 'tutorial.steps.filters.title', bodyKey: 'tutorial.steps.filters.body' },
  { target: 'notification-bell', titleKey: 'tutorial.steps.notifications.title', bodyKey: 'tutorial.steps.notifications.body' },
  { target: 'settings', titleKey: 'tutorial.steps.settings.title', bodyKey: 'tutorial.steps.settings.body' },
  { target: 'calendar', titleKey: 'tutorial.steps.calendar.title', bodyKey: 'tutorial.steps.calendar.body' },
  { target: 'character', titleKey: 'tutorial.steps.character.title', bodyKey: 'tutorial.steps.character.body' },
  { target: null, titleKey: 'tutorial.steps.help.title', bodyKey: 'tutorial.steps.help.body' },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialTourProps {
  onFinish: () => void;
}

export function TutorialTour({ onFinish }: TutorialTourProps) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[stepIndex];

  useLayoutEffect(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => {
      const box = el.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.target]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onFinish]);

  const isLast = stepIndex === STEPS.length - 1;
  const goNext = () => (isLast ? onFinish() : setStepIndex((i) => i + 1));

  const padding = 8;
  const spot: Rect | null = rect
    ? { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }
    : null;

  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  let placement: 'below' | 'above' | 'center' = 'center';
  let tooltipStyle: { top?: number; bottom?: number; left: number } = { top: 0, left: 0 };

  if (spot) {
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    placement = spaceBelow > 170 ? 'below' : 'above';
    const idealLeft = spot.left + spot.width / 2 - tooltipWidth / 2;
    const left = Math.max(16, Math.min(idealLeft, window.innerWidth - tooltipWidth - 16));
    tooltipStyle =
      placement === 'below'
        ? { top: spot.top + spot.height + 12, left }
        : { bottom: window.innerHeight - spot.top + 12, left };
  } else {
    tooltipStyle = { top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - tooltipWidth / 2 };
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label={t('tutorial.heading')}>
      <div className="tutorial-backdrop" />
      {spot && (
        <div
          className="tutorial-spotlight"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      )}
      <div className="tutorial-tooltip" style={{ ...tooltipStyle, width: tooltipWidth }}>
        <div className="tutorial-step-count">{t('tutorial.stepCount', { current: stepIndex + 1, total: STEPS.length })}</div>
        <h3 className="tutorial-title">{t(step.titleKey)}</h3>
        <p className="tutorial-body">{t(step.bodyKey)}</p>
        <div className="tutorial-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onFinish}>
            {t('tutorial.skip')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={goNext}>
            {isLast ? t('tutorial.done') : t('tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
