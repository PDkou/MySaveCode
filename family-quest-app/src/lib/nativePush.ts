import { PushNotifications } from '@capacitor/push-notifications';
import type { PermissionState } from '@capacitor/core';

import { supabase } from './supabaseClient';

// FCM registration for the Capacitor-wrapped Android app -- see
// schema.sql section 45's header comment for *why* this is a completely
// separate channel from lib/pushNotifications.ts's Web Push (Android
// WebView doesn't support the Web Push API at all: no background delivery,
// no native permission prompt). Kept in its own file/table so
// lib/pushNotifications.ts's existing Web Push code (used by the PWA/
// browser install) stays untouched -- it just branches to these functions
// on native platforms, so NotificationBell.tsx never has to know which
// channel it's actually using.

export async function checkNativePushPermission(): Promise<PermissionState> {
  const status = await PushNotifications.checkPermissions();
  return status.receive;
}

// register() itself only ever resolves void -- the actual outcome arrives
// later via the 'registration'/'registrationError' events, so this wraps
// that in a promise for callers that just want "give me the token or
// throw". Listeners are attached before calling register() to avoid a race
// where the native side fires the event before anything is listening.
async function registerAndGetFcmToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    void Promise.all([
      PushNotifications.addListener('registration', (token) => settle(() => resolve(token.value))),
      PushNotifications.addListener('registrationError', (err) =>
        settle(() => reject(new Error(err.error || 'push_registration_failed'))),
      ),
    ]).then(() => {
      void PushNotifications.register();
    });
  });
}

export async function subscribeToNativePush(userId: string, familyId: string): Promise<void> {
  let permission = await checkNativePushPermission();
  if (permission === 'prompt' || permission === 'prompt-with-rationale') {
    const result = await PushNotifications.requestPermissions();
    permission = result.receive;
  }
  if (permission !== 'granted') {
    throw new Error('push_permission_denied');
  }

  const token = await registerAndGetFcmToken();
  const { error } = await supabase
    .from('native_push_tokens')
    .upsert({ user_id: userId, family_id: familyId, fcm_token: token }, { onConflict: 'fcm_token' });
  if (error) throw error;
}

export async function unsubscribeFromNativePush(): Promise<void> {
  // No clean way to read back "this device's current token" from the
  // plugin without registering again -- register() is idempotent/cheap
  // (Firebase returns the same token unless it actually rotated), so this
  // just re-registers to learn the token to delete rather than tracking it
  // in memory across the whole app session.
  try {
    const token = await registerAndGetFcmToken();
    await supabase.from('native_push_tokens').delete().eq('fcm_token', token);
  } finally {
    await PushNotifications.unregister();
  }
}
