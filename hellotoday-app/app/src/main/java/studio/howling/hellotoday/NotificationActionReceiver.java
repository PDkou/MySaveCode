package studio.howling.hellotoday;

import android.app.*;
import android.content.*;
import android.os.Build;

public class NotificationActionReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String language = context.getSharedPreferences("hello_today_preferences", Context.MODE_PRIVATE).getString("language", "en");
        long personId = intent.getLongExtra("personId", -1L);
        String name = intent.getStringExtra("name");
        int interval = intent.getIntExtra("interval", 7);
        int notifyHour = intent.getIntExtra("notifyHour", 10);
        int notifyMinute = intent.getIntExtra("notifyMinute", 0);
        String reminderMode = intent.getStringExtra("reminderMode");
        int minDays = intent.getIntExtra("minDays", 14);
        int maxDays = intent.getIntExtra("maxDays", 28);
        String action = intent.getStringExtra("actionType");
        int notificationId = intent.getIntExtra("notificationId", 0);
        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(notificationId);
        if (personId == ReminderScheduler.TEST_REMINDER_ID) {
            ReminderScheduler.cancel(context, personId);
            showTestResult(context, language, "complete".equals(action)
                    ? text(language, "The ‘I reached out’ button works.", "「連絡しました」ボタンを確認しました。", "‘연락했어요’ 버튼을 확인했습니다.")
                    : text(language, "The ‘Tomorrow’ button works.", "「明日また」ボタンを確認しました。", "‘내일 다시’ 버튼을 확인했습니다."));
            return;
        }
        if (personId < 0 || action == null) return;
        long now = System.currentTimeMillis();
        long nextAt = "snooze".equals(action)
                ? ReminderScheduler.snoozeOneDay(context, personId, name, interval, notifyHour, notifyMinute, reminderMode, minDays, maxDays)
                : ReminderScheduler.completeFromNotification(context, personId, name, interval, notifyHour, notifyMinute, reminderMode, minDays, maxDays);
        NotificationActionStore.add(context, action, personId, now, nextAt);
    }

    private void showTestResult(Context context, String language, String message) {
        String channel = "gentle_reminders";
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(channel, text(language, "Contact reminders", "連絡リマインダー", "연락 알림"), NotificationManager.IMPORTANCE_DEFAULT));
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, channel) : new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Hello, Today · " + text(language, "Test complete", "テスト完了", "테스트 완료")).setContentText(message).setAutoCancel(true);
        nm.notify((int) System.currentTimeMillis(), b.build());
    }

    private String text(String language, String en, String ja, String ko) {
        return "ko".equals(language) ? ko : "ja".equals(language) ? ja : en;
    }
}
