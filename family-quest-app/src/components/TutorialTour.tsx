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
// show. 'left'/'right' are kept in the asset map for a possible future use
// but aren't picked below -- the mascot always stands in the same spot
// relative to the spotlight/tooltip now (see the placement comment further
// down), so the only poses actually needed are the ones for "target is
// directly above" (up), "no target" (hello for the opening step, default
// for the closing one).
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

  // The mascot is always a standalone floating element, positioned the same
  // way on every step -- earlier versions put it beside the target for some
  // steps and inside the tooltip card for others, which read as
  // inconsistent (different treatment per step) and, for the side-of-target
  // placement, disconnected from the tooltip explaining it. Now it always
  // sits snugly between the spotlight and the tooltip (pose 'up', arm
  // raised at whatever's highlighted directly above), or right above the
  // tooltip when there's no target at all -- one shape, every time.
  const MASCOT_HEIGHT = 108;
  const HELLO_ASPECT = 0.667; // hello/up source images: 320x480 (portrait)
  const DEFAULT_ASPECT = 1.483; // default source image: 712x480 (landscape)
  const gap = 10;
  const edgeMargin = 16;

  let pose: MascotPose;
  let tooltipStyle: { top?: number; bottom?: number; left: number };
  let mascotStyle: { top: number; left: number; height: number };

  if (spot) {
    pose = 'up';
    const mascotWidth = MASCOT_HEIGHT * HELLO_ASPECT;
    // Estimated tooltip height (title + body + actions) -- same rough
    // budget the old placement math used, just padded for the mascot now
    // sitting in the gap too.
    const neededBelow = MASCOT_HEIGHT + gap * 2 + 170;
    const spaceBelow = window.innerHeight - (spot.top + spot.height);
    const placement = spaceBelow > neededBelow ? 'below' : 'above';

    const idealCenter = spot.left + spot.width / 2;
    const mascotLeft = Math.max(edgeMargin, Math.min(idealCenter - mascotWidth / 2, window.innerWidth - mascotWidth - edgeMargin));
    const tooltipLeft = Math.max(edgeMargin, Math.min(idealCenter - tooltipWidth / 2, window.innerWidth - tooltipWidth - edgeMargin));

    if (placement === 'below') {
      const mascotTop = spot.top + spot.height + gap;
      mascotStyle = { top: mascotTop, left: mascotLeft, height: MASCOT_HEIGHT };
      tooltipStyle = { top: mascotTop + MASCOT_HEIGHT + gap, left: tooltipLeft };
    } else {
      // Rare in practice (every current target sits near the top of the
      // screen, so there's always room below) -- no "point down" pose
      // exists yet, so this uses the neutral explaining pose instead.
      pose = 'default';
      const mascotBottom = window.innerHeight - spot.top + gap;
      mascotStyle = { top: mascotBottom - MASCOT_HEIGHT, left: mascotLeft, height: MASCOT_HEIGHT };
      tooltipStyle = { bottom: window.innerHeight - (mascotBottom - MASCOT_HEIGHT) + gap, left: tooltipLeft };
    }
  } else {
    pose = stepIndex === 0 ? 'hello' : 'default';
    const aspect = pose === 'hello' ? HELLO_ASPECT : DEFAULT_ASPECT;
    const mascotWidth = MASCOT_HEIGHT * aspect;
    const tooltipTop = window.innerHeight / 2 - 90;
    const tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
    mascotStyle = { top: tooltipTop - MASCOT_HEIGHT - gap, left: tooltipLeft + tooltipWidth / 2 - mascotWidth / 2, height: MASCOT_HEIGHT };
    tooltipStyle = { top: tooltipTop, left: tooltipLeft };
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
      <img className="tutorial-mascot" src={MASCOT_SRC[pose]} alt="" aria-hidden="true" style={mascotStyle} />
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
