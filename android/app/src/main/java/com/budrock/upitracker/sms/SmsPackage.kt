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
        // SmsModule now registers its own LocalBroadcastReceiver in its init block,
        // so we no longer need the brittle setSmsModule() call on SmsReceiver.
        return listOf(SmsModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
