import type { Drawer, Field, RecordItem } from '../data/types';
import { summarizeRecord } from './recordForm';
import { t, K } from '../i18n';

export interface StatsData {
  drawerCount: number;
  itemCount: number;
  /** Items added in the current calendar month, and how that differs from last month. */
  monthlyAdded: number;
  monthlyDelta: number;
  /** Last 6 months (oldest first); `label` is already in the app language. */
  monthly: { label: string; count: number }[];
  /** Dates still to come in the next 30 days, and the days until the very next one (null: none at all). */
  upcomingCount: number;
  nearestUpcomingDays: number | null;
  upcoming: { key: string; daysAway: number; drawerName: string; description: string }[];
  insights: { drawerId: string; drawerName: string; itemCount: number; insightLabel: string; tint: 'pink' | 'lavender' | 'green' | 'peach' }[];
}

const TINTS = ['pink', 'lavender', 'green', 'peach'] as const;
export const UPCOMING_WINDOW_DAYS = 30;
export const MONTHS_SHOWN = 6;

const dayNumber = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);

/** `YYYY-MM-DD` of a date field -> day number, or null when it is not a real date. */
function isoDay(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? dayNumber(y, mo, d) : null;
}

/** Everything the 통계 screen shows, counted from the saved data. `monthLabel` names a month in the app language. */
export function computeStats(
  drawers: readonly Drawer[], fields: readonly Field[], records: readonly RecordItem[],
  now: Date, monthLabel: (d: Date) => string,
): StatsData {
  const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const thisMonth = monthIndex(now);
  const perMonth = new Map<number, number>();
  for (const r of records) { const k = monthIndex(new Date(r.createdAt)); perMonth.set(k, (perMonth.get(k) ?? 0) + 1); }
  const monthly = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const k = thisMonth - (MONTHS_SHOWN - 1 - i);
    return { label: monthLabel(new Date(Math.floor(k / 12), k % 12, 1)), count: perMonth.get(k) ?? 0 };
  });
  const monthlyAdded = perMonth.get(thisMonth) ?? 0;
  const monthlyDelta = monthlyAdded - (perMonth.get(thisMonth - 1) ?? 0);

  const today = dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const drawerName = new Map(drawers.map((d) => [d.id, d.name]));
  const fieldsOf = (id: string) => fields.filter((f) => f.drawerId === id);
  const dates: { key: string; daysAway: number; drawerId: string; description: string }[] = [];
  for (const r of records) {
    const fs = fieldsOf(r.drawerId);
    const title = summarizeRecord(fs, r).title;
    for (const f of fs) {
      if (f.kind !== 'date') continue;
      const day = isoDay(r.values[f.id]);
      if (day !== null && day >= today) dates.push({ key: `${r.id}:${f.id}`, daysAway: day - today, drawerId: r.drawerId, description: `${title} ${f.name}` });
    }
  }
  dates.sort((a, b) => a.daysAway - b.daysAway || a.key.localeCompare(b.key));
  const soon = dates.filter((x) => x.daysAway <= UPCOMING_WINDOW_DAYS);

  const countOf = new Map<string, number>(); const addedOf = new Map<string, number>(); const soonOf = new Map<string, number>();
  for (const r of records) {
    countOf.set(r.drawerId, (countOf.get(r.drawerId) ?? 0) + 1);
    if (monthIndex(new Date(r.createdAt)) === thisMonth) addedOf.set(r.drawerId, (addedOf.get(r.drawerId) ?? 0) + 1);
  }
  for (const x of soon) soonOf.set(x.drawerId, (soonOf.get(x.drawerId) ?? 0) + 1);
  const ranked = drawers.map((d, order) => ({ d, order, n: countOf.get(d.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.order - b.order).slice(0, 4);
  const insights = ranked.map(({ d, n }, i) => {
    const upcomingHere = soonOf.get(d.id) ?? 0; const addedHere = addedOf.get(d.id) ?? 0;
    const label = i === 0 && n > 0 ? K('보관품이 가장 많은 서랍')
      : upcomingHere > 0 ? t('다가오는 일정 {n}건', { n: upcomingHere })
      : addedHere > 0 ? t('이번 달 추가 {n}개', { n: addedHere })
      : K('서랍 열기');
    return { drawerId: d.id, drawerName: d.name, itemCount: n, insightLabel: label, tint: TINTS[i % TINTS.length] };
  });

  return {
    drawerCount: drawers.length, itemCount: records.length, monthlyAdded, monthlyDelta, monthly,
    upcomingCount: soon.length, nearestUpcomingDays: dates.length ? dates[0].daysAway : null,
    upcoming: dates.slice(0, 3).map((x) => ({ key: x.key, daysAway: x.daysAway, drawerName: drawerName.get(x.drawerId) ?? '', description: x.description })),
    insights,
  };
}
