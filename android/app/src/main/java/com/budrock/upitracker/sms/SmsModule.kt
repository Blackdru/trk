package com.budrock.upitracker.sms

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import androidx.core.content.ContextCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Calendar

/**
 * Native Android module for reading SMS messages.
 *
 * PRIVACY NOTICE: This module reads SMS ONLY to detect UPI subscription payments.
 * All processing happens locally on the device. No SMS data is transmitted externally.
 *
 * We filter SMS early using UPI-related keywords to minimise data exposure.
 *
 * Live SMS delivery mechanism:
 *   SmsReceiver (system BroadcastReceiver) → LocalBroadcastManager → SmsModule → JS EventEmitter
 *   This ensures live delivery regardless of whether SmsReceiver was instantiated before or after
 *   SmsModule, and survives app restarts without a stale static reference.
 */
class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SmsModule"
        const val EVENT_SMS_RECEIVED = "onSmsReceived"

        // Keywords for early filtering — cast a WIDE net, JS classifier will filter precisely
        // Being too strict here silently drops SMS before the JS layer ever sees them
        val UPI_KEYWORDS = listOf(
            // Core autopay/mandate keywords
            "autopay", "auto-pay", "auto pay", "mandate", "e-mandate", "emandate",
            "subscription", "recurring", "auto-debit", "autodebit", "automatic payment",
            "standing instruction", "nach", "e-nach", "enach", "umrn", "umn",
            // Temporal/billing keywords
            "monthly", "yearly", "quarterly", "weekly", "annual", "per month",
            // Transaction keywords
            "debited", "debit", "emi", "payment", "charged", "charge",
            "billed", "billing", "premium", "installment",
            // Status keywords
            "renewed", "renewal", "executed", "processed",
            // Due/scheduled keywords
            "due", "overdue", "scheduled",
            // Payment method keywords
            "si debit", "bill pay", "billpay", "upi",
            // Financial service keywords
            "loan", "credit card", "insurance",
            // App-specific keywords (common UPI apps)
            "cred"
        )
    }

    /** LocalBroadcastReceiver that listens for SMS forwarded by SmsReceiver */
    private val localSmsReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != SmsReceiver.ACTION_SMS_ARRIVED) return

            val body = intent.getStringExtra(SmsReceiver.EXTRA_BODY) ?: return
            val date = intent.getDoubleExtra(SmsReceiver.EXTRA_DATE, 0.0)
            val address = intent.getStringExtra(SmsReceiver.EXTRA_ADDRESS) ?: ""

            android.util.Log.d(NAME, "Local SMS broadcast received from $address")

            val smsData = Arguments.createMap().apply {
                putString("body", body)
                putDouble("date", date)
                putString("address", address)
            }
            emitSmsEvent(smsData)
        }
    }

    init {
        // Register the local receiver immediately so we never miss a broadcast
        LocalBroadcastManager.getInstance(reactContext)
            .registerReceiver(
                localSmsReceiver,
                IntentFilter(SmsReceiver.ACTION_SMS_ARRIVED)
            )
    }

    override fun getName(): String = NAME

    /**
     * Unregister local receiver when the module is invalidated (e.g. app reload / hot reload)
     */
    override fun invalidate() {
        super.invalidate()
        try {
            LocalBroadcastManager.getInstance(reactApplicationContext)
                .unregisterReceiver(localSmsReceiver)
        } catch (e: Exception) {
            android.util.Log.w(NAME, "Error unregistering local receiver", e)
        }
    }

    /**
     * Check if both READ_SMS and RECEIVE_SMS permissions are granted
     */
    @ReactMethod
    fun hasPermission(promise: Promise) {
        val hasRead = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
        val hasReceive = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(hasRead && hasReceive)
    }

    /**
     * Read SMS messages from inbox (last 6 months).
     * Only returns SMS containing UPI-related keywords to protect privacy.
     *
     * @return Array of SMS objects with body, date, and address fields
     */
    @ReactMethod
    fun getSms(promise: Promise) {
        try {
            val hasRead = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED
            val hasReceive = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECEIVE_SMS
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasRead || !hasReceive) {
                promise.reject("PERMISSION_DENIED", "SMS permissions not granted")
                return
            }

            val smsArray = Arguments.createArray()
            val uri = Uri.parse("content://sms/inbox")

            // Calculate timestamp for 180 days ago (6 months)
            // Need longer history to detect quarterly/yearly subscriptions
            val sixMonthsAgo = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, -180)
            }.timeInMillis

            val cursor: Cursor? = reactApplicationContext.contentResolver.query(
                uri,
                arrayOf("body", "date", "address"),
                "date > ?",
                arrayOf(sixMonthsAgo.toString()),
                "date DESC"
            )

            var totalCount = 0
            var matchedCount = 0

            cursor?.use {
                val bodyIndex = it.getColumnIndex("body")
                val dateIndex = it.getColumnIndex("date")
                val addressIndex = it.getColumnIndex("address")

                while (it.moveToNext()) {
                    totalCount++
                    val body = it.getString(bodyIndex) ?: ""
                    val date = it.getLong(dateIndex)
                    val address = it.getString(addressIndex) ?: ""

                    // Early filtering: Only include SMS with UPI-related keywords
                    // This protects user privacy by not exposing unrelated SMS
                    if (containsUpiKeyword(body)) {
                        matchedCount++
                        val smsMap = Arguments.createMap().apply {
                            putString("body", body)
                            putDouble("date", date.toDouble())
                            putString("address", address)
                        }
                        smsArray.pushMap(smsMap)
                    }
                }
            }

            // Also add any pending SMS that were received when app was closed
            val pendingSms = SmsReceiver.getPendingSms(reactApplicationContext)
            android.util.Log.d(NAME, "Found ${pendingSms.size} pending SMS from cache")

            for (sms in pendingSms) {
                val smsMap = Arguments.createMap().apply {
                    putString("body", sms["body"] as String)
                    putDouble("date", sms["date"] as Double)
                    putString("address", sms["address"] as String)
                }
                smsArray.pushMap(smsMap)
                matchedCount++
            }

            // Clear the cache after reading
            if (pendingSms.isNotEmpty()) {
                SmsReceiver.clearPendingSms(reactApplicationContext)
            }

            android.util.Log.d(NAME, "Scanned $totalCount SMS, found $matchedCount UPI-related messages (including ${pendingSms.size} cached)")
            promise.resolve(smsArray)
        } catch (e: Exception) {
            android.util.Log.e(NAME, "Error reading SMS", e)
            promise.reject("SMS_READ_ERROR", e.message, e)
        }
    }

    /**
     * Clear the incremental-sync hash cache so all SMS are re-processed on next sync.
     * Useful for debugging or after the user resets subscription data.
     */
    @ReactMethod
    fun clearSyncCache(promise: Promise) {
        try {
            SmsReceiver.clearPendingSms(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_CACHE_ERROR", e.message, e)
        }
    }

    /**
     * Check if SMS body contains any UPI-related keywords.
     * Case-insensitive matching for better detection.
     */
    private fun containsUpiKeyword(body: String): Boolean {
        val lowerBody = body.lowercase()
        return UPI_KEYWORDS.any { keyword -> lowerBody.contains(keyword) }
    }

    /**
     * Emit SMS event to React Native JS layer.
     */
    fun emitSmsEvent(smsData: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_SMS_RECEIVED, smsData)
    }

    /**
     * Required for NativeEventEmitter in JS
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in Event Emitter
    }
}
