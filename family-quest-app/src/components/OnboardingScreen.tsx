import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OnboardingScreenProps {
  onDismiss: () => void;
  // Reused as an on-demand preview from Settings ("온보딩 다시보기") -- same
  // content, just a "close" label instead of the first-run "시작하기".
  replay?: boolean;
}

// Mapped rather than unrolled so bumping the count (3 -> 4 here, per
// request "늘려도 좋을 것 같아 한 4개까지는") is a one-line change instead of
// copy-pasting another <div className="onboarding-point"> block. Each
// entry is an onboarding.pointNTitle/pointNDesc key pair.
const POINT_COUNT = 4;

// Matches .onboarding-screen's opacity transition duration in global.css.
const CLOSE_FADE_MS = 250;

export function OnboardingScreen({ onDismiss, replay = false }: OnboardingScreenProps) {
  const { t } = useTranslation();
  // The parent unmounts this component the instant onDismiss fires (it's
  // just `{showOnboarding && <OnboardingScreen .../>}`), so without this
  // the screen snapped away instantly on "시작하기"/닫기 -- fade out first,
  // then tell the parent to actually unmount.
  const [isClosing, setIsClosing] = useState(false);
  const handleDismiss = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onDismiss, CLOSE_FADE_MS);
  };

  return (
    <div className={`onboarding-screen${isClosing ? ' onboarding-closing' : ''}`}>
      <div className="onboarding-hero">
        <img className="onboarding-illustration" src="/illustrations/onboarding.png" alt="" aria-hidden="true" />
        {/* Same character (and same "hello" pose) that opens the
            dashboard tutorial right after this -- carries the guide
            across both first-run screens instead of introducing it out
            of nowhere once the user reaches the dashboard. */}
        <img className="onboarding-mascot" src="/mascot/tutorial-guide-hello.png" alt="" aria-hidden="true" />
      </div>
      <h1 className="onboarding-app-name">{t('app.name')}</h1>
      <p className="onboarding-tagline">{t('onboarding.tagline')}</p>

      <div className="onboarding-points">
        {Array.from({ length: POINT_COUNT }, (_, i) => i + 1).map((n) => (
          <div className="onboarding-point" key={n}>
            <h3>{t(`onboarding.point${n}Title`)}</h3>
            <p>{t(`onboarding.point${n}Desc`)}</p>
          </div>
        ))}
      </div>

      {!replay && <p className="onboarding-bridge-note">{t('onboarding.guideNote')}</p>}

      <button type="button" className="btn btn-primary btn-block" onClick={handleDismiss}>
        {replay ? t('common.close') : t('onboarding.start')}
      </button>
    </div>
  );
}
