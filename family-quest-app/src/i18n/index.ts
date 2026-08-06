import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from '../locales/ko.json';
import ja from '../locales/ja.json';
import { APP_MODE } from '../lib/appMode';

export const SUPPORTED_LANGUAGES = ['ko', 'ja'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'familyquest.language';

// app.name/app.tagline are the one branding string pair every screen that
// shows the app's own name reads from (AuthPage, etc.) -- overridden here
// per app shell rather than duplicating the whole locale file, since
// everything else in ko.json/ja.json is identical between the two apps.
// See lib/appMode.ts's header comment for the family-quest-app vs
// business-quest-app split this serves.
//
// name stays "Company Quest" (English) in both locales, matching
// app.name's own existing pattern -- ko.json/ja.json both already keep
// "Family Quest" in English regardless of UI language, only the tagline
// is translated per locale.
const BUSINESS_BRANDING = {
  ko: { name: 'Company Quest', tagline: '팀과 함께하는 업무 퀘스트' },
  ja: { name: 'Company Quest', tagline: 'チームでこなす業務クエスト' },
};

const resources = {
  ko: { translation: ko },
  ja: { translation: ja },
};

if (APP_MODE === 'business') {
  resources.ko.translation = { ...ko, app: { ...ko.app, ...BUSINESS_BRANDING.ko } };
  resources.ja.translation = { ...ja, app: { ...ja.app, ...BUSINESS_BRANDING.ja } };
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    detection: {
      // localStorage wins (explicit user choice / restored profile
      // preference), then the device/browser language, then the 'ko' fallback.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
