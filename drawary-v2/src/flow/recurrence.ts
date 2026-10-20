import type { RecurrenceCycle, RecurrenceRule } from '../data/types';
import { t } from '../i18n';

/** `YYYY-MM-DD` for a local date. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const parse = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
};
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const fmt = (y: number, m: number, d: number) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * The date of period `k` (1 = one interval after the base). Always counted
 * from the base date, never from the previous period, so a short month
 * (Jan 31 -> Feb 28) does not drag later periods back (Mar 31 stays Mar 31).
 */
export function occurrenceDate(baseISO: string, cycle: RecurrenceCycle, interval: number, k: number): string {
  const [y, m, d] = parse(baseISO);
  if (cycle === 'weekly') {
    const t = new Date(Date.UTC(y, m - 1, d + 7 * interval * k));
    return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  const monthsToAdd = cycle === 'monthly' ? interval * k : 12 * interval * k;
  const total = (y * 12 + (m - 1)) + monthsToAdd;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** The first period whose date is strictly after `todayISO`; earlier periods are history, not made. */
export function firstIndexAfter(baseISO: string, cycle: RecurrenceCycle, interval: number, todayISO: string): number {
  let k = 1;
  while (occurrenceDate(baseISO, cycle, interval, k) <= todayISO) {
    k++;
    if (k > 20000) throw new Error(t('반복 주기를 계산할 수 없어요.'));
  }
  return k;
}

export interface Occurrence { index: number; date: string }

/**
 * The periods a rule should have made by `todayISO` but has not yet, in
 * order, respecting its end condition. At most `cap` are returned so a long
 * absence cannot create hundreds of records in one go (the rest follow on the
 * next run).
 */
export function dueOccurrences(rule: Pick<RecurrenceRule, 'baseDate' | 'cycle' | 'interval' | 'end' | 'startIndex' | 'nextIndex' | 'createdCount' | 'finished'>, todayISO: string, cap = 60): Occurrence[] {
  if (rule.finished) return [];
  const out: Occurrence[] = [];
  let k = rule.nextIndex;
  let made = rule.createdCount;
  while (out.length < cap) {
    if (rule.end.kind === 'count' && made >= rule.end.count) break;
    const date = occurrenceDate(rule.baseDate, rule.cycle, rule.interval, k);
    if (rule.end.kind === 'date' && date > rule.end.endDate) break;
    if (date > todayISO) break;
    out.push({ index: k, date });
    k++; made++;
  }
  return out;
}

/** Whether the rule has nothing left to make (end reached), judged right after a period was made. */
export function isFinishedAfter(rule: Pick<RecurrenceRule, 'baseDate' | 'cycle' | 'interval' | 'end'>, nextIndex: number, createdCount: number): boolean {
  if (rule.end.kind === 'count') return createdCount >= rule.end.count;
  if (rule.end.kind === 'date') return occurrenceDate(rule.baseDate, rule.cycle, rule.interval, nextIndex) > rule.end.endDate;
  return false;
}
