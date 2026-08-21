package com.budrock.upitracker.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.provider.Telephony
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.bridge.Arguments
import org.json.JSONArray
import org.json.JSONObject

/**
 * BroadcastReceiver for listening to incoming SMS messages in real-time.
 *
 * This receiver works INDEPENDENTLY of the React Native app state.
 * When the app IS running, it forwards the SMS via LocalBroadcastManager to
 * SmsModule, which then emits it to the JS layer.
 * When the app is NOT running it stores SMS in SharedPreferences; SmsModule
 * picks them up on the next getSms() call.
 *
 * PRIVACY NOTICE: This receiver only processes SMS containing UPI-related keywords.
 * All processing happens locally. No SMS data is transmitted externally.
 */
class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
        private const val PREFS_NAME = "upi_sms_cache"
        private const val KEY_PENDING_SMS = "pending_sms"
        private const val MAX_CACHED_SMS = 100

        /** LocalBroadcast action used to forward incoming SMS to SmsModule */
        const val ACTION_SMS_ARRIVED = "com.budrock.upitracker.SMS_ARRIVED"
        const val EXTRA_BODY = "body"
        const val EXTRA_DATE = "date"
        const val EXTRA_ADDRESS = "address"

        // Keywords for filtering incoming SMS — cast a WIDE net, JS classifier filters precisely
        // Must stay in sync with SmsModule.kt UPI_KEYWORDS
        private val UPI_KEYWORDS = listOf(
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

        private fun containsUpiKeyword(body: String): Boolean {
            val lowerBody = body.lowercase()
            return UPI_KEYWORDS.any { keyword -> lowerBody.contains(keyword) }
        }

        /**
         * Get pending SMS that were received when the app was closed
         */
        fun getPendingSms(context: Context): List<Map<String, Any>> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"

            return try {
                val jsonArray = JSONArray(jsonString)
                val result = mutableListOf<Map<String, Any>>()

                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    result.add(
                        mapOf(
                            "body" to obj.getString("body"),
                            "date" to obj.getDouble("date"),
                            "address" to obj.getString("address")
                        )
                    )
                }
                result
            } catch (e: Exception) {
                Log.e(TAG, "Error reading pending SMS", e)
                emptyList()
            }
        }

        /**
         * Clear pending SMS after they've been processed
         */
        fun clearPendingSms(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().remove(KEY_PENDING_SMS).apply()
            Log.d(TAG, "Cleared pending SMS cache")
        }
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)

        messages?.forEach { smsMessage ->
            val body = smsMessage.messageBody ?: return@forEach
            val address = smsMessage.originatingAddress ?: ""
            val timestamp = smsMessage.timestampMillis

            // Early filtering: Only process UPI-related SMS for privacy
            if (!containsUpiKeyword(body)) return@forEach

            Log.d(TAG, "UPI SMS received from $address")

            // Try to deliver to the running app via LocalBroadcastManager first.
            // LocalBroadcastManager only works within the same process (app open).
            val localIntent = Intent(ACTION_SMS_ARRIVED).apply {
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_DATE, timestamp.toDouble())
                putExtra(EXTRA_ADDRESS, address)
            }
            val delivered = LocalBroadcastManager.getInstance(context)
                .sendBroadcast(localIntent)

            if (delivered) {
                Log.d(TAG, "SMS delivered to running app via LocalBroadcast")
            } else {
                // App is not running — persist to SharedPreferences for next launch
                Log.d(TAG, "App not running, caching SMS")
                cacheSms(context, mapOf("body" to body, "date" to timestamp.toDouble(), "address" to address))
            }
        }
    }

    private fun cacheSms(context: Context, smsData: Map<String, Any>) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existingJson = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"
            val jsonArray = JSONArray(existingJson)

            val newSms = JSONObject().apply {
                put("body", smsData["body"])
                put("date", smsData["date"])
                put("address", smsData["address"])
            }
            jsonArray.put(newSms)

            // Keep only last MAX_CACHED_SMS messages
            val trimmedArray = JSONArray()
            val startIndex = maxOf(0, jsonArray.length() - MAX_CACHED_SMS)
            for (i in startIndex until jsonArray.length()) {
                trimmedArray.put(jsonArray.get(i))
            }

            prefs.edit().putString(KEY_PENDING_SMS, trimmedArray.toString()).apply()
            Log.d(TAG, "Cached SMS. Total cached: ${trimmedArray.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "Error caching SMS", e)
        }
    }
}
