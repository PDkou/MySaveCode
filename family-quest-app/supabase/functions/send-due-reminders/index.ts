// Deno Edge Function -- deployed via the Supabase dashboard's "Via Editor"
// flow (paste this file's contents into the function's Code tab, no CLI
// needed). Handles two kinds of calls, distinguished by the request body:
//
//   1. Scheduled due-time reminders: invoked with an empty body by the
//      pg_cron job set up in schema.sql section 13.
//   2. Event-driven pushes (task created/assigned, completed, reopened,
//      commented): invoked with { task_id, event, actor_id, comment_body? }
//      by the AFTER INSERT triggers on task_activities/task_comments set up
//      in schema.sql section 15, via the same pg_net mechanism as the cron
//      job -- same URL, same secrets, same "Verify JWT" setting already
//      configured for this function, so no new deploy steps beyond pasting
//      this updated code.
//
// See README.md "Push notifications" for the full deploy walkthrough.
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

type NotifyColumn =
  | 'notify_due'
  | 'notify_created'
  | 'notify_completed'
  | 'notify_reopened'
  | 'notify_comment'
  | 'notify_overdue'
  | 'notify_weekly_summary';

// A missing notification_prefs row means "everything on" (most users never
// touch these toggles), so this only ever *removes* ids whose row explicitly
// turned the given event type off -- it never treats "no row" as opt-out.
async function filterByNotificationPref(
  supabase: SupabaseClient,
  familyId: string,
  userIds: string[],
  column: NotifyColumn,
): Promise<string[]> {
  if (userIds.length === 0) return userIds;
  const { data } = await supabase
    .from('notification_prefs')
    .select(`user_id, ${column}`)
    .eq('family_id', familyId)
    .in('user_id', userIds);
  const optedOut = new Set(
    (data ?? []).filter((row) => row[column] === false).map((row) => row.user_id as string),
  );
  return userIds.filter((id) => !optedOut.has(id));
}

// Sends one push per subscription and cleans up any that have expired
// (404/410) or been unregistered by the browser. Shared by both request
// paths below since the "actually deliver it" step is identical either way.
async function sendToSubscriptions(
  supabase: SupabaseClient,
  subscriptions: PushSubscriptionRow[],
  payload: { title: string; body: string; taskId: string },
): Promise<number> {
  let sentCount = 0;
  const body = JSON.stringify(payload);
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, body);
      sentCount++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
  return sentCount;
}

// ---------------------------------------------------------------------------
// Path 1: scheduled due-time reminders
// ---------------------------------------------------------------------------

const REMINDER_LEAD_MINUTES = 5;
const CATCHUP_WINDOW_MINUTES = 15;

const DUE_BODY_TEXT: Record<string, string> = {
  ko: `${REMINDER_LEAD_MINUTES}분 후 마감이에요! 지금 처리해주세요.`,
  ja: `あと${REMINDER_LEAD_MINUTES}分で期限です! 今のうちに片付けましょう。`,
};

async function handleDueReminders(supabase: SupabaseClient): Promise<Response> {
  const now = new Date();
  const leadMs = REMINDER_LEAD_MINUTES * 60 * 1000;
  const catchupMs = CATCHUP_WINDOW_MINUTES * 60 * 1000;
  const dueAtUpperBound = new Date(now.getTime() + leadMs).toISOString();
  const dueAtLowerBound = new Date(now.getTime() + leadMs - catchupMs).toISOString();

  const { data: dueTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, family_id, due_at, due_reminder_sent_for')
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
    const assigneeIds = (assignees ?? []).map((a) => a.user_id as string);
    const userIds = await filterByNotificationPref(supabase, task.family_id as string, assigneeIds, 'notify_due');

    if (userIds.length > 0) {
      const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
        supabase.from('profiles').select('id, preferred_language').in('id', userIds),
        supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth_key').in('user_id', userIds),
      ]);

      const langById = new Map((profiles ?? []).map((p) => [p.id as string, p.preferred_language as string]));
      const subsByLang = new Map<string, PushSubscriptionRow[]>();
      for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
        const lang = langById.get(sub.user_id) === 'ja' ? 'ja' : 'ko';
        subsByLang.set(lang, [...(subsByLang.get(lang) ?? []), sub]);
      }
      for (const [lang, subs] of subsByLang) {
        sentCount += await sendToSubscriptions(supabase, subs, { title: task.title, body: DUE_BODY_TEXT[lang], taskId: task.id });
      }
    }

    await supabase.from('tasks').update({ due_reminder_sent_for: task.due_at }).eq('id', task.id);
  }

  const escalationSentCount = await runOverdueEscalation(supabase, now);

  return new Response(
    JSON.stringify({
      tasksChecked: eligibleTasks.length,
      notificationsSent: sentCount + escalationSentCount,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

// ---------------------------------------------------------------------------
// Path 1b: overdue escalation -- piggybacks on the same per-minute cron as
// the due reminder above, but fires later (once a task has actually gone
// overdue while still open) and reaches the creator too, not just whoever
// it's assigned to, since the point is raising the whole room's awareness
// rather than a second nudge to the same person.
// ---------------------------------------------------------------------------

const ESCALATION_LEAD_MINUTES = 60;
const ESCALATION_CATCHUP_WINDOW_MINUTES = 15;

const OVERDUE_BODY_TEXT: Record<string, string> = {
  ko: '마감이 지났는데 아직 완료되지 않았어요. 확인해주세요!',
  ja: '期限を過ぎていますが、まだ完了していません。確認してください!',
};

async function runOverdueEscalation(supabase: SupabaseClient, now: Date): Promise<number> {
  const leadMs = ESCALATION_LEAD_MINUTES * 60 * 1000;
  const catchupMs = ESCALATION_CATCHUP_WINDOW_MINUTES * 60 * 1000;
  const dueAtUpperBound = new Date(now.getTime() - leadMs).toISOString();
  const dueAtLowerBound = new Date(now.getTime() - leadMs - catchupMs).toISOString();

  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, family_id, created_by, due_at, overdue_notified_for')
    .eq('status', 'open')
    .lte('due_at', dueAtUpperBound)
    .gt('due_at', dueAtLowerBound);

  const eligibleTasks = (overdueTasks ?? []).filter((task) => task.overdue_notified_for !== task.due_at);
  let sentCount = 0;

  for (const task of eligibleTasks) {
    const { data: assignees } = await supabase.from('task_assignees').select('user_id').eq('task_id', task.id);
    const assigneeIds = (assignees ?? []).map((a) => a.user_id as string);
    const recipientIds = Array.from(new Set([task.created_by as string, ...assigneeIds]));
    const userIds = await filterByNotificationPref(supabase, task.family_id as string, recipientIds, 'notify_overdue');

    if (userIds.length > 0) {
      const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
        supabase.from('profiles').select('id, preferred_language').in('id', userIds),
        supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth_key').in('user_id', userIds),
      ]);

      const langById = new Map((profiles ?? []).map((p) => [p.id as string, p.preferred_language as string]));
      const subsByLang = new Map<string, PushSubscriptionRow[]>();
      for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
        const lang = langById.get(sub.user_id) === 'ja' ? 'ja' : 'ko';
        subsByLang.set(lang, [...(subsByLang.get(lang) ?? []), sub]);
      }
      for (const [lang, subs] of subsByLang) {
        sentCount += await sendToSubscriptions(supabase, subs, { title: task.title, body: OVERDUE_BODY_TEXT[lang], taskId: task.id });
      }
    }

    await supabase.from('tasks').update({ overdue_notified_for: task.due_at }).eq('id', task.id);
  }

  return sentCount;
}

// ---------------------------------------------------------------------------
// Path 3: weekly summary -- a per-family completion digest sent once a week
// to every opted-in member, dispatched on its own cron schedule (see schema
// section 17) via a { weekly_summary: true } body, distinct from path 1's
// empty-body call.
// ---------------------------------------------------------------------------

const WEEKLY_SUMMARY_TITLE: Record<string, string> = {
  ko: '주간 리포트',
  ja: '週間レポート',
};

function buildWeeklySummaryBody(lang: string, total: number, mvpName: string | null, mvpCount: number): string {
  if (total === 0) {
    return lang === 'ja' ? '今週完了したクエストはまだありません。' : '이번 주에 완료한 퀘스트가 아직 없어요.';
  }
  if (mvpName) {
    return lang === 'ja'
      ? `今週の完了は${total}件! MVPは${mvpName}さん(${mvpCount}件)`
      : `이번 주 완료 ${total}개! MVP는 ${mvpName}님 (${mvpCount}개)`;
  }
  return lang === 'ja' ? `今週の完了は${total}件でした。` : `이번 주 완료 ${total}개예요.`;
}

async function handleWeeklySummary(supabase: SupabaseClient): Promise<Response> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subscriptionFamilies } = await supabase.from('push_subscriptions').select('family_id');
  const familyIds = Array.from(new Set((subscriptionFamilies ?? []).map((r) => r.family_id as string)));
  let sentCount = 0;

  for (const familyId of familyIds) {
    // Sourced from quest_payouts (kind='completion' and reputation_awarded)
    // rather than raw tasks.status='done'/completed_by, to match how
    // compute_weekly_mvp() and the client's own WeeklyBreakdownModal define
    // "completed this week" -- a self-completed specific/first-come quest
    // sets tasks.completed_by but earns no reputation, and an "everyone"
    // quest credits every assignee, not just whichever one triggered it.
    const { data: payouts } = await supabase
      .from('quest_payouts')
      .select('user_id')
      .eq('family_id', familyId)
      .eq('kind', 'completion')
      .eq('reputation_awarded', true)
      .gte('created_at', weekAgo);

    const total = (payouts ?? []).length;
    const countByUser = new Map<string, number>();
    (payouts ?? []).forEach((row) => {
      const userId = row.user_id as string;
      countByUser.set(userId, (countByUser.get(userId) ?? 0) + 1);
    });

    let mvpUserId: string | null = null;
    let mvpCount = 0;
    for (const [userId, count] of countByUser) {
      if (count > mvpCount) {
        mvpUserId = userId;
        mvpCount = count;
      }
    }

    const { data: memberRows } = await supabase.from('family_members').select('user_id').eq('family_id', familyId);
    const memberIds = (memberRows ?? []).map((m) => m.user_id as string);
    const recipientIds = await filterByNotificationPref(supabase, familyId, memberIds, 'notify_weekly_summary');
    if (recipientIds.length === 0) continue;

    const [{ data: profiles }, { data: subscriptions }, { data: mvpMember }] = await Promise.all([
      supabase.from('profiles').select('id, preferred_language').in('id', recipientIds),
      supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth_key').in('user_id', recipientIds),
      mvpUserId
        ? supabase.from('family_members').select('display_name').eq('family_id', familyId).eq('user_id', mvpUserId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const mvpName = (mvpMember?.display_name as string | null | undefined) ?? null;
    const langById = new Map((profiles ?? []).map((p) => [p.id as string, p.preferred_language as string]));
    const subsByLang = new Map<string, PushSubscriptionRow[]>();
    for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
      const lang = langById.get(sub.user_id) === 'ja' ? 'ja' : 'ko';
      subsByLang.set(lang, [...(subsByLang.get(lang) ?? []), sub]);
    }
    for (const [lang, subs] of subsByLang) {
      const body = buildWeeklySummaryBody(lang, total, mvpName, mvpCount);
      sentCount += await sendToSubscriptions(supabase, subs, { title: WEEKLY_SUMMARY_TITLE[lang], body, taskId: '' });
    }
  }

  return new Response(JSON.stringify({ familiesChecked: familyIds.length, notificationsSent: sentCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Path 2: event-driven pushes (created/assigned, completed, reopened,
// commented) -- fired immediately by a DB trigger, not on a schedule.
// ---------------------------------------------------------------------------

interface TaskEventPayload {
  task_id: string;
  event: 'created' | 'completed' | 'reopened' | 'comment';
  actor_id: string;
  comment_body?: string;
}

const EVENT_BODY_TEXT: Record<TaskEventPayload['event'], Record<string, (actorName: string, extra: string) => string>> = {
  created: {
    ko: (name) => `${name}님이 새 퀘스트를 배정했어요`,
    ja: (name) => `${name}さんが新しいクエストを割り当てました`,
  },
  completed: {
    ko: (name) => `${name}님이 퀘스트를 완료했어요`,
    ja: (name) => `${name}さんがクエストを完了しました`,
  },
  reopened: {
    ko: (name) => `${name}님이 퀘스트를 다시 진행 상태로 되돌렸어요`,
    ja: (name) => `${name}さんがクエストを進行中に戻しました`,
  },
  comment: {
    ko: (name, extra) => `${name}: ${extra}`,
    ja: (name, extra) => `${name}: ${extra}`,
  },
};

function isTaskEventPayload(value: unknown): value is TaskEventPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.task_id === 'string' && typeof v.event === 'string' && typeof v.actor_id === 'string';
}

async function handleTaskEvent(supabase: SupabaseClient, payload: TaskEventPayload): Promise<Response> {
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, family_id, created_by')
    .eq('id', payload.task_id)
    .maybeSingle();

  if (!task) {
    return new Response(JSON.stringify({ notificationsSent: 0, reason: 'task_not_found' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: assigneeRows } = await supabase.from('task_assignees').select('user_id').eq('task_id', task.id);
  const assigneeIds = (assigneeRows ?? []).map((a) => a.user_id as string);

  // Same relevance rule as the in-app notification bell: "created" only
  // reaches whoever was assigned; completed/reopened/comment reach the
  // task's creator and every assignee. The actor never gets a push for
  // their own action.
  const eventToColumn: Record<TaskEventPayload['event'], NotifyColumn> = {
    created: 'notify_created',
    completed: 'notify_completed',
    reopened: 'notify_reopened',
    comment: 'notify_comment',
  };
  const relevantIds = Array.from(
    new Set(payload.event === 'created' ? assigneeIds : [task.created_by, ...assigneeIds]),
  ).filter((id) => id !== payload.actor_id);
  const recipientIds = await filterByNotificationPref(
    supabase,
    task.family_id as string,
    relevantIds,
    eventToColumn[payload.event],
  );

  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ notificationsSent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [{ data: actorMember }, { data: actorProfile }, { data: profiles }, { data: subscriptions }] = await Promise.all([
    supabase.from('family_members').select('display_name').eq('family_id', task.family_id).eq('user_id', payload.actor_id).maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', payload.actor_id).maybeSingle(),
    supabase.from('profiles').select('id, preferred_language').in('id', recipientIds),
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth_key').in('user_id', recipientIds),
  ]);

  const actorName = (actorMember?.display_name as string | null)?.trim() || (actorProfile?.display_name as string | undefined) || '';
  const commentPreview = (payload.comment_body ?? '').slice(0, 80);
  const langById = new Map((profiles ?? []).map((p) => [p.id as string, p.preferred_language as string]));

  const subsByLang = new Map<string, PushSubscriptionRow[]>();
  for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
    const lang = langById.get(sub.user_id) === 'ja' ? 'ja' : 'ko';
    subsByLang.set(lang, [...(subsByLang.get(lang) ?? []), sub]);
  }

  let sentCount = 0;
  for (const [lang, subs] of subsByLang) {
    const template = EVENT_BODY_TEXT[payload.event][lang];
    const body = template(actorName, commentPreview);
    sentCount += await sendToSubscriptions(supabase, subs, { title: task.title, body, taskId: task.id });
  }

  return new Response(JSON.stringify({ notificationsSent: sentCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (isTaskEventPayload(body)) {
    return handleTaskEvent(supabase, body);
  }

  if (body && typeof body === 'object' && (body as Record<string, unknown>).weekly_summary === true) {
    return handleWeeklySummary(supabase);
  }

  return handleDueReminders(supabase);
});
