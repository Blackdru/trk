import { NativeModules } from 'react-native';

interface AlarmData {
  alarmId: string;
  paymentId: string;
  merchantName: string;
  amount: number;
  triggerTime: number;
  urgency: 'two-days' | 'one-day' | 'today';
  type: 'subscription' | 'autopay';
}

interface AlarmManagerInterface {
  scheduleAlarm(alarmData: AlarmData): Promise<boolean>;
  cancelAlarm(alarmId: string): Promise<boolean>;
  cancelAllAlarms(): Promise<boolean>;
  canScheduleExactAlarms(): Promise<boolean>;
  requestExactAlarmPermission(): Promise<boolean>;
  isBatteryOptimizationDisabled(): Promise<boolean>;
  requestDisableBatteryOptimization(): Promise<boolean>;
}

const { AlarmManager } = NativeModules;

if (!AlarmManager) {
  console.warn('[AlarmModule] Native AlarmManager module not found');
}

export const scheduleAlarm = async (alarmData: AlarmData): Promise<boolean> => {
  if (!AlarmManager) {
    console.error('[AlarmModule] Cannot schedule alarm - module not available');
    return false;
  }

  try {
    // Check if we can schedule exact alarms (Android 12+)
    const canSchedule = await canScheduleExactAlarms();
    
    if (!canSchedule) {
      console.warn('[AlarmModule] Cannot schedule exact alarms - permission not granted');
      // Try to request permission
      await requestExactAlarmPermission();
      return false;
    }

    const result = await AlarmManager.scheduleAlarm(alarmData);
    console.log(`[AlarmModule] Scheduled alarm: ${alarmData.merchantName} at ${new Date(alarmData.triggerTime).toLocaleString()}`);
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error scheduling alarm:', error);
    return false;
  }
};

export const cancelAlarm = async (alarmId: string): Promise<boolean> => {
  if (!AlarmManager) {
    console.error('[AlarmModule] Cannot cancel alarm - module not available');
    return false;
  }

  try {
    const result = await AlarmManager.cancelAlarm(alarmId);
    console.log(`[AlarmModule] Cancelled alarm: ${alarmId}`);
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error cancelling alarm:', error);
    return false;
  }
};

export const cancelAllAlarms = async (): Promise<boolean> => {
  if (!AlarmManager) {
    console.error('[AlarmModule] Cannot cancel alarms - module not available');
    return false;
  }

  try {
    const result = await AlarmManager.cancelAllAlarms();
    console.log('[AlarmModule] Cancelled all alarms');
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error cancelling all alarms:', error);
    return false;
  }
};

export const canScheduleExactAlarms = async (): Promise<boolean> => {
  if (!AlarmManager) {
    return false;
  }

  try {
    const result = await AlarmManager.canScheduleExactAlarms();
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error checking alarm permission:', error);
    return false;
  }
};

export const requestExactAlarmPermission = async (): Promise<boolean> => {
  if (!AlarmManager) {
    return false;
  }

  try {
    const result = await AlarmManager.requestExactAlarmPermission();
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error requesting alarm permission:', error);
    return false;
  }
};

export const isBatteryOptimizationDisabled = async (): Promise<boolean> => {
  if (!AlarmManager) {
    return false;
  }

  try {
    const result = await AlarmManager.isBatteryOptimizationDisabled();
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error checking battery optimization:', error);
    return false;
  }
};

export const requestDisableBatteryOptimization = async (): Promise<boolean> => {
  if (!AlarmManager) {
    return false;
  }

  try {
    const result = await AlarmManager.requestDisableBatteryOptimization();
    return result;
  } catch (error) {
    console.error('[AlarmModule] Error requesting battery optimization exemption:', error);
    return false;
  }
};
