import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import type { Drawer, Field, RecordItem } from '../data/types';

const NOW = new Date(2026, 9, 20, 12, 0); // 2026-10-20 (local)
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10).getTime();
const label = (d: Date) => `${d.getMonth() + 1}월`;
const drawer = (id: string, name: string, order: number): Drawer => ({ id, name, iconKey: 'misc', colorKey: 'pink', order, createdAt: 0, updatedAt: 0 });
const field = (id: string, drawerId: string, name: string, kind: Field['kind'], order = 0): Field => ({ id, drawerId, name, kind, required: false, options: [], order });
const rec = (id: string, drawerId: string, created: number, values: RecordItem['values'] = {}): RecordItem => ({ id, drawerId, values, createdAt: created, updatedAt: created });

const drawers = [drawer('d1', '화장품', 0), drawer('d2', '식물', 1), drawer('d3', '책', 2)];
const fields = [
  field('f1', 'd1', '제품명', 'text'), field('f2', 'd1', '사용기한', 'date', 1),
  field('f3', 'd2', '이름', 'text'), field('f4', 'd2', '분갈이', 'date', 1),
];

describe('stats', () => {
  it('is all zeros with nothing saved', () => {
    const s = computeStats([], [], [], NOW, label);
    expect(s).toMatchObject({ drawerCount: 0, itemCount: 0, monthlyAdded: 0, monthlyDelta: 0, upcomingCount: 0, nearestUpcomingDays: null, upcoming: [], insights: [] });
    expect(s.monthly.map((m) => m.label)).toEqual(['5월', '6월', '7월', '8월', '9월', '10월']);
    expect(s.monthly.every((m) => m.count === 0)).toBe(true);
  });

  it('counts drawers and items, and adds per month for the last six months (oldest first)', () => {
    const records = [
      rec('r1', 'd1', at(2026, 10, 2)), rec('r2', 'd1', at(2026, 10, 19)), rec('r3', 'd2', at(2026, 10, 20)),
      rec('r4', 'd1', at(2026, 9, 30)), rec('r5', 'd2', at(2026, 5, 1)), rec('r6', 'd2', at(2026, 4, 30)), // April is outside the six months
      rec('r7', 'd2', at(2025, 10, 5)), // a year ago: same month number, different year
    ];
    const s = computeStats(drawers, fields, records, NOW, label);
    expect(s.drawerCount).toBe(3);
    expect(s.itemCount).toBe(7);
    expect(s.monthly.map((m) => m.count)).toEqual([1, 0, 0, 0, 1, 3]);
    expect(s.monthlyAdded).toBe(3);
    expect(s.monthlyDelta).toBe(2); // 3 this month, 1 last month
  });

  it('shows a drop against last month as a negative number', () => {
    const records = [rec('a', 'd1', at(2026, 9, 1)), rec('b', 'd1', at(2026, 9, 2)), rec('c', 'd1', at(2026, 10, 1))];
    expect(computeStats(drawers, fields, records, NOW, label).monthlyDelta).toBe(-1);
  });

  it('crosses a year boundary when naming the months', () => {
    const s = computeStats(drawers, fields, [], new Date(2027, 1, 10), label);
    expect(s.monthly.map((m) => m.label)).toEqual(['9월', '10월', '11월', '12월', '1월', '2월']);
  });

  it('lists upcoming dates soonest first, counts the next 30 days, skips the past and broken dates', () => {
    const records = [
      rec('r1', 'd1', 0, { f1: '선크림', f2: '2026-10-23' }),   // 3 days
      rec('r2', 'd2', 0, { f3: '몬스테라', f4: '2026-10-20' }), // today: 0 days
      rec('r3', 'd1', 0, { f1: '립', f2: '2026-11-19' }),        // 30 days: inside
      rec('r4', 'd1', 0, { f1: '틴트', f2: '2026-11-20' }),      // 31 days: outside the count, still the 4th upcoming
      rec('r5', 'd1', 0, { f1: '지난', f2: '2026-10-19' }),      // yesterday: no
      rec('r6', 'd1', 0, { f1: '이상', f2: '2026-02-31' }),      // not a real date
      rec('r7', 'd1', 0, { f1: '글자', f2: 'soon' }),
    ];
    const s = computeStats(drawers, fields, records, NOW, label);
    expect(s.upcomingCount).toBe(3);
    expect(s.nearestUpcomingDays).toBe(0);
    expect(s.upcoming.map((u) => [u.daysAway, u.drawerName, u.description])).toEqual([
      [0, '식물', '몬스테라 분갈이'], [3, '화장품', '선크림 사용기한'], [30, '화장품', '립 사용기한'],
    ]);
  });

  it('the nearest date counts even when it is beyond 30 days', () => {
    const s = computeStats(drawers, fields, [rec('r', 'd1', 0, { f1: 'x', f2: '2027-01-01' })], NOW, label);
    expect(s.upcomingCount).toBe(0);
    expect(s.nearestUpcomingDays).toBe(73);
  });

  it('ranks drawers by items and labels each row', () => {
    const records = [
      rec('a', 'd1', at(2026, 10, 1), { f1: '가' }), rec('b', 'd1', at(2026, 8, 1), { f1: '나' }), rec('c', 'd1', at(2026, 8, 2), { f1: '다' }),
      rec('d', 'd2', at(2026, 8, 3), { f3: 'x', f4: '2026-10-25' }), rec('e', 'd2', at(2026, 8, 4), { f3: 'y' }),
      rec('f', 'd3', at(2026, 10, 3)),
    ];
    const ins = computeStats(drawers, fields, records, NOW, label).insights;
    expect(ins.map((i) => [i.drawerName, i.itemCount, i.tint])).toEqual([['화장품', 3, 'pink'], ['식물', 2, 'lavender'], ['책', 1, 'green']]);
    expect(ins[0].insightLabel).toBe('가장 많은 서랍');
    expect(ins[1].insightLabel).toBe('다가오는 일정 1건');
    expect(ins[2].insightLabel).toBe('이번 달 추가 1개');
  });

  it('a drawer with nothing to say just offers to open it; ties keep the drawer order', () => {
    const ins = computeStats(drawers, fields, [], NOW, label).insights;
    expect(ins.map((i) => i.drawerName)).toEqual(['화장품', '식물', '책']);
    expect(ins.map((i) => i.insightLabel)).toEqual(['서랍 열기', '서랍 열기', '서랍 열기']);
  });

  it('shows at most four drawers', () => {
    const many = Array.from({ length: 6 }, (_, i) => drawer(`x${i}`, `서랍${i}`, i));
    expect(computeStats(many, [], [], NOW, label).insights).toHaveLength(4);
  });
});
