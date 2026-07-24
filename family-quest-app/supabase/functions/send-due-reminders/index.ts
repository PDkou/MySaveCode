// Deno Edge Function -- deployed separately from the main app via the
// Supabase CLI or the dashboard's "Via Editor" flow, then invoked on a
// schedule by the pg_cron job set up in schema.sql section 13. See
// README.md "Push notifications" for the full deploy walkthrough.
//
// Finds tasks whose due time is coming up soon, sends a Web Push
// notification to each assignee's subscribed devices, and marks the task
// so it isn't re-notified on the next run.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Notify this many minutes before due_at rather than exactly at due_at, so
// there's still time to act on the reminder.
const REMINDER_LEAD_MINUTES = 5;
// How far back a missed cron tick can still catch up (the
// due_reminder_sent_for check is what actually prevents duplicates, not
// this window -- it just bounds how late a recovery can be).
const CATCHUP_WINDOW_MINUTES = 15;

// Reminder text is only ever this one sentence, so a tiny inline dictionary
// keyed off the assignee's saved preferred_language is simpler than pulling
// in the app's full i18next setup for a Deno function.
const BODY_TEXT: Record<string, string> = {
  ko: `${REMINDER_LEAD_MINUTES}분 후 마감이에요! 지금 처리해주세요.`,
  ja: `あと${REMINDER_LEAD_MINUTES}分で期限です! 今のうちに片付けましょう。`,
};

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const now = new Date();
  const leadMs = REMINDER_LEAD_MINUTES * 60 * 1000;
  const catchupMs = CATCHUP_WINDOW_MINUTES * 60 * 1000;
  // A task is eligible once (due_at - lead) has passed -- i.e. due_at is at
  // most `lead` minutes away -- and stays eligible for `catchup` minutes
  // after that point in case a run was missed.
  const dueAtUpperBound = new Date(now.getTime() + leadMs).toISOString();
  const dueAtLowerBound = new Date(now.getTime() + leadMs - catchupMs).toISOString();

  const { data: dueTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, due_at, due_reminder_sent_for')
    .eq('status', 'open')
    .lte('due_at', dueAtUpperBound)
    .gt('due_at', dueAtLowerBound);

  if (tasksError) {
    return new Response(JSON.stringify({ error: tasksError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const eligibleTasks = (dueTasks ?? []).filter((task) => task.due_reminder_sent_for !== task.due_at);
  let sentCount = 0;

  for (const task of eligibleTasks) {
    const { data: assignees } = await supabase.from('task_assignees').select('user_id').eq('task_id', task.id);
    const userIds = (assignees ?? []).map((a) => a.user_id as string);

    if (userIds.length > 0) {
      const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
        supabase.from('profiles').select('id, preferred_language').in('id', userIds),
        supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth_key').in('user_id', userIds),
      ]);

      const langById = new Map((profiles ?? []).map((p) => [p.id as string, p.preferred_language as string]));

      for (const sub of subscriptions ?? []) {
        const lang = langById.get(sub.user_id as string) === 'ja' ? 'ja' : 'ko';
        const payload = JSON.stringify({ title: task.title, body: BODY_TEXT[lang], taskId: task.id });

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth_key as string } },
            payload,
          );
          sentCount++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription expired or the browser unregistered it -- clean
            // it up so future runs don't keep retrying a dead endpoint.
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }
    }

    await supabase.from('tasks').update({ due_reminder_sent_for: task.due_at }).eq('id', task.id);
  }

  return new Response(JSON.stringify({ tasksChecked: eligibleTasks.length, notificationsSent: sentCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
