package com.howlingcreativestudio.drawary;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarms are forgotten when the phone restarts, the app is updated or the clock changes: set them again from the saved list. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            NotificationScheduler.run(context);
        }
    }
}
