import { describe, expect, it } from 'vitest';
import { applyQuietHours, DEFAULT_NOTIFY_COMMON, inQuietHours, quietSummary, readNotifyCommon } from './notifySettings';
import { computeNotificationPlan } from './notificationPlan';
import type { Drawer, Field, NotificationRule, RecordItem } from '../data/types';

const quiet = { quietEnabled: true, quietStart: '22:00', quietEnd: '07:00' };
const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

describe('notification common settings', () => {
  it('reads what was saved, falls back per field, and defaults to 09:00 with quiet hours off', () => {
    expect(readNotifyCommon({})).toEqual(DEFAULT_NOTIFY_COMMON);
    expect(DEFAULT_NOTIFY_COMMON).toMatchObject({ defaultTime: '09:00', quietEnabled: false });
    expect(readNotifyCommon({ 'notify.common': { defaultTime: '08:30', quietEnabled: true, quietStart: '23:00', quietEnd: '06:30' } }))
      .toEqual({ defaultTime: '08:30', quietEnabled: true, quietStart: '23:00', quietEnd: '06:30' });
    expect(readNotifyCommon({ 'notify.common': { defaultTime: '25:99', quietEnabled: 'yes', quietStart: 5 } }))
      .toEqual(DEFAULT_NOTIFY_COMMON);
    expect(readNotifyCommon({ 'notify.common': 'junk' })).toEqual(DEFAULT_NOTIFY_COMMON);
  });

  it('knows when a time of day is inside a window, including one that crosses midnight', () => {
    expect(inQuietHours('23:30', quiet)).toBe(true);
    expect(inQuietHours('03:00', quiet)).toBe(true);
    expect(inQuietHours('22:00', quiet)).toBe(true);   // start inclusive
    expect(inQuietHours('07:00', quiet)).toBe(false);  // end exclusive
    expect(inQuietHours('12:00', quiet)).toBe(false);
    expect(inQuietHours('12:00', { quietEnabled: true, quietStart: '12:00', quietEnd: '13:00' })).toBe(true);
    expect(inQuietHours('23:30', { ...quiet, quietEnabled: false })).toBe(false);
    expect(inQuietHours('23:30', { quietEnabled: true, quietStart: '22:00', quietEnd: '22:00' })).toBe(false);
  });

  it('moves a notification inside quiet hours to when they end, same day or next morning', () => {
    expect(applyQuietHours(at(2026, 11, 3, 9), quiet)).toBe(at(2026, 11, 3, 9));
    expect(applyQuietHours(at(2026, 11, 3, 23, 30), quiet)).toBe(at(2026, 11, 4, 7));
    expect(applyQuietHours(at(2026, 11, 3, 3, 15), quiet)).toBe(at(2026, 11, 3, 7));
    expect(applyQuietHours(at(2026, 12, 31, 23, 0), quiet)).toBe(at(2027, 1, 1, 7));
    expect(applyQuietHours(at(2026, 11, 3, 23, 30), { ...quiet, quietEnabled: false })).toBe(at(2026, 11, 3, 23, 30));
  });

  it('summarizes the window', () => {
    expect(quietSummary({ quietStart: '22:00', quietEnd: '07:00' })).toBe('22:00 ~ 07:00 (다음 날)');
    expect(quietSummary({ quietStart: '13:00', quietEnd: '15:00' })).toBe('13:00 ~ 15:00');
  });
});

describe('notification plan with quiet hours', () => {
  const drawer: Drawer = { id: 'd', name: '화장품', iconKey: 'cosmetics', colorKey: 'pink', order: 0, createdAt: 0, updatedAt: 0 };
  const f = (id: string, name: string, kind: Field['kind']): Field => ({ id, drawerId: 'd', name, kind, required: false, options: [], order: 0 });
  const fields = [f('n', '제품명', 'text'), f('exp', '사용기한', 'date')];
  const records: RecordItem[] = [{ id: 'a', drawerId: 'd', values: { n: '선크림', exp: '2026-11-10' }, createdAt: 0, updatedAt: 0 }];
  const rule = (id: string, time: string): NotificationRule => ({ id, drawerId: 'd', fieldId: 'exp', daysBefore: 7, time, createdAt: 0 });
  const now = at(2026, 10, 20, 12);

  it('delays only the notifications that fall inside the window and keeps them sorted', () => {
    const plan = computeNotificationPlan({ rules: [rule('late', '23:30'), rule('day', '09:00')], drawers: [drawer], fields, records, now, quiet });
    expect(plan.map((p) => [p.ruleId, p.fireAt])).toEqual([['day', at(2026, 11, 3, 9)], ['late', at(2026, 11, 4, 7)]]);
    const off = computeNotificationPlan({ rules: [rule('late', '23:30')], drawers: [drawer], fields, records, now });
    expect(off[0].fireAt).toBe(at(2026, 11, 3, 23, 30));
  });
});
