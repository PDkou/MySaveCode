import { t } from '../i18n';
/**
 * "알림 공통 설정": the default time for new notifications and the 알림 쉬는
 * 시간 (quiet hours). Saved as one setting; applies to every drawer.
 */
export interface NotifyCommon {
  /** `HH:MM`, what #31 starts with. */
  defaultTime: string;
  quietEnabled: boolean;
  /** `HH:MM`. May be later than `quietEnd` (a window that crosses midnight, e.g. 22:00-07:00). */
  quietStart: string;
  quietEnd: string;
}

export const NOTIFY_COMMON_KEY = 'notify.common';

export const DEFAULT_NOTIFY_COMMON: NotifyCommon = { defaultTime: '09:00', quietEnabled: false, quietStart: '22:00', quietEnd: '07:00' };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Reads the saved setting, falling back field by field to the defaults if anything is missing or malformed. */
export function readNotifyCommon(settings: Record<string, unknown>): NotifyCommon {
  const raw = settings[NOTIFY_COMMON_KEY];
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<NotifyCommon>;
  const time = (v: unknown, fallback: string) => (typeof v === 'string' && TIME_RE.test(v) ? v : fallback);
  return {
    defaultTime: time(r.defaultTime, DEFAULT_NOTIFY_COMMON.defaultTime),
    quietEnabled: r.quietEnabled === true,
    quietStart: time(r.quietStart, DEFAULT_NOTIFY_COMMON.quietStart),
    quietEnd: time(r.quietEnd, DEFAULT_NOTIFY_COMMON.quietEnd),
  };
}

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Whether a time of day falls inside the quiet window (start inclusive, end exclusive). */
export function inQuietHours(timeOfDay: string, c: Pick<NotifyCommon, 'quietEnabled' | 'quietStart' | 'quietEnd'>): boolean {
  if (!c.quietEnabled) return false;
  const m = minutes(timeOfDay); const s = minutes(c.quietStart); const e = minutes(c.quietEnd);
  if (s === e) return false;
  return s < e ? m >= s && m < e : m >= s || m < e;
}

/**
 * A notification that would ring during quiet hours rings when they end
 * instead (the same day if the window ends later today, otherwise the next
 * morning). Nothing is dropped.
 */
export function applyQuietHours(fireAt: number, c: Pick<NotifyCommon, 'quietEnabled' | 'quietStart' | 'quietEnd'>): number {
  const d = new Date(fireAt);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (!inQuietHours(hhmm, c)) return fireAt;
  const [eh, em] = [Number(c.quietEnd.slice(0, 2)), Number(c.quietEnd.slice(3, 5))];
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0, 0);
  if (end.getTime() <= fireAt) end.setDate(end.getDate() + 1);
  return end.getTime();
}

/** "22:00 ~ 07:00 (다음 날)" for the settings screen. */
export function quietSummary(c: Pick<NotifyCommon, 'quietStart' | 'quietEnd'>): string {
  const cross = minutes(c.quietStart) > minutes(c.quietEnd);
  return `${c.quietStart} ~ ${c.quietEnd}${cross ? t(' (다음 날)') : ''}`;
}
