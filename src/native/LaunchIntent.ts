import { NativeModules, NativeEventEmitter, DeviceEventEmitter, Platform } from 'react-native';

export interface AlarmIntentData {
  paymentId: string;
  merchantName: string;
  amount: string;
  urgency: 'two-days' | 'one-day' | 'today';
  type: 'subscription' | 'autopay';
}

/**
 * Get alarm data from launch intent (Android only)
 */
export async function getAlarmFromIntent(): Promise<AlarmIntentData | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    // Try to get initial intent data
    const { default: RNLaunchArguments } = await import('react-native-launch-arguments');
    const launchArgs = RNLaunchArguments.value();
    
    if (launchArgs && launchArgs.alarmPaymentId) {
      return {
        paymentId: launchArgs.alarmPaymentId,
        merchantName: launchArgs.alarmMerchantName,
        amount: launchArgs.alarmAmount,
        urgency: launchArgs.alarmUrgency,
        type: launchArgs.alarmType,
      };
    }
  } catch (error) {
    // Fallback: Check if MainActivity passed intent extras
    // This is a simplified approach - in production you'd want a proper native module
    console.log('[LaunchIntent] No alarm data in launch intent');
  }

  return null;
}

/**
 * Listen for alarm intents when app is already running
 */
export function subscribeToAlarmIntents(callback: (data: AlarmIntentData) => void): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  // This would require a custom native module to emit events
  // For now, we rely on the alarm service checking storage
  return () => {};
}
