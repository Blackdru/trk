package com.budrock.upitracker.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Telephony
import android.util.Log
import com.facebook.react.bridge.Arguments
import org.json.JSONArray
import org.json.JSONObject

/**
 * BroadcastReceiver for listening to incoming SMS messages in real-time.
 * 
 * This receiver works INDEPENDENTLY of the React Native app state.
 * It stores SMS data locally and the app syncs it when opened.
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
        
        private var smsModule: SmsModule? = null
        
        fun setSmsModule(module: SmsModule) {
            smsModule = module
            Log.d(TAG, "SmsModule registered")
        }

        // Keywords for filtering incoming SMS - cast a wide net, JS classifier will filter precisely
        private val UPI_KEYWORDS = listOf(
            "autopay", "mandate", "subscription", "e-mandate",
            "recurring", "auto-debit", "automatic payment",
            "standing instruction", "nach", "monthly", "yearly",
            "quarterly", "weekly", "debited", "emi", "debit"
        )

        private fun containsUpiKeyword(body: String): Boolean {
            val lowerBody = body.lowercase()
            return UPI_KEYWORDS.any { keyword -> lowerBody.contains(keyword) }
        }

        /**
         * Get pending SMS that were received when app was closed
         */
        fun getPendingSms(context: Context): List<Map<String, Any>> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"
            
            try {
                val jsonArray = JSONArray(jsonString)
                val result = mutableListOf<Map<String, Any>>()
                
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    result.add(mapOf(
                        "body" to obj.getString("body"),
                        "date" to obj.getDouble("date"),
                        "address" to obj.getString("address")
                    ))
                }
                
                return result
            } catch (e: Exception) {
                Log.e(TAG, "Error reading pending SMS", e)
                return emptyList()
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
            if (containsUpiKeyword(body)) {
                Log.d(TAG, "UPI SMS received from $address")
                
                val smsData = mapOf(
                    "body" to body,
                    "date" to timestamp.toDouble(),
                    "address" to address
                )

                // Try to emit to React Native if app is running
                val emitted = try {
                    val argsMap = Arguments.createMap().apply {
                        putString("body", body)
                        putDouble("date", timestamp.toDouble())
                        putString("address", address)
                    }
                    smsModule?.emitSmsEvent(argsMap)
                    true
                } catch (e: Exception) {
                    Log.d(TAG, "App not running, caching SMS")
                    false
                }

                // If app is not running, cache the SMS
                if (!emitted || smsModule == null) {
                    cacheSms(context, smsData)
                }
            }
        }
    }

    private fun cacheSms(context: Context, smsData: Map<String, Any>) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existingJson = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"
            val jsonArray = JSONArray(existingJson)
            
            // Add new SMS
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
            
            // Save back
            prefs.edit().putString(KEY_PENDING_SMS, trimmedArray.toString()).apply()
            Log.d(TAG, "Cached SMS. Total cached: ${trimmedArray.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "Error caching SMS", e)
        }
    }
}
