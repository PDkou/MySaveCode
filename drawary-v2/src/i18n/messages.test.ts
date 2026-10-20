import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESSAGES, SOURCES } from './messages';
import { deviceLang, readLanguage, t, tl, tx, translate, withoutContext } from './index';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const HANGUL = /[가-힣]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n: string) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'i18n' ? [] : sourceFiles(p);
    return /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}

/** Every Korean text that goes through t/tl/tx/K in the app's code (read with the TypeScript parser). */
function usedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const f of sourceFiles(SRC)) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && /^(t|tl|tx|K)$/.test(n.expression.getText()) && n.arguments.length) {
        const a = n.arguments[0];
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) keys.add(a.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return keys;
}

const names = (s: string) => new Set([...s.matchAll(/\{(\w+)(?::[^|{}]*\|[^{}]*)?\}/g)].map((m) => m[1]));
const plainNames = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

describe('translations', () => {
  const used = usedKeys();

  it('has a Japanese and an English text for every Korean text in the code', () => {
    const missing = [...used].filter((k) => !MESSAGES[k] || !MESSAGES[k].ja.trim() || !MESSAGES[k].en.trim());
    expect(missing).toEqual([]);
  });

  it('keeps no translation that the code no longer uses', () => {
    expect(Object.keys(MESSAGES).filter((k) => !used.has(k))).toEqual([]);
  });

  it('defines each text once', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const [file, msgs] of Object.entries(SOURCES)) for (const k of Object.keys(msgs)) { if (seen.has(k)) dup.push(`${k} (${seen.get(k)}, ${file})`); seen.set(k, file); }
    expect(dup).toEqual([]);
  });

  it('writes Japanese and English without Korean (except the language name 한국어)', () => {
    const noName = (s: string) => s.replace(/한국어/g, '');
    const bad = Object.entries(MESSAGES).filter(([, v]) => HANGUL.test(noName(v.ja)) || HANGUL.test(noName(v.en))).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('keeps every {value} of the Korean text in both translations', () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(MESSAGES)) {
      for (const lang of ['ja', 'en'] as const) {
        const have = names(v[lang]);
        const lost = [...plainNames(k)].filter((n) => !have.has(n));
        const extra = [...names(v[lang])].filter((n) => !names(k).has(n) && n !== 'n');
        if (lost.length || extra.length) bad.push(`${k} [${lang}] lost ${lost} extra ${extra}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('has no Korean left in the code outside t()/K() (except sample fixtures)', () => {
    // Demo/fixture defaults that callers always override, and developer-only text.
    const ALLOWED = /^(화장품|롬앤 쥬시래스팅 틴트|립 틴트|쿠션 파운데이션|클리오 킬커버 쿠션|아이섀도우 팔레트|데이지크 새도우 팔레트|향수|샤넬 코코 마드모아젤|구매일|가격|메모|2024\. 03\. 12\. \(화\)|발색이 자연스럽고 지속력이 좋아요\.|개발 검수용 · 확정 화면 아님|V2-08 공통 하단바·화면 이동 동작 확인|이 영역의 실제 확정 화면은 후속 구현 단계에서 연결합니다\.|반복 보관품을 만들지 못했어요|알림 목록을 보내지 못했어요|사진을 불러오지 못했어요)$/;
    const SKIP = /(screenManifest|LanguageSettingsScreen|drawerStyle)\./;
    const left: string[] = [];
    for (const f of sourceFiles(SRC)) {
      if (SKIP.test(f)) continue;
      const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (n: ts.Node) => {
        const text = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n) ? n.text : null;
        if (text && HANGUL.test(text) && !ALLOWED.test(text.trim())) {
          let inCall = false;
          for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
            if (ts.isCallExpression(p) && /^(t|tl|tx|K)$/.test(p.expression.getText())) { inCall = true; break; }
            if (ts.isJsxElement(p) || ts.isFunctionLike(p)) break;
          }
          if (!inCall) left.push(`${f.replace(SRC, '')}: ${text.trim().slice(0, 40)}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(left).toEqual([]);
  });
});

describe('t()', () => {
  it('returns the Korean for Korean, and the saved text for the other languages', () => {
    expect(translate('저장', 'ko')).toBe('저장');
    expect(translate('저장하기', 'ja')).toBe('保存する');
    expect(translate('저장하기', 'en')).toBe('Save');
  });

  it('falls back to the Korean when nothing is saved for a text', () => {
    expect(translate('아직 없는 문장', 'en')).toBe('아직 없는 문장');
  });

  it('fills values and chooses singular/plural in English', () => {
    expect(translate('보관품 {n}개', 'ko', { n: 3 })).toBe('보관품 3개');
    expect(translate('보관품 {n}개', 'en', { n: 1 })).toBe('1 item');
    expect(translate('보관품 {n}개', 'en', { n: 2 })).toBe('2 items');
    expect(translate('보관품 {n}개', 'ja', { n: 2 })).toBe('アイテム2件');
    expect(translate('{interval}{unit}마다', 'en', { interval: 1, unit: translate('주', 'en', { n: 1 }) })).toBe('every 1 week');
    expect(translate('{interval}{unit}마다', 'en', { interval: 2, unit: translate('주', 'en', { n: 2 }) })).toBe('every 2 weeks');
  });

  it('keeps a context tag out of sight and tells the two meanings apart', () => {
    expect(withoutContext('포함@op')).toBe('포함');
    expect(translate('포함@op', 'ko')).toBe('포함');
    expect(translate('포함@op', 'en')).toBe('Contains');
    expect(translate('포함', 'en')).toBe('Included');
  });

  it('is Korean until a language is set, and the module helpers follow it', () => {
    expect(t('저장하기')).toBe('저장하기');
    expect(Array.isArray(tl('가\n나'))).toBe(true);
    expect(Array.isArray(tx('{a}', { a: 'x' }))).toBe(true);
  });
});

describe('which language', () => {
  it('uses the saved choice, else the phone language, else Korean', () => {
    expect(readLanguage({ language: 'ja' }, { language: 'ko-KR' })).toBe('ja');
    expect(readLanguage({}, { language: 'ko-KR' })).toBe('ko');
    expect(readLanguage({}, { language: 'ja-JP' })).toBe('ja');
    expect(readLanguage({}, { language: 'en-US' })).toBe('en');
    expect(readLanguage({}, { language: 'fr-FR' })).toBe('en');
    expect(readLanguage({ language: 'xx' }, { language: 'ko' })).toBe('ko');
    expect(deviceLang({})).toBe('ko');
  });
});
