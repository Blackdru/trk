import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { RawSms } from '../types';

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
