import { describe, expect, it } from 'vitest';
import type { Field } from '../data/types';
import { draftFromRecord, draftToValues, emptyDraft, formatDate, formatValue, recordMatches, summarizeRecord } from './recordForm';

const f = (id: string, name: string, kind: Field['kind'], extra: Partial<Field> = {}): Field =>
  ({ id, drawerId: 'd', name, kind, required: false, options: [], order: 0, ...extra });
const fields: Field[] = [
  f('name', '제품명', 'text', { required: true }), f('brand', '브랜드', 'text'), f('date', '구매일', 'date'),
  f('price', '가격', 'currency'), f('qty', '개수', 'number'), f('ok', '완료', 'check'), f('star', '별점', 'rating'),
  f('photo', '사진', 'photo'), f('cat', '분류', 'select', { options: ['가', '나'] }), f('memo', '메모', 'long_text'),
];

describe('record form drafts', () => {
  it('starts empty (check off, rating 0) and has no control for photo fields', () => {
    const d = emptyDraft(fields);
    expect(d.name).toBe(''); expect(d.ok).toBe(false); expect(d.star).toBe(0);
    expect('photo' in d).toBe(false);
  });

  it('parses typed numbers and money, leaves empty answers out, always stores the checkbox', () => {
    const v = draftToValues(fields, { ...emptyDraft(fields), name: ' 립 틴트 ', price: '13,000원', qty: '2.5', date: '2024-03-12', star: 4 });
    expect(v).toEqual({ name: '립 틴트', date: '2024-03-12', price: 13000, qty: 2.5, ok: false, star: 4 });
    expect(draftToValues(fields, emptyDraft(fields))).toEqual({ ok: false });
  });

  it('rejects text where a number is expected and fractional money', () => {
    expect(() => draftToValues(fields, { ...emptyDraft(fields), price: 'abc' })).toThrow('숫자를 입력해');
    expect(() => draftToValues(fields, { ...emptyDraft(fields), price: '1.5' })).toThrow('원 단위');
  });

  it('round-trips a stored record back into a draft', () => {
    const stored = { name: '립', price: 13000, ok: true, star: 3, date: '2024-03-12', cat: '가' };
    const d = draftFromRecord(fields, { values: stored });
    expect(d).toMatchObject({ name: '립', price: '13000', ok: true, star: 3, date: '2024-03-12', cat: '가', brand: '' });
    expect(draftToValues(fields, d)).toEqual(stored);
  });
});

describe('record display', () => {
  it('formats dates with weekday, money with separators and no symbol, ratings as stars', () => {
    expect(formatDate('2024-03-12')).toBe('2024. 03. 12. (화)');
    expect(formatDate('2024-03-12', false)).toBe('2024. 03. 12.');
    expect(formatDate('nonsense')).toBe('nonsense');
    expect(formatValue({ kind: 'currency' }, 13000)).toBe('13,000');
    expect(formatValue({ kind: 'rating' }, 4)).toBe('★★★★☆');
    expect(formatValue({ kind: 'check' }, true)).toBe('체크함');
    expect(formatValue({ kind: 'text' }, undefined)).toBe('');
  });

  it('names a record from its first two filled text fields and first date', () => {
    const s = summarizeRecord(fields, { values: { name: '쥬시 틴트', brand: '롬앤', date: '2024-03-12' }, createdAt: 0 });
    expect(s).toMatchObject({ title: '쥬시 틴트', subtitle: '롬앤', dateLabel: '2024. 03. 12.', titleFieldId: 'name' });
  });

  it('prefers short text over a long note for the title and subtitle', () => {
    const s = summarizeRecord(fields, { values: { memo: '아주 긴 메모', name: '립', brand: '롬앤' }, createdAt: 0 });
    expect(s).toMatchObject({ title: '립', subtitle: '롬앤' });
    expect(summarizeRecord(fields, { values: { memo: '메모만' }, createdAt: 0 }).title).toBe('메모만');
  });

  it('skips empty fields when naming, falls back to a number, then to a placeholder title', () => {
    expect(summarizeRecord(fields, { values: { brand: '롬앤' }, createdAt: 0 }).title).toBe('롬앤');
    expect(summarizeRecord(fields, { values: { qty: 3 }, createdAt: 0 }).title).toBe('3');
    expect(summarizeRecord(fields, { values: {}, createdAt: Date.UTC(2024, 0, 5, 12) }).title).toBe('이름 없는 보관품');
  });

  it('searches every filled value, case-insensitively, using what is shown', () => {
    const r = { values: { name: 'Lip Tint', price: 13000, date: '2024-03-12' } };
    expect(recordMatches(fields, r, 'tint')).toBe(true);
    expect(recordMatches(fields, r, '13,000')).toBe(true);
    expect(recordMatches(fields, r, '2024. 03')).toBe(true);
    expect(recordMatches(fields, r, 'nope')).toBe(false);
    expect(recordMatches(fields, r, '  ')).toBe(true);
  });
});
