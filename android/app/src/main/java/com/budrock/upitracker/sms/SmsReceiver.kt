package com.budrock.upitracker.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Telephony
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import org.json.JSONArray
import org.json.JSONObject

/**
 * BroadcastReceiver for listening to incoming SMS messages in real-time.
 */
class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
        private const val PREFS_NAME = "upi_sms_cache"
        private const val KEY_PENDING_SMS = "pending_sms"
        private const val MAX_CACHED_SMS = 100

        const val ACTION_SMS_ARRIVED = "com.budrock.upitracker.SMS_ARRIVED"
        const val EXTRA_BODY = "body"
        const val EXTRA_DATE = "date"
        const val EXTRA_ADDRESS = "address"

        private val UPI_KEYWORDS = listOf(
            "autopay", "auto-pay", "auto pay", "mandate", "e-mandate", "emandate",
            "subscription", "recurring", "auto-debit", "autodebit", "automatic payment",
            "standing instruction", "nach", "e-nach", "enach", "umrn", "umn",
            "monthly", "yearly", "quarterly", "weekly", "annual", "per month",
            "debited", "debit", "credited", "credit", "trf", "transfer", "emi", "payment", "charged", "charge",
            "billed", "billing", "premium", "installment", "refno", "reversal", "refund", "receipt",
            "renewed", "renewal", "executed", "processed",
            "due", "overdue", "scheduled",
            "si debit", "bill pay", "billpay", "upi",
            "loan", "credit card", "insurance",
            "cred"
        )

        private fun containsUpiKeyword(body: String): Boolean {
            val lowerBody = body.lowercase()
            return UPI_KEYWORDS.any { keyword -> lowerBody.contains(keyword) }
        }

        fun cachePendingSms(context: Context, body: String, date: Double, address: String) {
            try {
                val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val existingJson = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"
                val jsonArray = JSONArray(existingJson)

                val newEntry = JSONObject().apply {
                    put("body", body)
                    put("date", date)
                    put("address", address)
                }

                jsonArray.put(newEntry)

                while (jsonArray.length() > MAX_CACHED_SMS) {
                    jsonArray.remove(0)
                }

                prefs.edit().putString(KEY_PENDING_SMS, jsonArray.toString()).apply()
            } catch (e: Exception) {
                Log.e(TAG, "Error caching pending SMS", e)
            }
        }

        fun getPendingSms(context: Context): List<Map<String, Any>> {
            val result = mutableListOf<Map<String, Any>>()
            try {
                val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val jsonStr = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"
                val jsonArray = JSONArray(jsonStr)

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
            } catch (e: Exception) {
                Log.e(TAG, "Error reading cached SMS", e)
            }
            return result
        }

        fun clearPendingSms(context: Context) {
            try {
                val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit().remove(KEY_PENDING_SMS).apply()
            } catch (e: Exception) {
                Log.e(TAG, "Error clearing SMS cache", e)
            }
        }
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val fullBody = StringBuilder()
            var address = ""
            var timestamp = 0L

            for (sms in messages) {
                fullBody.append(sms.messageBody)
                if (address.isEmpty()) {
                    address = sms.originatingAddress ?: ""
                }
                if (timestamp == 0L) {
                    timestamp = sms.timestampMillis
                }
            }

            val body = fullBody.toString()

            if (!containsUpiKeyword(body)) {
                return
            }

            val dateDouble = timestamp.toDouble()

            // Forward to SmsModule via LocalBroadcastManager
            val broadcastIntent = Intent(ACTION_SMS_ARRIVED).apply {
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_DATE, dateDouble)
                putExtra(EXTRA_ADDRESS, address)
            }

            val delivered = LocalBroadcastManager.getInstance(context).sendBroadcast(broadcastIntent)

            // If app was not running, store in cache
            if (!delivered) {
                cachePendingSms(context, body, dateDouble, address)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming SMS", e)
        }
    }
}
