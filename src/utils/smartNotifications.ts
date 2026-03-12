import notifee, { 
  AndroidImportance, 
  TriggerType, 
  TimestampTrigger,
  AndroidStyle,
  AndroidCategory,
  AndroidVisibility,
} from '@notifee/react-native';
import dayjs from 'dayjs';
import type { Subscription, AutopayTransaction } from '../types';

const CHANNEL_ID = 'upi-payment-reminders';
const CHANNEL_ID_PERSISTENT = 'upi-payment-persistent';
const CHANNEL_ID_DIGEST = 'upi-daily-digest';

export async function createNotificationChannels(): Promise<void> {
  // High priority channel for immediate reminders
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Payment Reminders',
    importance: AndroidImportance.HIGH,
    description: 'Reminders for upcoming subscription and autopay renewals',
    sound: 'default',
    vibration: true,
  });

  // Persistent notification channel
  await notifee.createChannel({
    id: CHANNEL_ID_PERSISTENT,
    name: 'Upcoming Payments',
    importance: AndroidImportance.LOW,
    description: 'Ongoing notification showing upcoming payments',
  });

  // Daily digest channel
  await notifee.createChannel({
    id: CHANNEL_ID_DIGEST,
    name: 'Daily Payment Summary',
    importance: AndroidImportance.DEFAULT,
    description: 'Morning summary of payments due today and upcoming',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

interface UpcomingPayment {
  id: string;
  merchantName: string;
  amount: number;
  dueDate: number;
  type: 'subscription' | 'autopay';
  category?: string;
}

/**
 * Get all upcoming payments (subscriptions + autopay) within specified days
 */
export function getUpcomingPayments(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[],
  days: number = 7
): UpcomingPayment[] {
  const now = Date.now();
  const futureDate = dayjs().add(days, 'day').valueOf();
  const payments: UpcomingPayment[] = [];

  // Add subscriptions
  subscriptions.forEach(sub => {
    if (sub.nextRenewalDate >= now && sub.nextRenewalDate <= futureDate) {
      payments.push({
        id: sub.id,
        merchantName: sub.merchantName,
        amount: sub.amount,
        dueDate: sub.nextRenewalDate,
        type: 'subscription',
      });
    }
  });

  // Add autopay with next payment dates
  autopayTransactions.forEach(autopay => {
    if (autopay.nextPaymentDate && autopay.nextPaymentDate >= now && autopay.nextPaymentDate <= futureDate) {
      payments.push({
        id: autopay.id,
        merchantName: autopay.merchantName,
        amount: autopay.amount,
        dueDate: autopay.nextPaymentDate,
        type: 'autopay',
        category: autopay.category,
      });
    }
  });

  // Sort by due date
  return payments.sort((a, b) => a.dueDate - b.dueDate);
}

/**
 * Group payments by day for better organization
 */
export function groupPaymentsByDay(payments: UpcomingPayment[]): {
  today: UpcomingPayment[];
  tomorrow: UpcomingPayment[];
  twoDays: UpcomingPayment[];
  later: UpcomingPayment[];
} {
  const now = dayjs();
  const today = now.startOf('day');
  const tomorrow = today.add(1, 'day');
  const twoDays = today.add(2, 'day');
  const threeDays = today.add(3, 'day');

  return {
    today: payments.filter(p => dayjs(p.dueDate).isSame(today, 'day')),
    tomorrow: payments.filter(p => dayjs(p.dueDate).isSame(tomorrow, 'day')),
    twoDays: payments.filter(p => dayjs(p.dueDate).isSame(twoDays, 'day')),
    later: payments.filter(p => dayjs(p.dueDate).isAfter(twoDays, 'day')),
  };
}

/**
 * Show persistent notification with upcoming payments summary
 */
export async function showPersistentPaymentNotification(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[]
): Promise<void> {
  const payments = getUpcomingPayments(subscriptions, autopayTransactions, 3);
  
  if (payments.length === 0) {
    await notifee.cancelNotification('persistent-payment-summary');
    return;
  }

  const grouped = groupPaymentsByDay(payments);
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  // Build notification lines
  const lines: string[] = [];
  
  if (grouped.today.length > 0) {
    lines.push(`📍 Today: ${grouped.today.length} payment${grouped.today.length > 1 ? 's' : ''} (₹${grouped.today.reduce((s, p) => s + p.amount, 0)})`);
  }
  if (grouped.tomorrow.length > 0) {
    lines.push(`⏰ Tomorrow: ${grouped.tomorrow.length} payment${grouped.tomorrow.length > 1 ? 's' : ''} (₹${grouped.tomorrow.reduce((s, p) => s + p.amount, 0)})`);
  }
  if (grouped.twoDays.length > 0) {
    lines.push(`📅 In 2 days: ${grouped.twoDays.length} payment${grouped.twoDays.length > 1 ? 's' : ''} (₹${grouped.twoDays.reduce((s, p) => s + p.amount, 0)})`);
  }

  await notifee.displayNotification({
    id: 'persistent-payment-summary',
    title: `${payments.length} Upcoming Payment${payments.length > 1 ? 's' : ''} • ₹${totalAmount}`,
    body: lines.join('\n'),
    android: {
      channelId: CHANNEL_ID_PERSISTENT,
      importance: AndroidImportance.LOW,
      ongoing: true,
      autoCancel: false,
      pressAction: {
        id: 'default',
      },
      color: '#5B67CA',
      style: {
        type: AndroidStyle.BIGTEXT,
        text: lines.join('\n'),
      },
      category: AndroidCategory.STATUS,
      visibility: AndroidVisibility.PUBLIC,
    },
  });
}

/**
 * Schedule smart notifications for a payment
 * - 2 days before: Single notification at 9 AM
 * - 1 day before: Single notification at 9 AM
 * - On payment day: Single notification at 7 AM
 */
export async function schedulePaymentNotifications(
  payment: UpcomingPayment,
  enabledForItem: boolean = true
): Promise<void> {
  if (!enabledForItem) return;

  const dueDate = dayjs(payment.dueDate);
  const now = Date.now();
  const typeLabel = payment.type === 'subscription' ? 'Subscription' : 'Autopay';

  const notifications = [
    // 2 days before - 9 AM
    {
      id: `payment-${payment.id}-2d`,
      time: dueDate.subtract(2, 'day').hour(9).minute(0).second(0),
      title: `⏰ ${typeLabel} Due in 2 Days`,
      body: `${payment.merchantName} • ₹${payment.amount}`,
    },
    // 1 day before - 9 AM
    {
      id: `payment-${payment.id}-1d`,
      time: dueDate.subtract(1, 'day').hour(9).minute(0).second(0),
      title: `⚠️ ${typeLabel} Due Tomorrow`,
      body: `${payment.merchantName} • ₹${payment.amount}`,
    },
    // On payment day - 7 AM
    {
      id: `payment-${payment.id}-today`,
      time: dueDate.hour(7).minute(0).second(0),
      title: `🔔 ${typeLabel} Due Today`,
      body: `${payment.merchantName} • ₹${payment.amount}`,
    },
  ];

  for (const notification of notifications) {
    const timestamp = notification.time.valueOf();
    
    if (timestamp <= now) {
      console.log(`[SmartNotifications] Skipping past notification: ${notification.id}`);
      continue;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp,
    };

    try {
      await notifee.createTriggerNotification(
        {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          android: {
            channelId: CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
            color: '#5B67CA',
            sound: 'default',
            vibrationPattern: [300, 500],
          },
        },
        trigger
      );
      console.log(`[SmartNotifications] Scheduled: ${notification.id} at ${notification.time.format('MMM D, h:mm A')}`);
    } catch (error) {
      console.error(`[SmartNotifications] Error scheduling ${notification.id}:`, error);
    }
  }
}

/**
 * Schedule daily digest notification at 8 AM
 */
export async function scheduleDailyDigest(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[]
): Promise<void> {
  const tomorrow = dayjs().add(1, 'day').hour(8).minute(0).second(0);
  const payments = getUpcomingPayments(subscriptions, autopayTransactions, 7);
  
  if (payments.length === 0) return;

  const grouped = groupPaymentsByDay(payments);
  const lines: string[] = [];

  if (grouped.today.length > 0) {
    lines.push(`Today: ${grouped.today.map(p => `${p.merchantName} (₹${p.amount})`).join(', ')}`);
  }
  if (grouped.tomorrow.length > 0) {
    lines.push(`Tomorrow: ${grouped.tomorrow.length} payment${grouped.tomorrow.length > 1 ? 's' : ''}`);
  }
  if (grouped.twoDays.length > 0) {
    lines.push(`In 2 days: ${grouped.twoDays.length} payment${grouped.twoDays.length > 1 ? 's' : ''}`);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: tomorrow.valueOf(),
    repeatFrequency: 'daily' as any,
  };

  try {
    await notifee.createTriggerNotification(
      {
        id: 'daily-payment-digest',
        title: '☀️ Good Morning! Payment Summary',
        body: lines.join('\n'),
        android: {
          channelId: CHANNEL_ID_DIGEST,
          importance: AndroidImportance.DEFAULT,
          pressAction: {
            id: 'default',
          },
          color: '#5B67CA',
          style: {
            type: AndroidStyle.INBOX,
            lines,
          },
        },
      },
      trigger
    );
    console.log('[SmartNotifications] Scheduled daily digest');
  } catch (error) {
    console.error('[SmartNotifications] Error scheduling daily digest:', error);
  }
}

/**
 * Schedule all notifications for subscriptions and autopay
 */
export async function scheduleAllSmartNotifications(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[]
): Promise<void> {
  // Cancel all existing scheduled notifications
  const scheduled = await notifee.getTriggerNotifications();
  for (const notification of scheduled) {
    await notifee.cancelNotification(notification.notification.id!);
  }

  // Get all upcoming payments
  const payments = getUpcomingPayments(subscriptions, autopayTransactions, 7);

  // Schedule individual notifications
  for (const payment of payments) {
    const enabled = payment.type === 'subscription' 
      ? subscriptions.find(s => s.id === payment.id)?.notificationEnabled ?? true
      : autopayTransactions.find(a => a.id === payment.id)?.notificationEnabled ?? true;
    
    await schedulePaymentNotifications(payment, enabled);
  }

  // Update persistent notification
  await showPersistentPaymentNotification(subscriptions, autopayTransactions);

  // Schedule daily digest
  await scheduleDailyDigest(subscriptions, autopayTransactions);

  console.log(`[SmartNotifications] Scheduled notifications for ${payments.length} payments`);
}

/**
 * Cancel all notifications for a specific payment
 */
export async function cancelPaymentNotifications(paymentId: string): Promise<void> {
  const notificationIds = [
    `payment-${paymentId}-2d`,
    `payment-${paymentId}-1d`,
    `payment-${paymentId}-today`,
  ];

  for (const id of notificationIds) {
    await notifee.cancelNotification(id);
  }
}
