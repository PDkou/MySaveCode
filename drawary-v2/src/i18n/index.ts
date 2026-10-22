import { Fragment, createElement, type ReactNode } from 'react';
import { MESSAGES } from './messages';

/**
 * App language (KR/JA/EN, #54). Korean is the source language: every UI string is written in
 * Korean in the code, `t('한국어')` returns it as is for Korean and the saved translation for
 * Japanese/English (src/i18n/messages/*). A string with no translation falls back to the Korean
 * (src/i18n/messages.test.ts fails the build's tests before that can ship).
 *
 *   t('저장')                          plain
 *   t('보관품 {n}개', { n: 3 })        values
 *   {n:item|items}                      English plural inside a translation: first form when n is 1
 *   tl('첫 줄\n둘째 줄')                 line breaks become <br/> (the translation chooses its own)
 *   tx('{name} 서랍', { name: <b>…</b> })  like tl, with elements as values
 *   K('저장')                           marks a string stored in a constant; translate where it is shown with t()
 */
export type Lang = 'ko' | 'ja' | 'en';
export const LANGS: readonly Lang[] = ['ko', 'ja', 'en'];
export const LANGUAGE_KEY = 'language';
export const DEFAULT_LANG: Lang = 'ko';

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** The device language, for the very first start (before the person has chosen one). */
export function deviceLang(nav: { language?: string } | undefined = typeof navigator === 'undefined' ? undefined : navigator): Lang {
  const code = (nav?.language ?? '').toLowerCase();
  if (code.startsWith('ko')) return 'ko';
  if (code.startsWith('ja')) return 'ja';
  return code ? 'en' : DEFAULT_LANG;
}

/** The saved choice, or (first start) the device language. */
export const readLanguage = (settings: Record<string, unknown>, nav?: { language?: string }): Lang =>
  isLang(settings[LANGUAGE_KEY]) ? settings[LANGUAGE_KEY] : deviceLang(nav);

const LOCALES: Record<Lang, string> = { ko: 'ko-KR', ja: 'ja-JP', en: 'en-US' };

let current: Lang = DEFAULT_LANG;
export const getLang = (): Lang => current;
/** BCP 47 locale of the current language, for number/date formatting and sorting. */
export const getLocale = (): string => LOCALES[current];

export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

const PLURAL = /\{(\w+):([^|{}]*)\|([^{}]*)\}/g;

function fill(text: string, values?: Record<string, string | number>): string {
  if (!values) return text;
  return text
    .replace(PLURAL, (whole, name: string, one: string, many: string) => (name in values ? (Number(values[name]) === 1 ? one : many) : whole))
    .replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** Translation of `ko` for the current language (Korean for Korean). */
export function translate(ko: string, lang: Lang, values?: Record<string, string | number>): string {
  const found = lang === 'ko' ? undefined : MESSAGES[ko]?.[lang];
  return fill(found ?? withoutContext(ko), values);
}

/**
 * Two meanings can share one Korean word ("포함": contains / included). The second one's key
 * gets a context tag, `포함@op`; the tag is only for telling the keys apart and is never shown.
 */
export const withoutContext = (ko: string): string => ko.replace(/@[a-z]+$/, '');

export const t = (ko: string, values?: Record<string, string | number>): string => translate(ko, current, values);

/** Separator between two short facts on one line ("Today, 7 days before"). */
export const dot = (): string => (current === 'ja' ? '、' : ', ');

/** Marks a Korean string kept in a constant. Same value; call t() on it where it is shown. */
export const K = (ko: string): string => ko;

/** Like t(), but `{name}` can be filled with elements (bold text etc.), and `\n` is a line break. */
export function tx(ko: string, values: Record<string, ReactNode>): ReactNode {
  return translate(ko, current).split(/(\{\w+\}|\n)/).map((part, i) => {
    if (part === '\n') return lineBreak(i);
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return name && name in values ? createElement(Fragment, { key: i }, values[name]) : part;
  });
}

/**
 * A `\n` in a translation. Korean keeps its hard line breaks (the screens were designed around
 * them). Japanese and English text is a different length, so a forced break often leaves one word
 * alone on a line; there the break becomes a soft one: the text only wraps when the lines do not
 * fit side by side (`.tl-soft` sets balanced wrapping).
 */
function lineBreak(key: number): ReactNode {
  if (current === 'ko') return createElement('br', { key });
  return createElement(Fragment, { key }, current === 'en' ? ' ' : createElement('wbr'));
}

/** Like t(), with `\n` shown as a line break. */
export function tl(ko: string, values?: Record<string, string | number>): ReactNode {
  const lines = t(ko, values).split('\n');
  return lines.length === 1 ? lines[0] : lines.map((line, i) => createElement(Fragment, { key: i }, i > 0 && lineBreak(i), line));
}
