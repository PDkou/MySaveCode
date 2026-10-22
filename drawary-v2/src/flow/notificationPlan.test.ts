import { describe, expect, it } from 'vitest';
import type { Drawer, Field, NotificationRule, RecordItem } from '../data/types';
import { computeNotificationPlan } from './notificationPlan';

const drawer: Drawer = { id: 'd', name: '화장품', iconKey: 'cosmetics', colorKey: 'pink', order: 0, createdAt: 0, updatedAt: 0 };
const f = (id: string, name: string, kind: Field['kind']): Field => ({ id, drawerId: 'd', name, kind, required: false, options: [], order: 0 });
const fields = [f('n', '제품명', 'text'), f('buy', '구매일', 'date'), f('exp', '사용기한', 'date')];
const rec = (id: string, values: RecordItem['values']): RecordItem => ({ id, drawerId: 'd', values, createdAt: 0, updatedAt: 0 });
const rule = (id: string, fieldId: string, daysBefore: number, time = '09:00'): NotificationRule => ({ id, drawerId: 'd', fieldId, daysBefore, time, createdAt: 0 });
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const now = at(2026, 10, 20, 12, 0);

describe('notification plan', () => {
  const records = [rec('a', { n: '선크림', exp: '2026-11-10' }), rec('b', { n: '쿠션', exp: '2026-10-21' }), rec('c', { n: '날짜 없음' })];

  it('fires N days before the date at the rule time, soonest first, with a readable text', () => {
    const plan = computeNotificationPlan({ rules: [rule('r1', 'exp', 7)], drawers: [drawer], fields, records, now });
    expect(plan.map((p) => [p.recordId, p.fireAt])).toEqual([['a', at(2026, 11, 3, 9, 0)]]);
    expect(plan[0]).toMatchObject({ title: '화장품', body: '선크림, 사용기한 7일 전', key: 'r1:a', drawerId: 'd', ruleId: 'r1' });
  });

  it('skips moments already past, records without a date, and today at an earlier time', () => {
    expect(computeNotificationPlan({ rules: [rule('r', 'exp', 7)], drawers: [drawer], fields, records, now }).map((p) => p.recordId)).toEqual(['a']);
    const day0 = computeNotificationPlan({ rules: [rule('r', 'exp', 0, '08:00'), rule('s', 'exp', 0, '18:00')], drawers: [drawer], fields, records: [rec('t', { n: '오늘', exp: '2026-10-20' })], now });
    expect(day0.map((p) => p.key)).toEqual(['s:t']); // 08:00 already passed, 18:00 has not
    expect(day0[0].body).toBe('오늘, 사용기한 당일');
  });

  it('handles month boundaries when subtracting days', () => {
    const plan = computeNotificationPlan({ rules: [rule('r', 'buy', 30)], drawers: [drawer], fields, records: [rec('x', { n: 'x', buy: '2026-12-05' })], now });
    expect(plan[0].fireAt).toBe(at(2026, 11, 5, 9, 0));
  });

  it('merges rules, sorts by time, ignores rules whose field is not a date, and caps the list', () => {
    const rs = [rule('r1', 'exp', 7), rule('r2', 'exp', 1, '18:00'), rule('bad', 'n', 1)];
    const plan = computeNotificationPlan({ rules: rs, drawers: [drawer], fields, records, now });
    expect(plan.map((p) => p.key)).toEqual(['r2:b', 'r1:a', 'r2:a']);
    expect(computeNotificationPlan({ rules: rs, drawers: [drawer], fields, records, now, limit: 2 })).toHaveLength(2);
  });
});
