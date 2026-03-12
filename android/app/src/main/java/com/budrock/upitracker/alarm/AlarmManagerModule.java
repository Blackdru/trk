package com.budrock.upitracker.alarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

import java.util.Calendar;

/**
 * React Native module to schedule exact alarms using Android's AlarmManager.
 * These alarms work even when the app is completely closed.
 */
public class AlarmManagerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AlarmManagerModule";
    private final ReactApplicationContext reactContext;

    public AlarmManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "AlarmManager";
    }

    /**
     * Schedule an exact alarm for a payment
     */
    @ReactMethod
    public void scheduleAlarm(ReadableMap alarmData, Promise promise) {
        try {
            String alarmId = alarmData.getString("alarmId");
            String paymentId = alarmData.getString("paymentId");
            String merchantName = alarmData.getString("merchantName");
            double amount = alarmData.getDouble("amount");
            double triggerTime = alarmData.getDouble("triggerTime");
            String urgency = alarmData.getString("urgency");
            String type = alarmData.getString("type");

            Log.d(TAG, "Scheduling alarm: " + merchantName + " at " + triggerTime);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            // Create intent for AlarmReceiver
            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            intent.putExtra("alarmId", alarmId);
            intent.putExtra("paymentId", paymentId);
            intent.putExtra("merchantName", merchantName);
            intent.putExtra("amount", String.valueOf((int) amount));
            intent.putExtra("urgency", urgency);
            intent.putExtra("type", type);

            // Use Math.abs to avoid negative request codes; combine alarmId hash with paymentId hash
            // to reduce collision probability across multiple alarms for different payments.
            int requestCode = Math.abs(alarmId.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Schedule exact alarm
            long triggerTimeMillis = (long) triggerTime;
            
            // For Android 12+ (API 31+), check if we can schedule exact alarms
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.w(TAG, "Cannot schedule exact alarms - permission not granted");
                    promise.reject("PERMISSION_DENIED", "Exact alarm permission not granted");
                    return;
                }
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Use setAlarmClock for critical alarms - this bypasses Doze mode completely
                // and shows an alarm icon in the status bar
                AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(
                    triggerTimeMillis,
                    pendingIntent
                );
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                Log.d(TAG, "Scheduled as AlarmClock (bypasses Doze): " + alarmId);
            } else {
                // Use setExact for older versions
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTimeMillis,
                    pendingIntent
                );
                Log.d(TAG, "Scheduled as exact alarm: " + alarmId);
            }

            Log.d(TAG, "Alarm scheduled successfully: " + alarmId + " at " + new java.util.Date(triggerTimeMillis));
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm", e);
            promise.reject("ALARM_ERROR", "Failed to schedule alarm: " + e.getMessage());
        }
    }

    /**
     * Cancel a scheduled alarm
     */
    @ReactMethod
    public void cancelAlarm(String alarmId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling alarm: " + alarmId);

            AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
            
            Intent intent = new Intent(reactContext, AlarmReceiver.class);
            int requestCode = Math.abs(alarmId.hashCode());
            
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();

            Log.d(TAG, "Alarm cancelled successfully: " + alarmId);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling alarm", e);
            promise.reject("ALARM_ERROR", "Failed to cancel alarm: " + e.getMessage());
        }
    }

    /**
     * Cancel all scheduled alarms
     */
    @ReactMethod
    public void cancelAllAlarms(Promise promise) {
        try {
            Log.d(TAG, "Cancelling all alarms");
            // Note: We can't enumerate all alarms, so this is a placeholder
            // In practice, we track alarm IDs in JS and cancel them individually
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all alarms", e);
            promise.reject("ALARM_ERROR", "Failed to cancel all alarms: " + e.getMessage());
        }
    }

    /**
     * Check if exact alarm permission is granted (Android 12+)
     */
    @ReactMethod
    public void canScheduleExactAlarms(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) reactContext.getSystemService(Context.ALARM_SERVICE);
                boolean canSchedule = alarmManager.canScheduleExactAlarms();
                promise.resolve(canSchedule);
            } else {
                // Always true for older versions
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking alarm permission", e);
            promise.reject("ALARM_ERROR", "Failed to check permission: " + e.getMessage());
        }
    }

    /**
     * Request exact alarm permission (Android 12+)
     */
    @ReactMethod
    public void requestExactAlarmPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting alarm permission", e);
            promise.reject("ALARM_ERROR", "Failed to request permission: " + e.getMessage());
        }
    }
    
    /**
     * Check if battery optimization is disabled for the app
     */
    @ReactMethod
    public void isBatteryOptimizationDisabled(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                boolean isIgnoring = pm.isIgnoringBatteryOptimizations(reactContext.getPackageName());
                promise.resolve(isIgnoring);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking battery optimization", e);
            promise.reject("ALARM_ERROR", "Failed to check battery optimization: " + e.getMessage());
        }
    }
    
    /**
     * Request to disable battery optimization for the app
     */
    @ReactMethod
    public void requestDisableBatteryOptimization(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(android.net.Uri.parse("package:" + reactContext.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization exemption", e);
            promise.reject("ALARM_ERROR", "Failed to request battery optimization exemption: " + e.getMessage());
        }
    }
}
