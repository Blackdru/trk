import dayjs from 'dayjs';
import type { Subscription, AutopayTransaction } from '../../types';

// Mock dependencies BEFORE imports
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: {
    alert: jest.fn(),
  },
  NativeModules: {
    AlarmManager: {
      scheduleAlarm: jest.fn(),
      cancelAlarm: jest.fn(),
      cancelAllAlarms: jest.fn(),
      canScheduleExactAlarms: jest.fn(),
      requestExactAlarmPermission: jest.fn(),
      isBatteryOptimizationDisabled: jest.fn(),
      requestDisableBatteryOptimization: jest.fn(),
    },
  },
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(),
  createMMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../storage');

import { schedulePaymentAlarms, getPendingAlarms } from '../alarmService';
import * as AlarmModule from '../../native/AlarmModule';
import { getStorage } from '../../storage';

describe('AlarmService', () => {
  const mockStorage = {
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getStorage as jest.Mock).mockReturnValue(mockStorage);
    
    // Mock AlarmModule functions
    (AlarmModule.canScheduleExactAlarms as jest.Mock) = jest.fn().mockResolvedValue(true);
    (AlarmModule.isBatteryOptimizationDisabled as jest.Mock) = jest.fn().mockResolvedValue(true);
    (AlarmModule.scheduleAlarm as jest.Mock) = jest.fn().mockResolvedValue(true);
  });

  describe('schedulePaymentAlarms', () => {
    it('should schedule alarms for subscription 2 days before, 1 day before, and on due date', async () => {
      const now = dayjs();
      const dueDate = now.add(3, 'day').hour(12).minute(0).second(0).millisecond(0);
      
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: dueDate.valueOf(),
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await schedulePaymentAlarms([subscription], [], 8, 6);

      // Should schedule 3 alarms: 2 days before (8 AM), 1 day before (8 AM), due date (6 AM)
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledTimes(3);

      // Verify 2 days before alarm
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          urgency: 'two-days',
          type: 'subscription',
        })
      );

      // Verify 1 day before alarm
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'sub-1',
          urgency: 'one-day',
        })
      );

      // Verify due date alarm
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'sub-1',
          urgency: 'today',
        })
      );
    });

    it('should schedule alarms at correct times', async () => {
      const now = dayjs();
      const dueDate = now.add(3, 'day').hour(12).minute(0).second(0).millisecond(0);
      
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: dueDate.valueOf(),
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await schedulePaymentAlarms([subscription], [], 9, 7);

      const calls = (AlarmModule.scheduleAlarm as jest.Mock).mock.calls;

      // 2 days before at 9 AM
      const twoDaysBefore = dueDate.subtract(2, 'day').hour(9).minute(0).second(0).millisecond(0);
      expect(calls[0][0].triggerTime).toBe(twoDaysBefore.valueOf());

      // 1 day before at 9 AM
      const oneDayBefore = dueDate.subtract(1, 'day').hour(9).minute(0).second(0).millisecond(0);
      expect(calls[1][0].triggerTime).toBe(oneDayBefore.valueOf());

      // Due date at 7 AM
      const dueDateAlarm = dueDate.hour(7).minute(0).second(0).millisecond(0);
      expect(calls[2][0].triggerTime).toBe(dueDateAlarm.valueOf());
    });

    it('should schedule alarms for multiple subscriptions', async () => {
      const now = dayjs();
      
      const subscriptions: Subscription[] = [
        {
          id: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          billingCycle: 'monthly',
          nextRenewalDate: now.add(3, 'day').valueOf(),
          lastPaymentDate: now.subtract(27, 'day').valueOf(),
          source: 'manual',
          notificationEnabled: true,
          createdAt: now.subtract(30, 'day').valueOf(),
        },
        {
          id: 'sub-2',
          merchantName: 'Spotify',
          amount: 119,
          billingCycle: 'monthly',
          nextRenewalDate: now.add(5, 'day').valueOf(),
          lastPaymentDate: now.subtract(25, 'day').valueOf(),
          source: 'manual',
          notificationEnabled: true,
          createdAt: now.subtract(30, 'day').valueOf(),
        },
      ];

      await schedulePaymentAlarms(subscriptions, [], 8, 6);

      // Should schedule 3 alarms per subscription = 6 total
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledTimes(6);
    });

    it('should schedule alarms for autopay transactions', async () => {
      const now = dayjs();
      const dueDate = now.add(3, 'day').valueOf();
      
      const autopay: AutopayTransaction = {
        id: 'autopay-1',
        merchantName: 'Electricity Bill',
        amount: 1500,
        category: 'utility',
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        nextPaymentDate: dueDate,
        detectedCycle: 'monthly',
        cycleConfidence: 0.9,
        paymentHistory: [],
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await schedulePaymentAlarms([], [autopay], 8, 6);

      // Should schedule 3 alarms
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledTimes(3);

      expect(AlarmModule.scheduleAlarm).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'autopay-1',
          merchantName: 'Electricity Bill',
          amount: 1500,
          type: 'autopay',
        })
      );
    });

    it('should skip subscriptions with past due dates', async () => {
      const now = dayjs();
      
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: now.subtract(1, 'day').valueOf(), // Past date
        lastPaymentDate: now.subtract(31, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(60, 'day').valueOf(),
      };

      await schedulePaymentAlarms([subscription], [], 8, 6);

      // Should not schedule any alarms
      expect(AlarmModule.scheduleAlarm).not.toHaveBeenCalled();
    });

    it('should skip alarms with past trigger times', async () => {
      const now = dayjs();
      const dueDate = now.add(1, 'day').hour(12).minute(0).second(0).millisecond(0);
      
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: dueDate.valueOf(),
        lastPaymentDate: now.subtract(29, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await schedulePaymentAlarms([subscription], [], 8, 6);

      // Should only schedule 1 alarm (today at 6 AM) since 2 days and 1 day before have passed
      // Actually, if due date is tomorrow, it should schedule 1 day before and due date
      expect(AlarmModule.scheduleAlarm).toHaveBeenCalled();
      
      const calls = (AlarmModule.scheduleAlarm as jest.Mock).mock.calls;
      // All scheduled alarms should have future trigger times
      calls.forEach((call: any) => {
        expect(call[0].triggerTime).toBeGreaterThan(now.valueOf());
      });
    });

    it('should handle permission denial gracefully', async () => {
      (AlarmModule.canScheduleExactAlarms as jest.Mock).mockResolvedValue(false);
      
      const now = dayjs();
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: now.add(3, 'day').valueOf(),
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await schedulePaymentAlarms([subscription], [], 8, 6);

      // Should not schedule any alarms
      expect(AlarmModule.scheduleAlarm).not.toHaveBeenCalled();
    });

    it('should save alarms to storage', async () => {
      const now = dayjs();
      const dueDate = now.add(3, 'day').valueOf();
      
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: dueDate,
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      await schedulePaymentAlarms([subscription], [], 8, 6);

      expect(mockStorage.set).toHaveBeenCalledWith(
        'payment_alarms',
        expect.any(String)
      );

      const savedData = JSON.parse(mockStorage.set.mock.calls[0][1]);
      expect(savedData).toHaveLength(3); // 3 alarms
      expect(savedData[0]).toMatchObject({
        paymentId: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        type: 'subscription',
        dismissed: false,
        markedAsPaid: false,
      });
    });

    it('should use custom alarm times', async () => {
      const now = dayjs();
      const dueDate = now.add(3, 'day').hour(12).minute(0).second(0).millisecond(0);
      
      const subscription: Subscription = {
        id: 'sub-1',
        merchantName: 'Netflix',
        amount: 199,
        billingCycle: 'monthly',
        nextRenewalDate: dueDate.valueOf(),
        lastPaymentDate: now.subtract(27, 'day').valueOf(),
        source: 'manual',
        notificationEnabled: true,
        createdAt: now.subtract(30, 'day').valueOf(),
      };

      // Custom times: 10 AM before due, 5 AM on due date
      await schedulePaymentAlarms([subscription], [], 10, 5);

      const calls = (AlarmModule.scheduleAlarm as jest.Mock).mock.calls;

      // Check that alarms use custom times
      const twoDaysBefore = dueDate.subtract(2, 'day').hour(10).minute(0).second(0).millisecond(0);
      expect(calls[0][0].triggerTime).toBe(twoDaysBefore.valueOf());

      const dueDateAlarm = dueDate.hour(5).minute(0).second(0).millisecond(0);
      expect(calls[2][0].triggerTime).toBe(dueDateAlarm.valueOf());
    });
  });

  describe('getPendingAlarms', () => {
    it('should return pending alarms', () => {
      const now = dayjs();
      const alarms = [
        {
          id: 'alarm-1',
          paymentId: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          dueDate: now.add(3, 'day').valueOf(),
          type: 'subscription' as const,
          urgency: 'two-days' as const,
          triggerTime: now.add(1, 'day').valueOf(),
          dismissed: false,
          markedAsPaid: false,
        },
        {
          id: 'alarm-2',
          paymentId: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          dueDate: now.add(3, 'day').valueOf(),
          type: 'subscription' as const,
          urgency: 'one-day' as const,
          triggerTime: now.add(2, 'day').valueOf(),
          dismissed: false,
          markedAsPaid: false,
        },
      ];

      mockStorage.getString.mockReturnValue(JSON.stringify(alarms));

      const pending = getPendingAlarms();

      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe('alarm-1');
    });

    it('should filter out dismissed alarms', () => {
      const now = dayjs();
      const alarms = [
        {
          id: 'alarm-1',
          paymentId: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          dueDate: now.add(3, 'day').valueOf(),
          type: 'subscription' as const,
          urgency: 'two-days' as const,
          triggerTime: now.add(1, 'day').valueOf(),
          dismissed: true, // Dismissed
          markedAsPaid: false,
        },
        {
          id: 'alarm-2',
          paymentId: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          dueDate: now.add(3, 'day').valueOf(),
          type: 'subscription' as const,
          urgency: 'one-day' as const,
          triggerTime: now.add(2, 'day').valueOf(),
          dismissed: false,
          markedAsPaid: false,
        },
      ];

      mockStorage.getString.mockReturnValue(JSON.stringify(alarms));

      const pending = getPendingAlarms();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('alarm-2');
    });

    it('should filter out paid alarms', () => {
      const now = dayjs();
      const alarms = [
        {
          id: 'alarm-1',
          paymentId: 'sub-1',
          merchantName: 'Netflix',
          amount: 199,
          dueDate: now.add(3, 'day').valueOf(),
          type: 'subscription' as const,
          urgency: 'two-days' as const,
          triggerTime: now.add(1, 'day').valueOf(),
          dismissed: false,
          markedAsPaid: true, // Marked as paid
        },
      ];

      mockStorage.getString.mockReturnValue(JSON.stringify(alarms));

      const pending = getPendingAlarms();

      expect(pending).toHaveLength(0);
    });
  });
});
