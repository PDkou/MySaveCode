import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBackDismiss } from '../lib/backNav';

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
// show, picked in the placement logic below based on where the mascot ends
// up standing relative to the target: beside it (left/right), below it
// (up), or with no target at all (hello for the opening step, default for
// the closing one and as a last-resort fallback).
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

// How long the outgoing step's spotlight/mascot/tooltip take to fade to
// transparent before the step actually advances and the incoming ones fade
// back in. Kept in one place since goNext's setTimeout has to match it.
const STEP_FADE_MS = 180;

export function TutorialTour({ onFinish }: TutorialTourProps) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // True for the STEP_FADE_MS window between clicking "다음" and the step
  // actually changing -- drives .tutorial-step-fading below so stepping
  // fades the old step out and the new one in instead of the
  // spotlight/mascot/tooltip continuously gliding to their new position
  // (2026-08-05: the glide read as "always in motion" and a plain
  // fade-in/fade-out swap was asked for instead).
  const [isStepFading, setIsStepFading] = useState(false);
  const step = STEPS[stepIndex];
  // No "previous step" concept exists here (only "다음"/skip) -- back
  // exits the tour the same as the skip button, rather than stepping back.
  useBackDismiss(true, onFinish);

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
  const goNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    if (isStepFading) return; // ignore extra clicks mid-transition
    setIsStepFading(true);
    setTimeout(() => {
      setStepIndex((i) => i + 1);
      setIsStepFading(false);
    }, STEP_FADE_MS);
  };

  const padding = 8;
  const spot: Rect | null = rect
    ? { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }
    : null;

  const tooltipWidth = Math.min(320, window.innerWidth - 32);

  // The mascot is always a standalone floating element -- the same image,
  // same size, same drop-shadow -- never boxed into the tooltip card. That
  // much is constant across every step (2026-08-05: an in-card fallback
  // mode broke that consistency and got dropped).
  //
  // Where it stands still depends on the target, though, because "stand
  // right next to the actual button" reads much better than "always stand
  // below it" when there's room for it: beside the target (pose
  // left/right, arm pointing back at it) for a real standalone button with
  // clear space on one side; directly below the target (pose 'up') when
  // there isn't -- packed icon buttons (bell, settings) would have the
  // mascot cover the next icon over, and full-width targets (filter tabs)
  // have no side room at all.
  const MASCOT_HEIGHT = 112; // one size for every mode, so it never looks like it's jumping around
  // Re-cropped 2026-08-05: the first crop pass used a >0 alpha threshold,
  // which kept a lot of each source image's soft halo/glow fringe as
  // "content" -- for the hello/up poses that fringe was proportionally much
  // bigger, so at the same box height the actual character rendered
  // noticeably smaller than in the default/left/right poses. Re-cropped at
  // an alpha>=128 threshold (ignoring the faint fringe) so every pose's
  // character now fills its frame the same way; width:height ratios below
  // are measured off those tight crops.
  const POSE_ASPECT: Record<MascotPose, number> = { hello: 0.662, default: 0.659, right: 0.808, left: 0.812, up: 0.506 };
  const gap = 4; // was 10 -- tightened per feedback that the mascot read as pointing from too far away
  const edgeMargin = 16;

  let pose: MascotPose;
  let tooltipStyle: { top?: number; bottom?: number; left: number };
  let mascotStyle: { top: number; left: number; height: number };

  if (spot) {
    const sideWidth = MASCOT_HEIGHT * POSE_ASPECT.left; // left/right share ~the same aspect
    const isNarrowTarget = spot.width < 60;
    const spaceRight = window.innerWidth - (spot.left + spot.width) - edgeMargin;
    const spaceLeft = spot.left - edgeMargin;
    const canSideAnchor = !isNarrowTarget && (spaceRight >= sideWidth || spaceLeft >= sideWidth);

    const idealCenter = spot.left + spot.width / 2;
    const tooltipLeft = Math.max(edgeMargin, Math.min(idealCenter - tooltipWidth / 2, window.innerWidth - tooltipWidth - edgeMargin));
    const sideTop = Math.max(8, Math.min(spot.top + spot.height / 2 - MASCOT_HEIGHT / 2, window.innerHeight - MASCOT_HEIGHT - 8));

    if (canSideAnchor && spaceRight >= sideWidth) {
      pose = 'left'; // mascot stands to the target's right, arm points back left at it
      mascotStyle = { top: sideTop, left: spot.left + spot.width + gap, height: MASCOT_HEIGHT };
      tooltipStyle = { top: spot.top + spot.height + 12, left: tooltipLeft };
    } else if (canSideAnchor) {
      pose = 'right'; // mascot stands to the target's left, arm points back right at it
      mascotStyle = { top: sideTop, left: spot.left - sideWidth - gap, height: MASCOT_HEIGHT };
      tooltipStyle = { top: spot.top + spot.height + 12, left: tooltipLeft };
    } else {
      // No safe side room -- stand directly below the target instead,
      // still a floating mascot, just stacked rather than beside.
      pose = 'up';
      const mascotWidth = MASCOT_HEIGHT * POSE_ASPECT.up;
      const neededBelow = MASCOT_HEIGHT + gap * 2 + 170; // + rough tooltip height
      const spaceBelow = window.innerHeight - (spot.top + spot.height);
      const mascotLeft = Math.max(edgeMargin, Math.min(idealCenter - mascotWidth / 2, window.innerWidth - mascotWidth - edgeMargin));
      if (spaceBelow > neededBelow) {
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
    }
  } else {
    pose = stepIndex === 0 ? 'hello' : 'default';
    const mascotWidth = MASCOT_HEIGHT * POSE_ASPECT[pose];
    const tooltipTop = window.innerHeight / 2 - 90;
    const tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
    mascotStyle = { top: tooltipTop - MASCOT_HEIGHT - gap, left: tooltipLeft + tooltipWidth / 2 - mascotWidth / 2, height: MASCOT_HEIGHT };
    tooltipStyle = { top: tooltipTop, left: tooltipLeft };
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label={t('tutorial.heading')}>
      {/* Exactly one of these two dims the screen -- never both. When there's
          a spot, .tutorial-spotlight's oversized box-shadow already paints
          the same rgba(24,38,64,0.5) dim everywhere outside the cutout,
          so layering .tutorial-backdrop underneath it stacked two copies
          of that dim there, reading as visibly darker on targeted steps
          than on the untargeted welcome/closing ones (same color, just
          doubled). */}
      {spot ? (
        <div
          className={`tutorial-spotlight${isStepFading ? ' tutorial-step-fading' : ''}`}
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div className="tutorial-backdrop" />
      )}
      <img
        className={`tutorial-mascot${isStepFading ? ' tutorial-step-fading' : ''}`}
        src={MASCOT_SRC[pose]}
        alt=""
        aria-hidden="true"
        style={mascotStyle}
      />
      <div
        className={`tutorial-tooltip${isStepFading ? ' tutorial-step-fading' : ''}`}
        style={{ ...tooltipStyle, width: tooltipWidth }}
      >
        <div className="tutorial-step-count">{t('tutorial.stepCount', { current: stepIndex + 1, total: STEPS.length })}</div>
        <h3 className="tutorial-title">{t(step.titleKey)}</h3>
        <p className="tutorial-body">{t(step.bodyKey)}</p>
        <div className="tutorial-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onFinish}>
            {t('tutorial.skip')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={goNext} disabled={isStepFading}>
            {isLast ? t('tutorial.done') : t('tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
