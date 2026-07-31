const LOCALE_MAP: Record<string, string> = {
  ko: 'ko-KR',
  ja: 'ja-JP',
};

export function formatDateTime(iso: string | null, language: string): string {
  if (!iso) return '';
  const locale = LOCALE_MAP[language] ?? 'ko-KR';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

// See TimePickerField.tsx's ALL_DAY_TIME comment -- 23:59 local time is the
// sentinel for "종일" since due_at has no separate all-day column.
export function isAllDayTime(iso: string): boolean {
  const d = new Date(iso);
  return d.getHours() === 23 && d.getMinutes() === 59;
}

// Same as formatDateTime, but swaps the time portion for an "종일" label
// when due_at carries the all-day sentinel -- used everywhere a due_at
// (never starts_at, which has no all-day concept) is shown to the user.
export function formatDueDateTime(iso: string | null, language: string, allDayLabel: string): string {
  if (!iso) return '';
  if (isAllDayTime(iso)) {
    const locale = LOCALE_MAP[language] ?? 'ko-KR';
    const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
    return `${dateLabel} (${allDayLabel})`;
  }
  return formatDateTime(iso, language);
}

export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Default value for a brand-new task's date fields -- today's date, same
// default 09:00 time DueDateTimeFields already falls back to elsewhere.
export function todayDateTimeLocalValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

// Monday 00:00 of the current calendar week, local time.
export function startOfThisWeek(): Date {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
