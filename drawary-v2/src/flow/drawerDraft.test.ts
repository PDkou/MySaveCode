import { describe, expect, it } from 'vitest';
import { defaultDraftFields, addDraftField, moveDraftField, removeDraftField, updateDraftField } from './drawerDraft';

const base = defaultDraftFields();

describe('create-drawer draft fields', () => {
  it('appends a trimmed field and rejects an empty, over-long or repeated name', () => {
    const next = addDraftField(base, { name: ' 브랜드 ', kind: 'text', required: false, options: [] });
    expect(next.at(-1)?.name).toBe('브랜드');
    expect(next).toHaveLength(base.length + 1);
    expect(() => addDraftField(base, { name: '  ', kind: 'text', required: false, options: [] })).toThrow();
    expect(() => addDraftField(base, { name: 'x'.repeat(21), kind: 'text', required: false, options: [] })).toThrow();
    expect(() => addDraftField(base, { name: '제품명', kind: 'text', required: false, options: [] })).toThrow('이미 있어요');
  });

  it('needs two distinct options for a select field and ignores options on other kinds', () => {
    expect(() => addDraftField(base, { name: '분류', kind: 'select', required: false, options: ['가', ''] })).toThrow();
    expect(() => addDraftField(base, { name: '분류', kind: 'select', required: false, options: ['가', '가'] })).toThrow();
    expect(addDraftField(base, { name: '분류', kind: 'select', required: false, options: ['가', '나'] }).at(-1)?.options).toEqual(['가', '나']);
    expect(addDraftField(base, { name: '비고', kind: 'text', required: false, options: ['x'] }).at(-1)?.options).toEqual([]);
  });

  it('edits in place without allowing a clash with another field, keeping the kind', () => {
    const next = updateDraftField(base, 'draft-memo', { name: '비고', required: true, options: [] });
    expect(next.find((f) => f.id === 'draft-memo')).toMatchObject({ name: '비고', required: true, kind: 'text' });
    expect(() => updateDraftField(base, 'draft-memo', { name: '가격', required: false, options: [] })).toThrow();
    expect(() => updateDraftField(base, 'nope', { name: 'a', required: false, options: [] })).toThrow();
  });

  it('removes and moves fields, ignoring out-of-range moves', () => {
    expect(removeDraftField(base, 'draft-price').map((f) => f.name)).toEqual(['제품명', '구매일', '메모']);
    expect(moveDraftField(base, 0, 2).map((f) => f.name)).toEqual(['구매일', '가격', '제품명', '메모']);
    expect(moveDraftField(base, 0, 9).map((f) => f.name)).toEqual(base.map((f) => f.name));
  });
});
