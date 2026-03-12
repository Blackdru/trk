import { AppState, Alert, Platform } from 'react-native';
import dayjs from 'dayjs';
import type { Subscription, AutopayTransaction } from '../types';
import { getStorage } from '../storage';
import { 
  scheduleAlarm as scheduleNativeAlarm, 
  cancelAlarm as cancelNativeAlarm,
  canScheduleExactAlarms,
  requestExactAlarmPermission,
  isBatteryOptimizationDisabled,
  requestDisableBatteryOptimization
} from '../native/AlarmModule';

const ALARM_STORAGE_KEY = 'payment_alarms';
const SNOOZED_ALARMS_KEY = 'snoozed_alarms';

export interface PaymentAlarm {
  id: string;
  paymentId: string;
  merchantName: string;
  amount: number;
  dueDate: number;
  type: 'subscription' | 'autopay';
  category?: string;
  urgency: 'two-days' | 'one-day' | 'today';
  triggerTime: number;
  dismissed: boolean;
  markedAsPaid: boolean;
  snoozedUntil?: number;
}

export interface AlarmState {
  activeAlarm: PaymentAlarm | null;
  pendingAlarms: PaymentAlarm[];
}

let alarmCheckInterval: NodeJS.Timeout | null = null;
let alarmCallback: ((alarms: PaymentAlarm[]) => void) | null = null;
// Track alarm IDs that have already been surfaced to the UI so we don't re-fire them
// every minute while the user is reviewing them.
const shownAlarmIds = new Set<string>();

/**
 * Initialize alarm service and start checking for due alarms.
 * Callback receives an array of alarms to handle multiple payments with same due date.
 */
export function initializeAlarmService(callback: (alarms: PaymentAlarm[]) => void): void {
  alarmCallback = callback;
  shownAlarmIds.clear();
  
  // Check immediately
  checkAndTriggerAlarms();
  
  // Check every minute
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
  }
  
  alarmCheckInterval = setInterval(() => {
    checkAndTriggerAlarms();
  }, 60000); // Check every minute

  console.log('[AlarmService] Initialized - checking every minute');
}

/**
 * Stop alarm service
 */
export function stopAlarmService(): void {
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
    alarmCheckInterval = null;
  }
  alarmCallback = null;
  shownAlarmIds.clear();
  console.log('[AlarmService] Stopped');
}

/**
 * Schedule alarms for all payments using native Android AlarmManager.
 * Creates daily alarms from 2 days before @ custom time until payment date @ custom time.
 */
export async function schedulePaymentAlarms(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[],
  alarmTimeBeforeDue: number = 8, // Default 8 AM
  alarmTimeOnDueDate: number = 6  // Default 6 AM
): Promise<void> {
  console.log('[AlarmService] Starting alarm scheduling...');
  console.log(`[AlarmService] Subscriptions: ${subscriptions.length}, Autopay: ${autopayTransactions.length}`);
  console.log(`[AlarmService] Alarm times: ${alarmTimeBeforeDue}:00 (before), ${alarmTimeOnDueDate}:00 (due date)`);
  
  // Check if we have permission to schedule exact alarms (Android 12+)
  if (Platform.OS === 'android') {
    const canSchedule = await canScheduleExactAlarms();
    
    if (!canSchedule) {
      console.warn('[AlarmService] Exact alarm permission not granted');
      
      // Show alert to user
      Alert.alert(
        'Alarm Permission Required',
        'To receive payment reminders, please allow this app to schedule exact alarms. This ensures you get notified at the right time.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: async () => {
              await requestExactAlarmPermission();
            }
          }
        ]
      );
      
      return;
    }
    
    // Check battery optimization
    const isBatteryOptDisabled = await isBatteryOptimizationDisabled();
    
    if (!isBatteryOptDisabled) {
      console.warn('[AlarmService] Battery optimization is enabled - alarms may not work reliably');
      
      // Show alert to user
      Alert.alert(
        'Battery Optimization Detected',
        'For reliable payment reminders, please disable battery optimization for this app. This ensures alarms work even when your phone is in deep sleep.',
        [
          { text: 'Skip', style: 'cancel' },
          { 
            text: 'Disable Optimization', 
            onPress: async () => {
              await requestDisableBatteryOptimization();
            }
          }
        ]
      );
    }
  }

  const alarms: PaymentAlarm[] = [];
  const now = Date.now();
  
  console.log(`[AlarmService] Current time: ${dayjs(now).format('YYYY-MM-DD HH:mm:ss')}`);

  // Process subscriptions
  subscriptions.forEach(sub => {
    const dueDate = dayjs(sub.nextRenewalDate);
    
    console.log(`[AlarmService] Processing subscription: ${sub.merchantName}, due: ${dueDate.format('YYYY-MM-DD')}`);
    
    // Skip if already passed
    if (dueDate.valueOf() < now) {
      console.log(`[AlarmService] Skipping ${sub.merchantName} - due date has passed`);
      return;
    }

    // Schedule daily alarms from 2 days before @ custom time until payment date @ custom time
    const startDate = dueDate.subtract(2, 'day').hour(alarmTimeBeforeDue).minute(0).second(0).millisecond(0);
    const endDate = dueDate.hour(alarmTimeOnDueDate).minute(0).second(0).millisecond(0);
    
    console.log(`[AlarmService] Alarm window: ${startDate.format('YYYY-MM-DD HH:mm')} to ${endDate.format('YYYY-MM-DD HH:mm')}`);
    
    // Create alarms for each day in the window
    let currentDate = startDate;
    let dayCount = 0;
    
    while (currentDate.valueOf() <= endDate.valueOf() && currentDate.valueOf() > now) {
      let urgency: 'two-days' | 'one-day' | 'today';
      const daysUntilDue = dueDate.diff(currentDate, 'day');
      
      if (daysUntilDue >= 2) {
        urgency = 'two-days';
      } else if (daysUntilDue >= 1) {
        urgency = 'one-day';
      } else {
        urgency = 'today';
      }
      
      const alarm = {
        id: `${sub.id}-${urgency}-${dayCount}`,
        paymentId: sub.id,
        merchantName: sub.merchantName,
        amount: sub.amount,
        dueDate: sub.nextRenewalDate,
        type: 'subscription' as const,
        urgency,
        triggerTime: currentDate.valueOf(),
        dismissed: false,
        markedAsPaid: false,
      };
      
      alarms.push(alarm);
      console.log(`[AlarmService] Created alarm: ${alarm.id} at ${currentDate.format('YYYY-MM-DD HH:mm')} (${urgency})`);
      
      // Move to next day at custom time (or custom time for payment day)
      if (currentDate.isSame(dueDate, 'day')) {
        break; // Last alarm is at custom time on payment day
      } else if (currentDate.add(1, 'day').isSame(dueDate, 'day')) {
        // Next alarm is payment day at custom time
        currentDate = dueDate.hour(alarmTimeOnDueDate).minute(0).second(0).millisecond(0);
      } else {
        // Next alarm is tomorrow at custom time
        currentDate = currentDate.add(1, 'day').hour(alarmTimeBeforeDue).minute(0).second(0).millisecond(0);
      }
      dayCount++;
    }
  });

  // Process autopay
  autopayTransactions.forEach(autopay => {
    if (!autopay.nextPaymentDate) return;
    
    const dueDate = dayjs(autopay.nextPaymentDate);
    
    console.log(`[AlarmService] Processing autopay: ${autopay.merchantName}, due: ${dueDate.format('YYYY-MM-DD')}`);
    
    // Skip if already passed
    if (dueDate.valueOf() < now) {
      console.log(`[AlarmService] Skipping ${autopay.merchantName} - due date has passed`);
      return;
    }

    // Schedule daily alarms from 2 days before @ custom time until payment date @ custom time
    const startDate = dueDate.subtract(2, 'day').hour(alarmTimeBeforeDue).minute(0).second(0).millisecond(0);
    const endDate = dueDate.hour(alarmTimeOnDueDate).minute(0).second(0).millisecond(0);
    
    // Create alarms for each day in the window
    let currentDate = startDate;
    let dayCount = 0;
    
    while (currentDate.valueOf() <= endDate.valueOf() && currentDate.valueOf() > now) {
      let urgency: 'two-days' | 'one-day' | 'today';
      const daysUntilDue = dueDate.diff(currentDate, 'day');
      
      if (daysUntilDue >= 2) {
        urgency = 'two-days';
      } else if (daysUntilDue >= 1) {
        urgency = 'one-day';
      } else {
        urgency = 'today';
      }
      
      const alarm = {
        id: `${autopay.id}-${urgency}-${dayCount}`,
        paymentId: autopay.id,
        merchantName: autopay.merchantName,
        amount: autopay.amount,
        dueDate: autopay.nextPaymentDate,
        type: 'autopay' as const,
        category: autopay.category,
        urgency,
        triggerTime: currentDate.valueOf(),
        dismissed: false,
        markedAsPaid: false,
      };
      
      alarms.push(alarm);
      console.log(`[AlarmService] Created alarm: ${alarm.id} at ${currentDate.format('YYYY-MM-DD HH:mm')} (${urgency})`);
      
      // Move to next day at custom time (or custom time for payment day)
      if (currentDate.isSame(dueDate, 'day')) {
        break; // Last alarm is at custom time on payment day
      } else if (currentDate.add(1, 'day').isSame(dueDate, 'day')) {
        // Next alarm is payment day at custom time
        currentDate = dueDate.hour(alarmTimeOnDueDate).minute(0).second(0).millisecond(0);
      } else {
        // Next alarm is tomorrow at custom time
        currentDate = currentDate.add(1, 'day').hour(alarmTimeBeforeDue).minute(0).second(0).millisecond(0);
      }
      dayCount++;
    }
  });

  // Sort by trigger time
  alarms.sort((a, b) => a.triggerTime - b.triggerTime);
  
  console.log(`[AlarmService] Total alarms to schedule: ${alarms.length}`);

  // Schedule each alarm with native Android AlarmManager
  let successCount = 0;
  for (const alarm of alarms) {
    console.log(`[AlarmService] Scheduling: ${alarm.merchantName} at ${dayjs(alarm.triggerTime).format('YYYY-MM-DD HH:mm:ss')}`);
    
    const success = await scheduleNativeAlarm({
      alarmId: alarm.id,
      paymentId: alarm.paymentId,
      merchantName: alarm.merchantName,
      amount: alarm.amount,
      triggerTime: alarm.triggerTime,
      urgency: alarm.urgency,
      type: alarm.type,
    });
    
    if (success) {
      successCount++;
      console.log(`[AlarmService] ✓ Successfully scheduled: ${alarm.id}`);
    } else {
      console.error(`[AlarmService] ✗ Failed to schedule alarm: ${alarm.id}`);
    }
  }

  // Save to storage
  getStorage().set(ALARM_STORAGE_KEY, JSON.stringify(alarms));
  
  console.log(`[AlarmService] ✅ Scheduled ${successCount}/${alarms.length} native alarms`);
  console.log(`[AlarmService] Alarm times: ${alarmTimeBeforeDue}:00 (1-2 days before), ${alarmTimeOnDueDate}:00 (due date)`);
  
  if (successCount === 0 && alarms.length > 0) {
    Alert.alert(
      'Alarm Scheduling Failed',
      'Failed to schedule payment alarms. Please check app permissions and try again.',
      [{ text: 'OK' }]
    );
  }
}

/**
 * Check for alarms that should trigger now.
 * Only surfaces alarms that haven't been shown yet, preventing the alarm screen
 * from resetting while the user is reviewing multiple alarms.
 */
function checkAndTriggerAlarms(): void {
  if (!alarmCallback) return;

  const alarmsData = getStorage().getString(ALARM_STORAGE_KEY);
  if (!alarmsData) return;

  const alarms: PaymentAlarm[] = JSON.parse(alarmsData);
  const now = Date.now();

  // Find alarms that should trigger
  const dueAlarms = alarms.filter(alarm => {
    // Skip if already dismissed or marked as paid
    if (alarm.dismissed || alarm.markedAsPaid) return false;
    
    // Skip if snoozed
    if (alarm.snoozedUntil && alarm.snoozedUntil > now) return false;
    
    // Check if trigger time has passed
    return alarm.triggerTime <= now;
  });

  // Only pass alarms that haven't been surfaced to the UI yet
  const newAlarms = dueAlarms.filter(a => !shownAlarmIds.has(a.id));

  if (newAlarms.length > 0) {
    console.log(`[AlarmService] Triggering ${newAlarms.length} new alarm(s)`);
    newAlarms.forEach(a => {
      shownAlarmIds.add(a.id);
      console.log(`  - ${a.merchantName} (${a.urgency})`);
    });
    alarmCallback(newAlarms);
  }
}

/**
 * Mark alarm as dismissed (remind tomorrow)
 */
export function dismissAlarm(alarmId: string): void {
  const alarmsData = getStorage().getString(ALARM_STORAGE_KEY);
  if (!alarmsData) return;

  const alarms: PaymentAlarm[] = JSON.parse(alarmsData);
  const updatedAlarms = alarms.map(alarm => 
    alarm.id === alarmId ? { ...alarm, dismissed: true } : alarm
  );

  getStorage().set(ALARM_STORAGE_KEY, JSON.stringify(updatedAlarms));
  shownAlarmIds.delete(alarmId);
  console.log(`[AlarmService] Dismissed alarm: ${alarmId}`);
}

/**
 * Mark payment as paid (stops all alarms for this payment)
 */
export async function markPaymentAsPaid(paymentId: string): Promise<void> {
  const alarmsData = getStorage().getString(ALARM_STORAGE_KEY);
  if (!alarmsData) return;

  const alarms: PaymentAlarm[] = JSON.parse(alarmsData);
  
  // Find all alarms for this payment and cancel them
  const paymentAlarms = alarms.filter(alarm => alarm.paymentId === paymentId);
  
  for (const alarm of paymentAlarms) {
    // Cancel the native alarm
    await cancelNativeAlarm(alarm.id);
    shownAlarmIds.delete(alarm.id);
  }
  
  // Update storage
  const updatedAlarms = alarms.map(alarm => {
    if (alarm.paymentId === paymentId) {
      return { ...alarm, markedAsPaid: true };
    }
    return alarm;
  });

  getStorage().set(ALARM_STORAGE_KEY, JSON.stringify(updatedAlarms));
  console.log(`[AlarmService] Marked payment as paid and cancelled ${paymentAlarms.length} alarms: ${paymentId}`);
}

/**
 * Snooze alarm for 2 hours (only for today's alarms)
 */
export function snoozeAlarm(alarmId: string): void {
  const alarmsData = getStorage().getString(ALARM_STORAGE_KEY);
  if (!alarmsData) return;

  const alarms: PaymentAlarm[] = JSON.parse(alarmsData);
  const snoozeUntil = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now

  const updatedAlarms = alarms.map(alarm => 
    alarm.id === alarmId ? { ...alarm, snoozedUntil: snoozeUntil } : alarm
  );

  getStorage().set(ALARM_STORAGE_KEY, JSON.stringify(updatedAlarms));
  // Remove from shown set so it re-surfaces after snooze expires
  shownAlarmIds.delete(alarmId);
  
  // Track snoozed alarms to prevent multiple snoozes
  const snoozedData = getStorage().getString(SNOOZED_ALARMS_KEY);
  const snoozed: string[] = snoozedData ? JSON.parse(snoozedData) : [];
  snoozed.push(alarmId);
  getStorage().set(SNOOZED_ALARMS_KEY, JSON.stringify(snoozed));

  console.log(`[AlarmService] Snoozed alarm: ${alarmId} until ${dayjs(snoozeUntil).format('h:mm A')}`);
}

/**
 * Check if alarm has been snoozed before
 */
export function hasBeenSnoozed(alarmId: string): boolean {
  const snoozedData = getStorage().getString(SNOOZED_ALARMS_KEY);
  if (!snoozedData) return false;

  const snoozed: string[] = JSON.parse(snoozedData);
  return snoozed.includes(alarmId);
}

/**
 * Get all pending alarms
 */
export function getPendingAlarms(): PaymentAlarm[] {
  const alarmsData = getStorage().getString(ALARM_STORAGE_KEY);
  if (!alarmsData) return [];

  const alarms: PaymentAlarm[] = JSON.parse(alarmsData);
  const now = Date.now();

  return alarms.filter(alarm => 
    !alarm.dismissed && 
    !alarm.markedAsPaid && 
    alarm.triggerTime > now
  );
}

/**
 * Clear all alarms
 */
export function clearAllAlarms(): void {
  getStorage().delete(ALARM_STORAGE_KEY);
  getStorage().delete(SNOOZED_ALARMS_KEY);
  console.log('[AlarmService] Cleared all alarms');
}
