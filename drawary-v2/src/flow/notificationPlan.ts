import type { Drawer, Field, NotificationRule, RecordItem } from '../data/types';
import { summarizeRecord } from './recordForm';

export interface PlannedNotification {
  /** Stable per rule+record, so the native side can replace instead of duplicate. */
  key: string;
  /** Epoch milliseconds (local time of the device). */
  fireAt: number;
  title: string;
  body: string;
  drawerId: string;
  recordId: string;
  ruleId: string;
}

/**
 * The notifications that are still to come, soonest first: for each rule and
 * each record of its drawer with a date in the rule's field, "N days before
 * that date at the rule's time". Dates already past are skipped, as are
 * notifications whose moment has gone. This only reads dates; it has nothing
 * to do with recurrence (records a recurrence rule makes simply have dates too).
 * `limit` keeps the list short enough for the phone's alarm quota.
 */
export function computeNotificationPlan(input: {
  rules: readonly NotificationRule[];
  drawers: readonly Drawer[];
  fields: readonly Field[];
  records: readonly RecordItem[];
  now: number;
  limit?: number;
}): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (const rule of input.rules) {
    const drawer = input.drawers.find((d) => d.id === rule.drawerId);
    const drawerFields = input.fields.filter((f) => f.drawerId === rule.drawerId);
    const field = drawerFields.find((f) => f.id === rule.fieldId);
    if (!drawer || !field || field.kind !== 'date') continue;
    const [hh, mm] = rule.time.split(':').map(Number);
    for (const record of input.records) {
      if (record.drawerId !== rule.drawerId) continue;
      const v = record.values[rule.fieldId];
      const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
      if (!m) continue;
      const fireAt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - rule.daysBefore, hh, mm, 0, 0).getTime();
      if (fireAt <= input.now) continue;
      const title = summarizeRecord(drawerFields, record).title;
      out.push({
        key: `${rule.id}:${record.id}`, fireAt, drawerId: drawer.id, recordId: record.id, ruleId: rule.id,
        title: drawer.name,
        body: `${title} · ${field.name} ${rule.daysBefore === 0 ? '당일' : `${rule.daysBefore}일 전`}`,
      });
    }
  }
  out.sort((a, b) => a.fireAt - b.fireAt || a.key.localeCompare(b.key));
  return out.slice(0, input.limit ?? 60);
}
