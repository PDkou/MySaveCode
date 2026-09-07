package com.howlingcreativestudio.drawary;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Re-arms any reminders ReminderScheduler had persisted -- AlarmManager
// alarms don't survive a reboot (BOOT_COMPLETED) or an app update
// (MY_PACKAGE_REPLACED can reset scheduled alarms depending on OS/OEM
// behavior), and the WebView holding the actual reminder data isn't
// running at either point to re-schedule anything itself.
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            ReminderScheduler.restoreAll(context);
        }
    }
}
