package com.howlingcreativestudio.drawary;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

// Fires the actual notification once one of ReminderScheduler's alarms
// goes off. Unlike hellotoday-app's ReminderReceiver, there are no
// notification action buttons here (no "I reached out"/"tomorrow" --
// this is just "here's the date you flagged"), so this is considerably
// shorter than the file it's ported from.
public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL = "drawary_reminders";

    @Override
    public void onReceive(Context c, Intent source) {
        String key = source.getStringExtra("key");
        String title = source.getStringExtra("title");
        String body = source.getStringExtra("body");

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL, "다가오는 일정", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("체크해둔 날짜가 다가오면 알려드려요.");
            nm.createNotificationChannel(channel);
        }

        // getLaunchIntentForPackage() can return null in rare device states
        // (e.g. the launcher activity mid-replace); falling back to a
        // plain launch-by-package-name intent keeps the notification's tap
        // action working instead of silently doing nothing.
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open == null) open = new Intent(Intent.ACTION_MAIN).setPackage(c.getPackageName());
        int notificationId = key != null ? (key.hashCode() & 0x7fffffff) : 0;
        PendingIntent contentIntent = PendingIntent.getActivity(
                c, notificationId, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CHANNEL)
                : new Notification.Builder(c);
        builder.setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title != null && !title.isEmpty() ? title : "다가오는 일정")
                .setContentText(body != null ? body : "")
                .setContentIntent(contentIntent)
                .setAutoCancel(true);
        nm.notify(notificationId, builder.build());

        if (key != null) ReminderScheduler.markFired(c, key);
    }
}
