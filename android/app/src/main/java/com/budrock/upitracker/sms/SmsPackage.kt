package com.budrock.upitracker.sms

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package for SMS module.
 * Registers the SmsModule to expose native SMS functionality to JS.
 */
class SmsPackage : ReactPackage {
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val smsModule = SmsModule(reactContext)
        // Register module with receiver for real-time SMS events
        SmsReceiver.setSmsModule(smsModule)
        return listOf(smsModule)
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
