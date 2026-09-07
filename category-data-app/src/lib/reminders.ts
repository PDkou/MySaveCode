import type { AppData, Category, Entry } from '../types';
import { formatFieldValue } from './format';

export interface UpcomingReminder {
  entryId: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  fieldName: string;
  dateValue: string; // raw YYYY-MM-DD
  diffDays: number; // negative = overdue, 0 = today, positive = upcoming
}

// How far back/forward Home's "다가오는 일정" panel looks. Long-overdue
// items age out after LOOKBACK_DAYS instead of accumulating forever --
// this is a lightweight nudge, not a task list, so a flagged date nobody
// acted on eventually just falls off rather than guilt-tripping forever.
const LOOKBACK_DAYS = 14;
const LOOKAHEAD_DAYS = 14;

// Surfaces flagged dates whenever the app happens to be open -- on the
// plain web/PWA build, that's the entire reminder experience. The native
// Android wrapper (drawary-app/) additionally schedules a real OS
// notification for each one via hooks/useReminderSync.ts and
// getAllActiveReminders() below, so an Android install gets notified
// even while the app isn't running; this function stays windowed and
// purely in-app-panel-focused either way.
export function getUpcomingReminders(data: AppData): UpcomingReminder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: UpcomingReminder[] = [];

  for (const entry of data.entries) {
    if (!entry.reminders) continue;
    const category = data.categories.find((c) => c.id === entry.categoryId);
    if (!category) continue;

    for (const [fieldId, on] of Object.entries(entry.reminders)) {
      if (!on) continue;
      const field = category.fields.find((f) => f.id === fieldId);
      if (!field || field.type !== 'date') continue;
      const raw = entry.values[fieldId];
      if (!raw) continue;
      const d = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;

      const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      if (diffDays < -LOOKBACK_DAYS || diffDays > LOOKAHEAD_DAYS) continue;

      result.push({
        entryId: entry.id,
        categoryId: category.id,
        categoryName: category.name,
        categoryEmoji: category.emoji,
        fieldName: field.name,
        dateValue: raw,
        diffDays,
      });
    }
  }

  result.sort((a, b) => a.diffDays - b.diffDays);
  return result;
}

export interface NativeReminderTarget {
  key: string; // `${entryId}:${fieldId}` -- matches ReminderScheduler's alarm key on the native side
  atMillis: number;
  title: string;
  body: string;
}

// The local time of day a native notification fires on its date -- see
// getAllActiveReminders() below.
const NOTIFY_HOUR = 9;

function summarizeEntry(category: Category, entry: Entry): string {
  const parts = category.fields
    .slice(0, 3)
    .map((f) => formatFieldValue(f, entry.values[f.id]))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : category.name;
}

// Every still-upcoming (today or later) flagged reminder, regardless of
// getUpcomingReminders' +/-14-day display window -- this is what
// hooks/useReminderSync.ts arms as real native alarms on Android, and a
// reminder 60 days out deserves a real alarm just as much as one due
// tomorrow (Home's panel just doesn't bother *showing* it yet). Already-
// passed dates are excluded -- those are the in-app panel's "지남" rows
// to surface, not something worth a push notification for after the
// fact.
export function getAllActiveReminders(data: AppData): NativeReminderTarget[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: NativeReminderTarget[] = [];

  for (const entry of data.entries) {
    if (!entry.reminders) continue;
    const category = data.categories.find((c) => c.id === entry.categoryId);
    if (!category) continue;

    for (const [fieldId, on] of Object.entries(entry.reminders)) {
      if (!on) continue;
      const field = category.fields.find((f) => f.id === fieldId);
      if (!field || field.type !== 'date') continue;
      const raw = entry.values[fieldId];
      if (!raw) continue;
      const d = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getTime() < today.getTime()) continue;

      d.setHours(NOTIFY_HOUR, 0, 0, 0);
      result.push({
        key: `${entry.id}:${fieldId}`,
        atMillis: d.getTime(),
        title: `${category.name} · ${field.name}`,
        body: summarizeEntry(category, entry),
      });
    }
  }

  return result;
}
