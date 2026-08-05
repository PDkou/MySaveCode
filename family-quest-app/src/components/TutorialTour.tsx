import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TutorialStep {
  // data-tutorial attribute value to spotlight, or null for a centered,
  // untargeted step (used for the opening welcome and closing "check
  // 도움말 for more" steps).
  target: string | null;
  titleKey: string;
  bodyKey: string;
}

const STEPS: TutorialStep[] = [
  { target: null, titleKey: 'tutorial.steps.welcome.title', bodyKey: 'tutorial.steps.welcome.body' },
  { target: 'new-task', titleKey: 'tutorial.steps.newTask.title', bodyKey: 'tutorial.steps.newTask.body' },
  { target: 'filters', titleKey: 'tutorial.steps.filters.title', bodyKey: 'tutorial.steps.filters.body' },
  { target: 'notification-bell', titleKey: 'tutorial.steps.notifications.title', bodyKey: 'tutorial.steps.notifications.body' },
  { target: 'settings', titleKey: 'tutorial.steps.settings.title', bodyKey: 'tutorial.steps.settings.body' },
  { target: 'calendar', titleKey: 'tutorial.steps.calendar.title', bodyKey: 'tutorial.steps.calendar.body' },
  { target: 'character', titleKey: 'tutorial.steps.character.title', bodyKey: 'tutorial.steps.character.body' },
  { target: null, titleKey: 'tutorial.steps.help.title', bodyKey: 'tutorial.steps.help.body' },
];

// Which of the 5 generated mascot poses (design/character-art.md #33-38) to
// show next to the tooltip. Picked from the tooltip's own layout math below
// rather than the raw target rect, so it reflects where the highlighted
// element actually sits *relative to the tooltip* (which is what the arm
// gesture needs to point at), not just where it sits on screen.
type MascotPose = 'hello' | 'default' | 'left' | 'right' | 'up';

const MASCOT_SRC: Record<MascotPose, string> = {
  hello: '/mascot/tutorial-guide-hello.png',
  default: '/mascot/tutorial-guide-default.png',
  left: '/mascot/tutorial-guide-left.png',
  right: '/mascot/tutorial-guide-right.png',
  up: '/mascot/tutorial-guide-up.png',
};

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
  let tooltipStyle: { top?: number; bottom?: number; left: number } = { top: 0, left: 0 };

  if (spot) {
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    const placement = spaceBelow > 170 ? 'below' : 'above';
    const idealLeft = spot.left + spot.width / 2 - tooltipWidth / 2;
    const left = Math.max(16, Math.min(idealLeft, window.innerWidth - tooltipWidth - 16));
    tooltipStyle =
      placement === 'below'
        ? { top: spot.top + spot.height + 12, left }
        : { bottom: window.innerHeight - spot.top + 12, left };
  } else {
    tooltipStyle = { top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - tooltipWidth / 2 };
  }

  // The mascot's placement mirrors the request "if it's pointing at the
  // new-task button, stand right next to that button, pointing at it" --
  // not just "somewhere near a generic tooltip." Two modes:
  //
  // - beside the target (mascotSide 'left'/'right' of the target rect,
  //   pose points back at it) when the target is a real standalone button
  //   with enough clear room on one side. Narrow icon buttons (bell,
  //   settings) sit packed against siblings with no safe gap, so they're
  //   excluded even if the raw viewport math has "room" -- a big mascot
  //   there would just cover the next icon over.
  // - inside the tooltip card (small standalone step, full-width target
  //   like the filter tabs, or no target at all) when there's no good
  //   side to stand on.
  const SIDE_HEIGHT = 116; // mascot height when standing beside the target
  const CARD_HEIGHT = 84; // mascot height when living inside the tooltip card
  const SIDE_ASPECT = 1.483; // default/left/right source images: 712x480
  const sideWidth = SIDE_HEIGHT * SIDE_ASPECT;
  const gap = 10;
  const edgeMargin = 12;

  let pose: MascotPose;
  let sideMascotStyle: { top: number; left: number } | null = null;

  if (!spot) {
    pose = stepIndex === 0 ? 'hello' : 'default';
  } else {
    const isNarrowTarget = spot.width < 60; // packed icon buttons -- never side-anchor these
    const spaceRight = window.innerWidth - (spot.left + spot.width) - edgeMargin;
    const spaceLeft = spot.left - edgeMargin;

    if (!isNarrowTarget && spaceRight >= sideWidth) {
      pose = 'left'; // mascot stands to the target's right, arm points back left at it
      sideMascotStyle = {
        top: Math.max(8, Math.min(spot.top + spot.height / 2 - SIDE_HEIGHT / 2, window.innerHeight - SIDE_HEIGHT - 8)),
        left: spot.left + spot.width + gap,
      };
    } else if (!isNarrowTarget && spaceLeft >= sideWidth) {
      pose = 'right'; // mascot stands to the target's left, arm points back right at it
      sideMascotStyle = {
        top: Math.max(8, Math.min(spot.top + spot.height / 2 - SIDE_HEIGHT / 2, window.innerHeight - SIDE_HEIGHT - 8)),
        left: spot.left - sideWidth - gap,
      };
    } else {
      // No safe side room (full-width target like the filter tabs, or a
      // packed icon) -- fall back to the in-card avatar, pointing up at
      // whatever's spotlighted above the tooltip.
      pose = 'up';
    }
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
      {sideMascotStyle && (
        <img
          className="tutorial-mascot-side"
          src={MASCOT_SRC[pose]}
          alt=""
          aria-hidden="true"
          style={{ top: sideMascotStyle.top, left: sideMascotStyle.left, height: SIDE_HEIGHT }}
        />
      )}
      <div className="tutorial-tooltip" style={{ ...tooltipStyle, width: tooltipWidth }}>
        {!sideMascotStyle && (
          <div className="tutorial-tooltip-head">
            <img className="tutorial-mascot" src={MASCOT_SRC[pose]} alt="" aria-hidden="true" style={{ height: CARD_HEIGHT }} />
            <div className="tutorial-tooltip-head-text">
              <div className="tutorial-step-count">{t('tutorial.stepCount', { current: stepIndex + 1, total: STEPS.length })}</div>
              <h3 className="tutorial-title">{t(step.titleKey)}</h3>
            </div>
          </div>
        )}
        {sideMascotStyle && (
          <div className="tutorial-step-count">{t('tutorial.stepCount', { current: stepIndex + 1, total: STEPS.length })}</div>
        )}
        {sideMascotStyle && <h3 className="tutorial-title">{t(step.titleKey)}</h3>}
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
