package com.howlingcreativestudio.drawary;

import android.app.Application;

public class DrawaryApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        NotificationScheduler.ensureChannel(this);
    }
}
