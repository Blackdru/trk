import dayjs from 'dayjs';
import type { Subscription, AutopayTransaction } from '../../types';

// Mock notifee before importing
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    createTriggerNotification: jest.fn(),
    getTriggerNotifications: jest.fn(),
    cancelNotification: jest.fn(),
    displayNotification: jest.fn(),
    requestPermission: jest.fn(),
  },
  TriggerType: {
    TIMESTAMP: 0,
  },
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
  },
  AndroidCategory: {
    REMINDER: 'reminder',
    STATUS: 'status',
  },
  AndroidVisibility: {
    PUBLIC: 1,
  },
  AndroidStyle: {
    BIGTEXT: 1,
  },
  RepeatFrequency: {
    DAILY: 'daily',
  },
}));

import notifee, { TriggerType } from '@notifee/react-native';
import { scheduleReliableReminders, scheduleAllReliableReminders } from '../reliableNotifications';

describe('ReliableNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);
    (notifee.createTriggerNotification as jest.Mock).mockResolvedValue(undefined);
    (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
    (notifee.cancelNotification as jest.Mock).mockResolvedValue(undefined);
  });

  describe('scheduleReliableReminders', () => {
    it('should schedule notifications for 2 days before', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').hour(12).minute(0).second(0).millisecond(0);

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate: dueDate.valueOf(),
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      // Should schedule multiple notifications including 2 days before
      expect(notifee.createTriggerNotification).toHaveBeenCalled();

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // Find 2 days before notifications
      const twoDaysBeforeNotifications = calls.filter((call: any) => {
        const notification = call[0];
        return notification.id?.includes('2d');
      });

      expect(twoDaysBeforeNotifications.length).toBeGreaterThan(0);
    });

    it('should schedule notifications for 1 day before', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').hour(12).minute(0).second(0).millisecond(0);

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate: dueDate.valueOf(),
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // Find 1 day before notifications
      const oneDayBeforeNotifications = calls.filter((call: any) => {
        const notification = call[0];
        return notification.id?.includes('1d');
      });

      expect(oneDayBeforeNotifications.length).toBeGreaterThan(0);
    });

    it('should schedule notifications for due date', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').hour(12).minute(0).second(0).millisecond(0);

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate: dueDate.valueOf(),
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // Find due date notifications
      const dueDateNotifications = calls.filter((call: any) => {
        const notification = call[0];
        return notification.id?.includes('today');
      });

      expect(dueDateNotifications.length).toBeGreaterThan(0);
    });

    it('should include merchant name and amount in notifications', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').valueOf();

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate,
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // Check that notifications include merchant name and amount
      calls.forEach((call: any) => {
        const notification = call[0];
        expect(notification.body).toContain('Netflix');
        expect(notification.body).toContain('199');
      });
    });

    it('should use timestamp triggers', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').valueOf();

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate,
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // Check that all triggers are timestamp type
      calls.forEach((call: any) => {
        const trigger = call[1];
        expect(trigger.type).toBe(TriggerType.TIMESTAMP);
        expect(trigger.timestamp).toBeGreaterThan(now.valueOf());
      });
    });

    it('should skip past notifications', async () => {
      const now = dayjs();
      const dueDate = now.add(1, 'day').hour(12).minute(0).second(0).millisecond(0);

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate: dueDate.valueOf(),
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // All scheduled notifications should be in the future
      calls.forEach((call: any) => {
        const trigger = call[1];
        expect(trigger.timestamp).toBeGreaterThan(now.valueOf());
      });
    });

    it('should not schedule if notifications disabled', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').valueOf();

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate,
        type: 'subscription' as const,
        notificationEnabled: false, // Disabled
      };

      await scheduleReliableReminders(payment);

      expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('should use high priority for critical notifications', async () => {
      const now = dayjs();
      const dueDate = now.add(5, 'day').valueOf();

      const payment = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        dueDate,
        type: 'subscription' as const,
        notificationEnabled: true,
      };

      await scheduleReliableReminders(payment);

      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      
      // Find critical notifications (1 day before and due date)
      const criticalNotifications = calls.filter((call: any) => {
        const notification = call[0];
        return notification.id?.includes('1d') || notification.id?.includes('today');
      });

      // Check that critical notifications use critical channel
      criticalNotifications.forEach((call: any) => {
        const notification = call[0];
        expect(notification.android.channelId).toBe('upi-critical-reminders');
      });
    });
  });

  describe('scheduleAllReliableReminders', () => {
    it('should cancel existing notifications before scheduling', async () => {
      const existingNotifications = [
        { notification: { id: 'old-1' } },
        { notification: { id: 'old-2' } },
      ];
      (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue(existingNotifications);

      const now = dayjs();
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: now.add(5, 'day').valueOf(),
        lastPaymentDate: now.subtract(25, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await scheduleAllReliableReminders([subscription], []);

      expect(notifee.cancelNotification).toHaveBeenCalledTimes(2);
      expect(notifee.cancelNotification).toHaveBeenCalledWith('old-1');
      expect(notifee.cancelNotification).toHaveBeenCalledWith('old-2');
    });

    it('should schedule reminders for all subscriptions', async () => {
      const now = dayjs();
      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          billingCycle: 'monthly',
          nextRenewalDate: now.add(5, 'day').valueOf(),
          lastPaymentDate: now.subtract(25, 'day').valueOf(),
          source: 'manual',
          notificationEnabled: true,
          createdAt: now.subtract(30, 'day').valueOf(),
        },
        {
          id: 'sub-2',
          merchantName: 'Spotify',
          amount: 119,
          billingCycle: 'monthly',
          nextRenewalDate: now.add(7, 'day').valueOf(),
          lastPaymentDate: now.subtract(23, 'day').valueOf(),
          source: 'manual',
          notificationEnabled: true,
          createdAt: now.subtract(30, 'day').valueOf(),
        },
      ];

      await scheduleAllReliableReminders(subscriptions, []);

      // Should schedule notifications for both subscriptions
      expect(notifee.createTriggerNotification).toHaveBeenCalled();
      
      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      const netflixNotifications = calls.filter((call: any) => 
        call[0].body?.includes('Netflix')
      );
      const spotifyNotifications = calls.filter((call: any) => 
        call[0].body?.includes('Spotify')
      );

      expect(netflixNotifications.length).toBeGreaterThan(0);
      expect(spotifyNotifications.length).toBeGreaterThan(0);
    });

    it('should schedule reminders for autopay transactions', async () => {
      const now = dayjs();
      const autopay: AutopayTransaction = {
        id: 'autopay-1',
        merchantName: 'Electricity Bill',
        amount: 1500,
        category: 'utility',
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        nextPaymentDate: now.add(5, 'day').valueOf(),
        detectedCycle: 'monthly',
        cycleConfidence: 0.9,
        paymentHistory: [],
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await scheduleAllReliableReminders([], [autopay]);

      expect(notifee.createTriggerNotification).toHaveBeenCalled();
      
      const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
      const autopayNotifications = calls.filter((call: any) => 
        call[0].body?.includes('Electricity Bill')
      );

      expect(autopayNotifications.length).toBeGreaterThan(0);
    });

    it('should skip payments without notification enabled', async () => {
      const now = dayjs();
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: now.add(5, 'day').valueOf(),
        lastPaymentDate: now.subtract(25, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: false, // Disabled
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await scheduleAllReliableReminders([subscription], []);

      // Should not schedule any notifications
      expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    });
  });
});
