# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# MMKV Storage
-keep class com.tencent.mmkv.** { *; }
-dontwarn com.tencent.mmkv.**

# Google Mobile Ads (AdMob)
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.internal.** { *; }
-dontwarn com.google.android.gms.ads.**

# RevenueCat
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Notifee
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Nitro Modules
-keep class com.margelo.nitro.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
