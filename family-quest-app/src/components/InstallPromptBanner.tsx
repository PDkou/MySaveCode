import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Not yet in TS's DOM lib -- Chromium-only event fired when the browser
// decides the page is installable.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'familyquest.install-prompt-dismissed';

// iOS Safari never fires beforeinstallprompt at all -- it has no
// programmatic install API, only the manual "공유 > 홈 화면에 추가" flow
// already documented in README. This banner is a Chromium/Android-only
// nicety on top of that, not a replacement for it.
export function InstallPromptBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (isStandalone || window.localStorage.getItem(DISMISSED_KEY)) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="install-banner">
      <span className="install-banner-text">{t('install.bannerText')}</span>
      <div className="install-banner-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleInstall()}>
          {t('install.installButton')}
        </button>
        <button
          type="button"
          className="install-banner-dismiss"
          onClick={handleDismiss}
          aria-label={t('common.close')}
        >
          ×
        </button>
      </div>
    </div>
  );
}
