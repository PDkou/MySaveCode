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
      <img className="onboarding-illustration" src="/illustrations/onboarding.png" alt="" aria-hidden="true" />
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

      <button type="button" className="btn btn-primary btn-block" onClick={onDismiss}>
        {replay ? t('common.close') : t('onboarding.start')}
      </button>
    </div>
  );
}
