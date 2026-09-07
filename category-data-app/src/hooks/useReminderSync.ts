import { useEffect, useRef } from 'react';
import type { AppData } from '../types';
import { getAllActiveReminders } from '../lib/reminders';
import { getNativeBridge } from '../lib/native';

// Keeps the native Android alarms (drawary-app's ReminderScheduler, via
// DrawaryNativeBridge) in sync with whatever date-field reminders are
// currently flagged in AppData. Runs after every data change; rather
// than tracking exactly what changed, it just diffs the full "desired"
// set (getAllActiveReminders) against what this hook itself scheduled
// last time and cancels what dropped out -- re-arming an already-
// scheduled key is a cheap PendingIntent replace on the native side, so
// there's no harm in always re-sending every still-active one.
//
// A complete no-op on the plain web/PWA build (no DrawaryNativeBridge to
// call) -- that build's reminder experience stays exactly the in-app
// "다가오는 일정" panel it already had.
export function useReminderSync(data: AppData): void {
  const scheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const native = getNativeBridge();
    if (!native?.scheduleReminder || !native.cancelReminder) return;

    const targets = getAllActiveReminders(data);
    const desiredKeys = new Set(targets.map((t) => t.key));

    for (const key of scheduledRef.current) {
      if (!desiredKeys.has(key)) native.cancelReminder(key);
    }
    for (const t of targets) {
      native.scheduleReminder(t.key, t.atMillis, t.title, t.body);
    }
    scheduledRef.current = desiredKeys;
  }, [data]);
}
