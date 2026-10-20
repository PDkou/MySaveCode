package com.howlingcreativestudio.drawary;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** The alarm rang: show what is due and set the next alarm. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationScheduler.run(context);
    }
}
