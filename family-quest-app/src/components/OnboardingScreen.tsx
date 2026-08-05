import { useTranslation } from 'react-i18next';

interface OnboardingScreenProps {
  onDismiss: () => void;
  // Reused as an on-demand preview from Settings ("온보딩 다시보기") -- same
  // content, just a "close" label instead of the first-run "시작하기".
  replay?: boolean;
}

export function OnboardingScreen({ onDismiss, replay = false }: OnboardingScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-screen">
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
        <div className="onboarding-point">
          <h3>{t('onboarding.point1Title')}</h3>
          <p>{t('onboarding.point1Desc')}</p>
        </div>
        <div className="onboarding-point">
          <h3>{t('onboarding.point2Title')}</h3>
          <p>{t('onboarding.point2Desc')}</p>
        </div>
        <div className="onboarding-point">
          <h3>{t('onboarding.point3Title')}</h3>
          <p>{t('onboarding.point3Desc')}</p>
        </div>
      </div>

      {!replay && <p className="onboarding-bridge-note">{t('onboarding.guideNote')}</p>}

      <button type="button" className="btn btn-primary btn-block" onClick={onDismiss}>
        {replay ? t('common.close') : t('onboarding.start')}
      </button>
    </div>
  );
}
