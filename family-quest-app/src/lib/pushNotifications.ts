import { supabase } from './supabaseClient';
import type { NotificationPrefsRow } from '../types/database';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export type NotificationEventType = 'due' | 'created' | 'completed' | 'reopened' | 'comment' | 'overdue' | 'weeklySummary';

const DEFAULT_PREFS: Record<NotificationEventType, boolean> = {
  due: true,
  created: true,
  completed: true,
  reopened: true,
  comment: true,
  overdue: true,
  weeklySummary: true,
};

// No row yet (the common case -- most people never touch these toggles)
// means "everything on", matching the Edge Function's own default.
export async function getNotificationPrefs(userId: string, familyId: string): Promise<Record<NotificationEventType, boolean>> {
  const { data } = await supabase
    .from('notification_prefs')
    .select('notify_due, notify_created, notify_completed, notify_reopened, notify_comment, notify_overdue, notify_weekly_summary')
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_PREFS };
  return {
    due: data.notify_due,
    created: data.notify_created,
    completed: data.notify_completed,
    reopened: data.notify_reopened,
    comment: data.notify_comment,
    overdue: data.notify_overdue,
    weeklySummary: data.notify_weekly_summary,
  };
}

export async function setNotificationPref(
  userId: string,
  familyId: string,
  eventType: NotificationEventType,
  enabled: boolean,
): Promise<void> {
  const columnUpdate: Partial<NotificationPrefsRow> = {
    due: { notify_due: enabled },
    created: { notify_created: enabled },
    completed: { notify_completed: enabled },
    reopened: { notify_reopened: enabled },
    comment: { notify_comment: enabled },
    overdue: { notify_overdue: enabled },
    weeklySummary: { notify_weekly_summary: enabled },
  }[eventType];
  const { error } = await supabase
    .from('notification_prefs')
    .upsert({ user_id: userId, family_id: familyId, ...columnUpdate }, { onConflict: 'user_id,family_id' });
  if (error) throw error;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY
  );
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'subscribed' : 'unsubscribed';
}

export async function subscribeToPush(userId: string, familyId: string): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    throw new Error('push_unsupported');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('push_permission_denied');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      family_id: familyId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth_key: json.keys?.auth ?? '',
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
