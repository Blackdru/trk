import notifee, { AndroidImportance, TriggerType, TimestampTrigger } from '@notifee/react-native';
import dayjs from 'dayjs';
import type { Subscription } from '../types';

const CHANNEL_ID = 'upi-subscription-reminders';

export async function createNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Subscription Reminders',
    importance: AndroidImportance.HIGH,
    description: 'Reminders for upcoming subscription renewals',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

/**
 * Schedule multiple notifications for a subscription:
 * - 2 days before: 8 AM and 8 PM
 * - 1 day before: 8 AM and 8 PM
 * - On renewal day: 6 AM
 */
export async function scheduleRenewalNotification(subscription: Subscription): Promise<void> {
  if (!subscription.notificationEnabled) return;

  const renewalDate = dayjs(subscription.nextRenewalDate);
  const now = Date.now();

  // Define notification schedule
  const notifications = [
    // 2 days before - 8 AM
    {
      id: `renewal-${subscription.id}-2d-am`,
      time: renewalDate.subtract(2, 'day').hour(8).minute(0).second(0),
      title: '⏰ Subscription Renewal Reminder',
      body: `${subscription.merchantName} renews in 2 days (₹${subscription.amount})`,
    },
    // 2 days before - 8 PM
    {
      id: `renewal-${subscription.id}-2d-pm`,
      time: renewalDate.subtract(2, 'day').hour(20).minute(0).second(0),
      title: '⏰ Subscription Renewal Reminder',
      body: `${subscription.merchantName} renews in 2 days (₹${subscription.amount})`,
    },
    // 1 day before - 8 AM
    {
      id: `renewal-${subscription.id}-1d-am`,
      time: renewalDate.subtract(1, 'day').hour(8).minute(0).second(0),
      title: '⚠️ Subscription Renews Tomorrow',
      body: `${subscription.merchantName} renews tomorrow (₹${subscription.amount})`,
    },
    // 1 day before - 8 PM
    {
      id: `renewal-${subscription.id}-1d-pm`,
      time: renewalDate.subtract(1, 'day').hour(20).minute(0).second(0),
      title: '⚠️ Subscription Renews Tomorrow',
      body: `${subscription.merchantName} renews tomorrow (₹${subscription.amount})`,
    },
    // On renewal day - 6 AM
    {
      id: `renewal-${subscription.id}-today`,
      time: renewalDate.hour(6).minute(0).second(0),
      title: '🔔 Subscription Renewing Today',
      body: `${subscription.merchantName} renews today (₹${subscription.amount})`,
    },
  ];

  // Schedule each notification if time hasn't passed
  for (const notification of notifications) {
    const timestamp = notification.time.valueOf();
    
    // Skip if notification time has already passed
    if (timestamp <= now) {
      console.log(`[Notifications] Skipping past notification: ${notification.id}`);
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
            smallIcon: 'ic_notification',
            color: '#5B67CA',
          },
        },
        trigger
      );
      console.log(`[Notifications] Scheduled: ${notification.id} at ${notification.time.format('MMM D, h:mm A')}`);
    } catch (error) {
      console.error(`[Notifications] Error scheduling ${notification.id}:`, error);
    }
  }
}

export async function cancelNotification(subscriptionId: string): Promise<void> {
  // Cancel all notifications for this subscription
  const notificationIds = [
    `renewal-${subscriptionId}-2d-am`,
    `renewal-${subscriptionId}-2d-pm`,
    `renewal-${subscriptionId}-1d-am`,
    `renewal-${subscriptionId}-1d-pm`,
    `renewal-${subscriptionId}-today`,
  ];

  for (const id of notificationIds) {
    await notifee.cancelNotification(id);
  }
}

export async function scheduleAllNotifications(subscriptions: Subscription[]): Promise<void> {
  // Cancel all existing
  await notifee.cancelAllNotifications();

  // Schedule new ones
  for (const sub of subscriptions) {
    await scheduleRenewalNotification(sub);
  }
}

/**
 * Get subscriptions that are due for renewal soon (for in-app alerts)
 */
export function getUpcomingRenewals(subscriptions: Subscription[]): {
  today: Subscription[];
  tomorrow: Subscription[];
  twoDays: Subscription[];
} {
  const now = dayjs();
  const today = now.startOf('day');
  const tomorrow = today.add(1, 'day');
  const twoDays = today.add(2, 'day');
  const threeDays = today.add(3, 'day');

  return {
    today: subscriptions.filter(sub => {
      const renewalDay = dayjs(sub.nextRenewalDate).startOf('day');
      return renewalDay.isSame(today, 'day');
    }),
    tomorrow: subscriptions.filter(sub => {
      const renewalDay = dayjs(sub.nextRenewalDate).startOf('day');
      return renewalDay.isSame(tomorrow, 'day');
    }),
    twoDays: subscriptions.filter(sub => {
      const renewalDay = dayjs(sub.nextRenewalDate).startOf('day');
      return renewalDay.isSame(twoDays, 'day');
    }),
  };
}
