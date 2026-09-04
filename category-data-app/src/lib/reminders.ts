import type { AppData } from '../types';

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

// Purely in-app: this surfaces flagged dates whenever the app happens to
// be open, it does not schedule an OS notification while the app is
// closed. A bare PWA has no reliable way to do that at all, and even the
// native Android wrapper (drawary-app/) would need its own AlarmManager
// work to fire a notification while the app isn't running -- out of scope
// here, see the app's CLAUDE.md-adjacent discussion.
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
