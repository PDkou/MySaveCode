import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from '../locales/ko.json';
import ja from '../locales/ja.json';
import { APP_MODE } from '../lib/appMode';
import { BUSINESS_OVERRIDES, deepMergeLocale } from './businessOverrides';

export const SUPPORTED_LANGUAGES = ['ko', 'ja'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'familyquest.language';

// Every family-specific string (app branding, room/member management
// copy, celebration messages, the tycoon's family tab, help text, the
// weekly breakdown, one badge name) gets a team/workspace-flavored
// replacement in the business app -- see businessOverrides.ts for the
// full list and why this is hand-written strings via a deep merge rather
// than a mechanical find-and-replace over the JSON. See lib/appMode.ts's
// header comment for the family-quest-app vs business-quest-app split
// this serves.
const resources = {
  ko: { translation: ko },
  ja: { translation: ja },
};

if (APP_MODE === 'business') {
  resources.ko.translation = deepMergeLocale(ko, BUSINESS_OVERRIDES.ko);
  resources.ja.translation = deepMergeLocale(ja, BUSINESS_OVERRIDES.ja);
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
