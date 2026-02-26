package com.budrock.upitracker.sms

import android.Manifest
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Calendar

/**
 * Native Android module for reading SMS messages.
 * 
 * PRIVACY NOTICE: This module reads SMS ONLY to detect UPI subscription payments.
 * All processing happens locally on the device. No SMS data is transmitted externally.
 * 
 * We filter SMS early using UPI-related keywords to minimize data exposure.
 */
class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SmsModule"
        const val EVENT_SMS_RECEIVED = "onSmsReceived"
        
        // Keywords for early filtering - cast a wide net, JS classifier will filter precisely
        // Include debit/payment keywords to catch all potential subscription SMS
        val UPI_KEYWORDS = listOf(
            "autopay", "mandate", "subscription", "e-mandate",
            "recurring", "auto-debit", "automatic payment",
            "standing instruction", "nach", "monthly", "yearly",
            "quarterly", "weekly", "debited", "emi", "debit"
        )
    }

    override fun getName(): String = NAME

    /**
     * Check if READ_SMS permission is granted
     */
    @ReactMethod
    fun hasPermission(promise: Promise) {
        val hasPermission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(hasPermission)
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
            if (ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.READ_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "READ_SMS permission not granted")
                return
            }

            val smsArray = Arguments.createArray()
            val uri = Uri.parse("content://sms/inbox")
            
            // Calculate timestamp for 28 days ago
            val twentyEightDaysAgo = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, -28)
            }.timeInMillis

            val cursor: Cursor? = reactApplicationContext.contentResolver.query(
                uri,
                arrayOf("body", "date", "address"),
                "date > ?",
                arrayOf(twentyEightDaysAgo.toString()),
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
            android.util.Log.d("SmsModule", "Found ${pendingSms.size} pending SMS from cache")
            
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

            android.util.Log.d("SmsModule", "Scanned $totalCount SMS, found $matchedCount UPI-related messages (including ${pendingSms.size} cached)")
            promise.resolve(smsArray)
        } catch (e: Exception) {
            android.util.Log.e("SmsModule", "Error reading SMS", e)
            promise.reject("SMS_READ_ERROR", e.message, e)
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
     * Called by SmsReceiver when new SMS arrives.
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
