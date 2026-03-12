package com.budrock.upitracker.alarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import com.budrock.upitracker.MainActivity;
import com.budrock.upitracker.R;

/**
 * BroadcastReceiver that triggers when payment alarms are due.
 * This works even when the app is completely closed.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    // v2: versioned channel ID so Android uses the new channel with correct sound/vibration settings.
    // (Android ignores property updates on an existing channel; a new ID forces a fresh channel.)
    private static final String CHANNEL_ID = "payment_alarms_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Alarm received!");

        String alarmId = intent.getStringExtra("alarmId");
        String paymentId = intent.getStringExtra("paymentId");
        String merchantName = intent.getStringExtra("merchantName");
        String amount = intent.getStringExtra("amount");
        String urgency = intent.getStringExtra("urgency");
        String type = intent.getStringExtra("type");

        Log.d(TAG, "Alarm triggered: " + alarmId + " - " + merchantName + " - ₹" + amount + " (" + urgency + ")");

        // Create notification channel (required for Android 8.0+)
        createNotificationChannel(context);

        // Trigger device vibration
        triggerVibration(context, urgency);

        // Show high-priority notification with sound that opens the app
        showAlarmNotification(context, paymentId, merchantName, amount, urgency, type);

        // Launch app with alarm data
        launchAppWithAlarm(context, paymentId, merchantName, amount, urgency, type);
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);

            // Only create the channel if it doesn't already exist.
            // Android ignores channel property updates after first creation,
            // so we use a versioned channel ID to force a fresh channel with correct settings.
            if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
                return;
            }

            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Payment Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Critical payment reminders with sound and vibration");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800});
            channel.enableLights(true);
            channel.setLightColor(0xFFEF4444);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            channel.setSound(alarmSound, audioAttributes);

            notificationManager.createNotificationChannel(channel);
        }
    }

    private void triggerVibration(Context context, String urgency) {
        try {
            long[] pattern;
            if ("today".equals(urgency)) {
                pattern = new long[]{0, 800, 400, 800, 400, 800, 400, 800};
            } else {
                pattern = new long[]{0, 500, 300, 500, 300, 500};
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                Vibrator vibrator = vibratorManager.getDefaultVibrator();
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        vibrator.vibrate(pattern, -1);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error triggering vibration", e);
        }
    }

    private void showAlarmNotification(Context context, String paymentId, String merchantName, 
                                      String amount, String urgency, String type) {
        // Use absolute value of hash to avoid negative notification IDs;
        // combine paymentId and urgency so different urgency levels for the same payment
        // show as separate notifications rather than overwriting each other.
        String notifKey = paymentId + "_" + (urgency != null ? urgency : "");
        int notificationId = Math.abs(notifKey.hashCode());

        // Create intent to launch app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("alarmPaymentId", paymentId);
        launchIntent.putExtra("alarmMerchantName", merchantName);
        launchIntent.putExtra("alarmAmount", amount);
        launchIntent.putExtra("alarmUrgency", urgency);
        launchIntent.putExtra("alarmType", type);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Create dismiss intent
        Intent dismissIntent = new Intent(context, AlarmDismissReceiver.class);
        dismissIntent.putExtra("notificationId", notificationId);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            notificationId + 1,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification
        String title = getNotificationTitle(urgency);
        String typeLabel = "autopay".equals(type) ? "Autopay" : "Subscription";
        String message = typeLabel + ": " + merchantName + " • ₹" + amount;

        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSound == null) {
            alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setOngoing(false)
            .setContentIntent(pendingIntent)
            .setDeleteIntent(dismissPendingIntent)
            .setSound(alarmSound)
            .setVibrate(new long[]{0, 800, 400, 800, 400, 800})
            .setLights(0xFFEF4444, 1000, 1000)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        // Add action buttons
        builder.addAction(
            android.R.drawable.ic_menu_view,
            "Open App",
            pendingIntent
        );
        builder.addAction(
            android.R.drawable.ic_menu_close_clear_cancel,
            "Dismiss",
            dismissPendingIntent
        );

        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(notificationId, builder.build());
    }

    private void launchAppWithAlarm(Context context, String paymentId, String merchantName,
                                   String amount, String urgency, String type) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("alarmPaymentId", paymentId);
        launchIntent.putExtra("alarmMerchantName", merchantName);
        launchIntent.putExtra("alarmAmount", amount);
        launchIntent.putExtra("alarmUrgency", urgency);
        launchIntent.putExtra("alarmType", type);
        
        context.startActivity(launchIntent);
    }

    private String getNotificationTitle(String urgency) {
        switch (urgency) {
            case "two-days":
                return "⚠️ Payment Due in 2 Days";
            case "one-day":
                return "🚨 Payment Due Tomorrow";
            case "today":
                return "🔴 PAYMENT DUE TODAY";
            default:
                return "Payment Reminder";
        }
    }
}
