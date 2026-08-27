package com.howlingcreativestudio.hellotoday;

import android.app.*;
import android.content.*;
import android.os.Build;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent source) {
        String language = c.getSharedPreferences("hello_today_preferences", Context.MODE_PRIVATE).getString("language", "en");
        long personId = source.getLongExtra("personId", -1L);
        if (personId >= 0L) ReminderScheduler.markDelivered(c, personId);
        String channel = "gentle_reminders";
        NotificationManager nm = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel nc = new NotificationChannel(channel, text(language, "Contact reminders", "連絡リマインダー", "연락 알림"), NotificationManager.IMPORTANCE_DEFAULT);
            nc.setDescription(text(language, "Reminders for people you want to contact", "連絡したい相手の通知", "등록한 사람의 연락 시기를 알려줍니다"));
            nm.createNotificationChannel(nc);
        }
        String name = source.getStringExtra("name");
        int interval = source.getIntExtra("interval", 7);
        int notifyHour = source.getIntExtra("notifyHour", 10);
        int notifyMinute = source.getIntExtra("notifyMinute", 0);
        String reminderMode = source.getStringExtra("reminderMode");
        int minDays = source.getIntExtra("minDays", 14);
        int maxDays = source.getIntExtra("maxDays", 28);
        boolean isTest = personId == ReminderScheduler.TEST_REMINDER_ID;
        int notificationId = (int) (personId & 0x7fffffff);
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        open.putExtra("openPersonId", personId);
        PendingIntent pi = PendingIntent.getActivity(c, notificationId, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent complete = actionIntent(c, personId, name, interval, notifyHour, notifyMinute, reminderMode, minDays, maxDays, notificationId, "complete", notificationId + 100000);
        PendingIntent snooze = actionIntent(c, personId, name, interval, notifyHour, notifyMinute, reminderMode, minDays, maxDays, notificationId, "snooze", notificationId + 200000);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_dialog_info)
         .setContentTitle(isTest ? "Hello, Today · " + text(language, "Test reminder", "テスト通知", "테스트 알림") : "Hello, Today · " + (name == null || name.trim().isEmpty() ? text(language, "Contact reminder", "連絡リマインダー", "연락 알림") : name))
         .setContentText(isTest ? text(language, "Try the buttons below.", "下のボタンを試してください。", "아래 버튼을 눌러보세요.") : text(language, "Time to reach out.", "そろそろ連絡しませんか？", "연락할 때예요."))
         .setContentIntent(pi).setAutoCancel(true)
         .addAction(new Notification.Action.Builder(null, text(language, "I reached out", "連絡しました", "연락했어요"), complete).build())
         .addAction(new Notification.Action.Builder(null, text(language, "Tomorrow", "明日また", "내일 다시"), snooze).build());
        nm.notify(notificationId, b.build());
    }

    private String text(String language, String en, String ja, String ko) {
        return "ko".equals(language) ? ko : "ja".equals(language) ? ja : en;
    }

    private PendingIntent actionIntent(Context c, long personId, String name, int interval, int notifyHour, int notifyMinute, String reminderMode, int minDays, int maxDays, int notificationId, String action, int requestCode) {
        Intent i = new Intent(c, NotificationActionReceiver.class).putExtra("personId", personId).putExtra("name", name).putExtra("interval", interval).putExtra("notifyHour", notifyHour).putExtra("notifyMinute", notifyMinute).putExtra("reminderMode", reminderMode).putExtra("minDays", minDays).putExtra("maxDays", maxDays).putExtra("notificationId", notificationId).putExtra("actionType", action);
        return PendingIntent.getBroadcast(c, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
