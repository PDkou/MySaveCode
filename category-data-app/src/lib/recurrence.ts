import type { AppData, Entry, RecurrenceUnit } from '../types';
import { newId } from './id';

// Safety cap on how many occurrences a single recurring entry can spawn
// in one catch-up pass -- protects against a pathological case (the app
// not opened for years) turning into thousands of generated entries at
// once. A monthly recurrence capped at 24 still covers 2 years of
// catch-up in a single pass; anything beyond that catches up further on
// the next app open.
const MAX_GENERATIONS_PER_ENTRY = 24;

// Advances a date by one occurrence, clamping the day-of-month so e.g. a
// Jan 31 monthly recurrence lands on Feb 28 (not March 3, which is what
// plain `Date#setMonth` rollover would produce).
function addOccurrence(d: Date, unit: RecurrenceUnit): Date {
  if (unit === 'weekly') {
    const next = new Date(d);
    next.setDate(next.getDate() + 7);
    return next;
  }
  const monthsToAdd = unit === 'monthly' ? 1 : 12;
  const day = d.getDate();
  const next = new Date(d.getFullYear(), d.getMonth() + monthsToAdd, 1);
  const lastDayOfTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDayOfTargetMonth));
  return next;
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface RecurrenceResult {
  newEntries: Entry[];
  // Entries (existing or freshly generated within this same pass) whose
  // `recurrence` should be cleared -- each has already spawned its
  // successor, so only the newest entry in a chain stays "live".
  clearedEntryIds: string[];
}

// Runs once per app load (useAppData) -- for every entry flagged
// recurring whose anchor date has passed, generates the next
// occurrence(s) (copying its values, with the anchor date advanced),
// repeating until caught up to today. Purely local/in-app: this only
// runs when the app happens to be open, same caveat as the date-field
// reminders it sits next to (lib/reminders.ts) -- it does not schedule
// anything for while the app is closed.
export function generateDueRecurrences(data: AppData): RecurrenceResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newEntries: Entry[] = [];
  const clearedEntryIds: string[] = [];

  for (const entry of data.entries) {
    if (!entry.recurrence) continue;
    const { unit, anchorFieldId } = entry.recurrence;
    const raw = entry.values[anchorFieldId];
    if (!raw) continue;
    let current = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(current.getTime())) continue;

    let latest = entry;
    for (let i = 0; i < MAX_GENERATIONS_PER_ENTRY; i++) {
      const next = addOccurrence(current, unit);
      if (next.getTime() > today.getTime()) break;

      const now = Date.now();
      const generated: Entry = {
        id: newId(),
        categoryId: latest.categoryId,
        values: { ...latest.values, [anchorFieldId]: toDateInputValue(next) },
        reminders: latest.reminders,
        recurrence: latest.recurrence,
        createdAt: now,
        updatedAt: now,
      };
      newEntries.push(generated);
      clearedEntryIds.push(latest.id);
      latest = generated;
      current = next;
    }
  }

  return { newEntries, clearedEntryIds };
}
