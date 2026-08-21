import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { RawSms } from '../types';
import { clearSyncHistory } from '../utils/incrementalSync';

const { SmsModule } = NativeModules;

export const SmsEventEmitter = new NativeEventEmitter(SmsModule);

export const SMS_RECEIVED_EVENT = 'onSmsReceived';

export async function hasPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return SmsModule.hasPermission();
}

export async function getSms(): Promise<RawSms[]> {
  if (Platform.OS !== 'android') return [];
  return SmsModule.getSms();
}

export function subscribeSmsReceived(callback: (sms: RawSms) => void) {
  return SmsEventEmitter.addListener(SMS_RECEIVED_EVENT, callback);
}

/**
 * Force a full re-sync by clearing the incremental sync hash cache.
 * All SMS from the last 6 months will be re-processed on the next sync.
 * Useful when the user reports missed subscriptions.
 */
export async function forceFullResync(): Promise<void> {
  // Clear JS-side incremental sync history (timestamps + hashes)
  clearSyncHistory();
  // Also clear any Android-side cached pending SMS
  if (Platform.OS === 'android') {
    await SmsModule.clearSyncCache();
  }
}
