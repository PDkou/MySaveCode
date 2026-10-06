import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import en from './locales/en.json';

export type Locale = 'ko' | 'ja' | 'en';

const dictionaries = { ko, ja, en } as const;
const STORAGE_KEY = 'drawary.locale';

function getInitialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'ko' || saved === 'ja' || saved === 'en') return saved;

  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('ko')) return 'ko';
  if (browser.startsWith('ja')) return 'ja';
  return 'en';
}

function resolveValue(locale: Locale, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, dictionaries[locale]);

  if (typeof value === 'string') return value;

  const fallback = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, dictionaries.ko);

  return typeof fallback === 'string' ? fallback : key;
}

function interpolate(text: string, variables?: Record<string, string | number>): string {
  if (!variables) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(variables[key] ?? ''));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      localStorage.setItem(STORAGE_KEY, nextLocale);
      setLocaleState(nextLocale);
    },
    t(key, variables) {
      return interpolate(resolveValue(locale, key), variables);
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}