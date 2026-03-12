package com.budrock.upitracker

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Switch from splash screen theme to app theme before rendering
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to remove splash screen
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
    
    // Handle alarm intent if present
    handleAlarmIntent(intent)
  }

  /**
   * Handle new intents (when app is already running)
   */
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { handleAlarmIntent(it) }
  }

  /**
   * Check if intent contains alarm data and pass to React Native
   */
  private fun handleAlarmIntent(intent: Intent) {
    val paymentId = intent.getStringExtra("alarmPaymentId")
    if (paymentId != null) {
      // Alarm data will be read by React Native on app start
      android.util.Log.d("MainActivity", "Alarm intent received for payment: $paymentId")
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "upi"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
