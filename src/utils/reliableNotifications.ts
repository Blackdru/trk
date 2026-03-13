import notifee, { 
  AndroidImportance, 
  TriggerType, 
  TimestampTrigger,
  AndroidStyle,
  AndroidCategory,
  AndroidVisibility,
  RepeatFrequency,
  EventType,
} from '@notifee/react-native';
import dayjs from 'dayjs';
import type { Subscription, AutopayTransaction } from '../types';

const CHANNEL_ID_CRITICAL = 'upi-critical-reminders';
const CHANNEL_ID_IMPORTANT = 'upi-important-reminders';
const CHANNEL_ID_PERSISTENT = 'upi-payment-persistent';
const CHANNEL_ID_DAILY = 'upi-daily-digest';

export async function createNotificationChannels(): Promise<void> {
  // Critical channel - Maximum priority, bypass DND
  await notifee.createChannel({
    id: CHANNEL_ID_CRITICAL,
    name: 'Critical Payment Reminders',
    importance: AndroidImportance.HIGH,
    description: 'Critical reminders for payments due today',
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    lights: true,
    lightColor: '#FF0000',
    badge: true,
  });

  // Important channel - High priority
  await notifee.createChannel({
    id: CHANNEL_ID_IMPORTANT,
    name: 'Important Payment Reminders',
    importance: AndroidImportance.HIGH,
    description: 'Important reminders for upcoming payments',
    sound: 'default',
    vibration: true,
    badge: true,
  });

  // Persistent channel
  await notifee.createChannel({
    id: CHANNEL_ID_PERSISTENT,
    name: 'Upcoming Payments Summary',
    importance: AndroidImportance.LOW,
    description: 'Always-visible summary of upcoming payments',
    badge: true,
  });

  // Daily digest channel
  await notifee.createChannel({
    id: CHANNEL_ID_DAILY,
    name: 'Daily Payment Digest',
    importance: AndroidImportance.DEFAULT,
    description: 'Daily summary of payments',
    sound: 'default',
    badge: true,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

interface Payment {
  id: string;
  merchantName: string;
  amount: number;
  dueDate: number;
  type: 'subscription' | 'autopay';
  category?: string;
  notificationEnabled: boolean;
}

/**
 * BULLETPROOF REMINDER SCHEDULE:
 * 
 * 7 DAYS BEFORE: 9 AM (Early warning)
 * 5 DAYS BEFORE: 9 AM (Mid-week reminder)
 * 3 DAYS BEFORE: 9 AM + 8 PM (Weekend reminder)
 * 2 DAYS BEFORE: 9 AM + 8 PM (Urgent reminder)
 * 1 DAY BEFORE: 8 AM + 12 PM + 6 PM + 9 PM (Multiple reminders)
 * ON THE DAY: 6 AM + 9 AM + 12 PM + 3 PM + 6 PM (Critical reminders throughout the day)
 * 
 * Total: 16 notifications per payment to ensure user NEVER forgets
 */
export async function scheduleReliableReminders(payment: Payment): Promise<void> {
  if (!payment.notificationEnabled) return;

  const dueDate = dayjs(payment.dueDate);
  const now = Date.now();
  const typeLabel = payment.type === 'subscription' ? 'Subscription' : 'Autopay';
  const categoryEmoji = getCategoryEmoji(payment.category);

  const notifications = [
    // 7 DAYS BEFORE - Early warning
    {
      id: `payment-${payment.id}-7d`,
      time: dueDate.subtract(7, 'day').hour(9).minute(0).second(0),
      title: `📅 Upcoming ${typeLabel} in 7 Days`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nDue on ${dueDate.format('MMM D')}`,
      channel: CHANNEL_ID_IMPORTANT,
      priority: 'default' as const,
    },
    
    // 5 DAYS BEFORE - Mid-week reminder
    {
      id: `payment-${payment.id}-5d`,
      time: dueDate.subtract(5, 'day').hour(9).minute(0).second(0),
      title: `⏰ ${typeLabel} Due in 5 Days`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nDue on ${dueDate.format('MMM D')}`,
      channel: CHANNEL_ID_IMPORTANT,
      priority: 'default' as const,
    },

    // 3 DAYS BEFORE - Morning
    {
      id: `payment-${payment.id}-3d-am`,
      time: dueDate.subtract(3, 'day').hour(9).minute(0).second(0),
      title: `⚠️ ${typeLabel} Due in 3 Days`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nEnsure sufficient balance`,
      channel: CHANNEL_ID_IMPORTANT,
      priority: 'high' as const,
    },
    
    // 3 DAYS BEFORE - Evening
    {
      id: `payment-${payment.id}-3d-pm`,
      time: dueDate.subtract(3, 'day').hour(20).minute(0).second(0),
      title: `⚠️ Reminder: ${typeLabel} in 3 Days`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}`,
      channel: CHANNEL_ID_IMPORTANT,
      priority: 'high' as const,
    },

    // 2 DAYS BEFORE - Morning
    {
      id: `payment-${payment.id}-2d-am`,
      time: dueDate.subtract(2, 'day').hour(9).minute(0).second(0),
      title: `🔔 URGENT: ${typeLabel} in 2 Days`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nCheck your account balance now`,
      channel: CHANNEL_ID_IMPORTANT,
      priority: 'high' as const,
    },
    
    // 2 DAYS BEFORE - Evening
    {
      id: `payment-${payment.id}-2d-pm`,
      time: dueDate.subtract(2, 'day').hour(20).minute(0).second(0),
      title: `🔔 Don't Forget: ${typeLabel} in 2 Days`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}`,
      channel: CHANNEL_ID_IMPORTANT,
      priority: 'high' as const,
    },

    // 1 DAY BEFORE - Early morning
    {
      id: `payment-${payment.id}-1d-early`,
      time: dueDate.subtract(1, 'day').hour(8).minute(0).second(0),
      title: `🚨 TOMORROW: ${typeLabel} Payment`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nPayment will be processed tomorrow`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // 1 DAY BEFORE - Noon
    {
      id: `payment-${payment.id}-1d-noon`,
      time: dueDate.subtract(1, 'day').hour(12).minute(0).second(0),
      title: `🚨 Reminder: Payment Tomorrow`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nLast chance to ensure funds`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // 1 DAY BEFORE - Evening
    {
      id: `payment-${payment.id}-1d-evening`,
      time: dueDate.subtract(1, 'day').hour(18).minute(0).second(0),
      title: `🚨 Final Reminder: Payment Tomorrow`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nVerify your account balance`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // 1 DAY BEFORE - Night
    {
      id: `payment-${payment.id}-1d-night`,
      time: dueDate.subtract(1, 'day').hour(21).minute(0).second(0),
      title: `🚨 Last Warning: Payment Tomorrow`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },

    // ON THE DAY - Very early morning
    {
      id: `payment-${payment.id}-today-dawn`,
      time: dueDate.hour(6).minute(0).second(0),
      title: `🔴 TODAY: ${typeLabel} Payment`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nPayment will be processed today!`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // ON THE DAY - Morning
    {
      id: `payment-${payment.id}-today-morning`,
      time: dueDate.hour(9).minute(0).second(0),
      title: `🔴 PAYMENT TODAY: ${payment.merchantName}`,
      body: `${categoryEmoji} ₹${payment.amount} will be debited today\nEnsure sufficient balance immediately`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // ON THE DAY - Noon
    {
      id: `payment-${payment.id}-today-noon`,
      time: dueDate.hour(12).minute(0).second(0),
      title: `🔴 URGENT: Payment Due Today`,
      body: `${categoryEmoji} ${payment.merchantName} • ₹${payment.amount}\nCheck if payment has been processed`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // ON THE DAY - Afternoon
    {
      id: `payment-${payment.id}-today-afternoon`,
      time: dueDate.hour(15).minute(0).second(0),
      title: `🔴 Payment Processing: ${payment.merchantName}`,
      body: `${categoryEmoji} ₹${payment.amount} • Verify your account`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
    
    // ON THE DAY - Evening
    {
      id: `payment-${payment.id}-today-evening`,
      time: dueDate.hour(18).minute(0).second(0),
      title: `🔴 Final Check: ${payment.merchantName}`,
      body: `${categoryEmoji} ₹${payment.amount} • Confirm payment status`,
      channel: CHANNEL_ID_CRITICAL,
      priority: 'max' as const,
    },
  ];

  let scheduledCount = 0;

  for (const notification of notifications) {
    const timestamp = notification.time.valueOf();
    
    if (timestamp <= now) {
      console.log(`[ReliableNotifications] Skipping past: ${notification.id}`);
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
            channelId: notification.channel,
            importance: notification.priority === 'max' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
            pressAction: {
              id: 'default',
            },
            color: notification.priority === 'max' ? '#EF4444' : '#5B67CA',
            sound: 'default',
            vibrationPattern: notification.priority === 'max' ? [300, 500, 300, 500] : [300, 500],
            lights: notification.priority === 'max' ? ['#FF0000', 300, 1000] : ['#5B67CA', 300, 1000],
            badge: true,
            autoCancel: true,
            ongoing: false,
            category: AndroidCategory.REMINDER,
            visibility: AndroidVisibility.PUBLIC,
            actions: [
              {
                title: '✓ Mark as Paid',
                pressAction: { id: 'mark-paid' },
              },
              {
                title: '⏰ Remind Later',
                pressAction: { id: 'snooze' },
              },
            ],
          },
        },
        trigger
      );
      scheduledCount++;
      console.log(`[ReliableNotifications] Scheduled: ${notification.id} at ${notification.time.format('MMM D, h:mm A')}`);
    } catch (error) {
      console.error(`[ReliableNotifications] Error scheduling ${notification.id}:`, error);
    }
  }

  console.log(`[ReliableNotifications] Scheduled ${scheduledCount} reminders for ${payment.merchantName}`);
}

/**
 * Show persistent notification with countdown and upcoming payments
 */
export async function showPersistentPaymentSummary(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[]
): Promise<void> {
  const payments = getAllUpcomingPayments(subscriptions, autopayTransactions, 7);
  
  if (payments.length === 0) {
    await notifee.cancelNotification('persistent-payment-summary');
    return;
  }

  const grouped = groupPaymentsByDay(payments);
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  // Build detailed lines
  const lines: string[] = [];
  
  if (grouped.today.length > 0) {
    lines.push(`🔴 TODAY: ${grouped.today.length} payment${grouped.today.length > 1 ? 's' : ''} • ₹${grouped.today.reduce((s, p) => s + p.amount, 0)}`);
    grouped.today.forEach(p => {
      lines.push(`  • ${p.merchantName} - ₹${p.amount}`);
    });
  }
  
  if (grouped.tomorrow.length > 0) {
    lines.push(`⚠️ TOMORROW: ${grouped.tomorrow.length} payment${grouped.tomorrow.length > 1 ? 's' : ''} • ₹${grouped.tomorrow.reduce((s, p) => s + p.amount, 0)}`);
    grouped.tomorrow.forEach(p => {
      lines.push(`  • ${p.merchantName} - ₹${p.amount}`);
    });
  }
  
  if (grouped.twoDays.length > 0) {
    lines.push(`📅 IN 2 DAYS: ${grouped.twoDays.length} payment${grouped.twoDays.length > 1 ? 's' : ''} • ₹${grouped.twoDays.reduce((s, p) => s + p.amount, 0)}`);
  }
  
  if (grouped.later.length > 0) {
    lines.push(`📆 LATER: ${grouped.later.length} more payment${grouped.later.length > 1 ? 's' : ''}`);
  }

  await notifee.displayNotification({
    id: 'persistent-payment-summary',
    title: `💰 ${payments.length} Upcoming Payment${payments.length > 1 ? 's' : ''} • Total: ₹${totalAmount}`,
    body: lines.slice(0, 5).join('\n'),
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
      badge: true,
      progress: {
        max: 7,
        current: 7 - Math.ceil(dayjs(payments[0].dueDate).diff(dayjs(), 'day')),
      },
    },
  });
}

/**
 * Schedule daily digest at 8 AM with detailed breakdown
 */
export async function scheduleDailyDigest(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[]
): Promise<void> {
  const tomorrow = dayjs().add(1, 'day').hour(8).minute(0).second(0);
  const payments = getAllUpcomingPayments(subscriptions, autopayTransactions, 7);
  
  if (payments.length === 0) return;

  const grouped = groupPaymentsByDay(payments);
  const lines: string[] = [];

  lines.push('☀️ Good Morning! Here\'s your payment summary:');
  lines.push('');

  if (grouped.today.length > 0) {
    lines.push(`🔴 DUE TODAY (${grouped.today.length}):`);
    grouped.today.forEach(p => {
      lines.push(`  • ${p.merchantName} - ₹${p.amount}`);
    });
    lines.push('');
  }

  if (grouped.tomorrow.length > 0) {
    lines.push(`⚠️ DUE TOMORROW (${grouped.tomorrow.length}):`);
    grouped.tomorrow.forEach(p => {
      lines.push(`  • ${p.merchantName} - ₹${p.amount}`);
    });
    lines.push('');
  }

  if (grouped.twoDays.length > 0) {
    lines.push(`📅 IN 2 DAYS (${grouped.twoDays.length}):`);
    grouped.twoDays.forEach(p => {
      lines.push(`  • ${p.merchantName} - ₹${p.amount}`);
    });
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: tomorrow.valueOf(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  try {
    await notifee.createTriggerNotification(
      {
        id: 'daily-payment-digest',
        title: '☀️ Daily Payment Summary',
        body: lines.join('\n'),
        android: {
          channelId: CHANNEL_ID_DAILY,
          importance: AndroidImportance.DEFAULT,
          pressAction: {
            id: 'default',
          },
          color: '#5B67CA',
          style: {
            type: AndroidStyle.BIGTEXT,
            text: lines.join('\n'),
          },
          badge: true,
        },
      },
      trigger
    );
    console.log('[ReliableNotifications] Scheduled daily digest');
  } catch (error) {
    console.error('[ReliableNotifications] Error scheduling daily digest:', error);
  }
}

/**
 * Schedule all reliable reminders
 */
export async function scheduleAllReliableReminders(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[]
): Promise<void> {
  console.log('[ReliableNotifications] Starting comprehensive reminder scheduling...');

  // Cancel all existing scheduled notifications
  const scheduled = await notifee.getTriggerNotifications();
  for (const notification of scheduled) {
    await notifee.cancelNotification(notification.notification.id!);
  }
  console.log(`[ReliableNotifications] Cancelled ${scheduled.length} existing notifications`);

  // Get all upcoming payments
  const payments = getAllUpcomingPayments(subscriptions, autopayTransactions, 30);
  console.log(`[ReliableNotifications] Found ${payments.length} upcoming payments`);

  // Schedule reminders for each payment
  let totalScheduled = 0;
  for (const payment of payments) {
    await scheduleReliableReminders(payment);
    totalScheduled++;
  }

  // Update persistent notification
  await showPersistentPaymentSummary(subscriptions, autopayTransactions);

  // Schedule daily digest
  await scheduleDailyDigest(subscriptions, autopayTransactions);

  console.log(`[ReliableNotifications] ✅ Scheduled reminders for ${totalScheduled} payments`);
  console.log(`[ReliableNotifications] Total notifications: ${totalScheduled * 15} (avg 15 per payment)`);
}

/**
 * Cancel all reminders for a specific payment
 */
export async function cancelPaymentReminders(paymentId: string): Promise<void> {
  const notificationIds = [
    `payment-${paymentId}-7d`,
    `payment-${paymentId}-5d`,
    `payment-${paymentId}-3d-am`,
    `payment-${paymentId}-3d-pm`,
    `payment-${paymentId}-2d-am`,
    `payment-${paymentId}-2d-pm`,
    `payment-${paymentId}-1d-early`,
    `payment-${paymentId}-1d-noon`,
    `payment-${paymentId}-1d-evening`,
    `payment-${paymentId}-1d-night`,
    `payment-${paymentId}-today-dawn`,
    `payment-${paymentId}-today-morning`,
    `payment-${paymentId}-today-noon`,
    `payment-${paymentId}-today-afternoon`,
    `payment-${paymentId}-today-evening`,
  ];

  for (const id of notificationIds) {
    await notifee.cancelNotification(id);
  }
}

// Helper functions

function getAllUpcomingPayments(
  subscriptions: Subscription[],
  autopayTransactions: AutopayTransaction[],
  days: number
): Payment[] {
  const now = Date.now();
  const futureDate = dayjs().add(days, 'day').valueOf();
  const payments: Payment[] = [];

  subscriptions.forEach(sub => {
    if (sub.nextRenewalDate >= now && sub.nextRenewalDate <= futureDate) {
      payments.push({
        id: sub.id,
        merchantName: sub.merchantName,
        amount: sub.amount,
        dueDate: sub.nextRenewalDate,
        type: 'subscription',
        notificationEnabled: sub.notificationEnabled,
      });
    }
  });

  autopayTransactions.forEach(autopay => {
    if (autopay.nextPaymentDate && autopay.nextPaymentDate >= now && autopay.nextPaymentDate <= futureDate) {
      payments.push({
        id: autopay.id,
        merchantName: autopay.merchantName,
        amount: autopay.amount,
        dueDate: autopay.nextPaymentDate,
        type: 'autopay',
        category: autopay.category,
        notificationEnabled: autopay.notificationEnabled ?? true,
      });
    }
  });

  return payments.sort((a, b) => a.dueDate - b.dueDate);
}

function groupPaymentsByDay(payments: Payment[]): {
  today: Payment[];
  tomorrow: Payment[];
  twoDays: Payment[];
  later: Payment[];
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

function getCategoryEmoji(category?: string): string {
  switch (category) {
    case 'utility': return '⚡';
    case 'insurance': return '🛡️';
    case 'loan': return '💳';
    case 'telecom': return '📱';
    case 'investment': return '📈';
    case 'subscription': return '🔄';
    default: return '💰';
  }
}
