package com.budrock.upitracker.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Reschedules alarms after device reboot.
 * Android cancels all scheduled alarms on reboot; this receiver restores them
 * by launching the app in the background so React Native can re-schedule.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) &&
            !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }

        Log.d(TAG, "Device booted - rescheduling payment alarms");

        // Launch MainActivity so React Native initialises and re-schedules alarms.
        // FLAG_ACTIVITY_NEW_TASK is mandatory when starting from a BroadcastReceiver.
        Intent launchIntent = new Intent(context, com.budrock.upitracker.MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("rescheduleAlarms", true);
        context.startActivity(launchIntent);
    }
}
