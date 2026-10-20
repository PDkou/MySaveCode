import { describe, expect, it } from 'vitest';
import { dueOccurrences, firstIndexAfter, isFinishedAfter, occurrenceDate, toISODate } from './recurrence';

describe('period dates', () => {
  it('adds weeks exactly', () => {
    expect(occurrenceDate('2026-10-20', 'weekly', 1, 1)).toBe('2026-10-27');
    expect(occurrenceDate('2026-10-20', 'weekly', 2, 3)).toBe('2026-12-01');
    expect(occurrenceDate('2026-12-28', 'weekly', 1, 1)).toBe('2027-01-04');
  });
  it('counts months from the base, so a short month does not drag later ones back', () => {
    expect(occurrenceDate('2026-01-31', 'monthly', 1, 1)).toBe('2026-02-28');
    expect(occurrenceDate('2026-01-31', 'monthly', 1, 2)).toBe('2026-03-31');
    expect(occurrenceDate('2024-01-31', 'monthly', 1, 1)).toBe('2024-02-29');
    expect(occurrenceDate('2026-11-30', 'monthly', 3, 1)).toBe('2027-02-28');
    expect(occurrenceDate('2026-12-15', 'monthly', 1, 1)).toBe('2027-01-15');
    expect(occurrenceDate('2026-10-15', 'monthly', 14, 1)).toBe('2027-12-15');
  });
  it('adds years and keeps Feb 29 valid', () => {
    expect(occurrenceDate('2024-02-29', 'yearly', 1, 1)).toBe('2025-02-28');
    expect(occurrenceDate('2024-02-29', 'yearly', 1, 4)).toBe('2028-02-29');
    expect(occurrenceDate('2026-10-20', 'yearly', 2, 1)).toBe('2028-10-20');
  });
  it('formats a local date', () => { expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05'); });
});

describe('which periods are due', () => {
  const base = { baseDate: '2026-08-15', cycle: 'monthly' as const, interval: 1, startIndex: 3, nextIndex: 3, createdCount: 0, finished: false };
  it('starts at the first period after today and treats today as already due', () => {
    expect(firstIndexAfter('2026-08-15', 'monthly', 1, '2026-10-20')).toBe(3);
    expect(firstIndexAfter('2026-08-15', 'monthly', 1, '2026-10-15')).toBe(3);
    expect(firstIndexAfter('2026-12-01', 'monthly', 1, '2026-10-20')).toBe(1);
  });
  it('lists due periods in order up to today, capped', () => {
    const r = { ...base, end: { kind: 'never' as const } };
    expect(dueOccurrences(r, '2026-11-14')).toEqual([]);
    expect(dueOccurrences(r, '2027-01-20').map((o) => o.date)).toEqual(['2026-11-15', '2026-12-15', '2027-01-15']);
    expect(dueOccurrences(r, '2030-01-01', 5)).toHaveLength(5);
  });
  it('respects a count (new records only) and an inclusive end date', () => {
    expect(dueOccurrences({ ...base, end: { kind: 'count', count: 2 } }, '2030-01-01').map((o) => o.index)).toEqual([3, 4]);
    expect(dueOccurrences({ ...base, createdCount: 1, nextIndex: 4, end: { kind: 'count', count: 2 } }, '2030-01-01').map((o) => o.index)).toEqual([4]);
    expect(dueOccurrences({ ...base, end: { kind: 'date', endDate: '2026-12-15' } }, '2030-01-01').map((o) => o.date)).toEqual(['2026-11-15', '2026-12-15']);
    expect(dueOccurrences({ ...base, finished: true, end: { kind: 'never' } }, '2030-01-01')).toEqual([]);
  });
  it('knows when nothing more will ever be made', () => {
    const r = { baseDate: '2026-08-15', cycle: 'monthly' as const, interval: 1 };
    expect(isFinishedAfter({ ...r, end: { kind: 'count', count: 2 } }, 5, 2)).toBe(true);
    expect(isFinishedAfter({ ...r, end: { kind: 'count', count: 2 } }, 4, 1)).toBe(false);
    expect(isFinishedAfter({ ...r, end: { kind: 'date', endDate: '2026-12-31' } }, 8, 5)).toBe(true);
    expect(isFinishedAfter({ ...r, end: { kind: 'never' } }, 99, 99)).toBe(false);
  });
});
