/**
 * @format
 */

import React from 'react';

// Mock all the native modules and dependencies
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: any) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('../src/native/SmsModule', () => ({
  getSms: jest.fn(() => Promise.resolve([])),
  subscribeSmsReceived: jest.fn(() => ({ remove: jest.fn() })),
  hasPermission: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('../src/services/revenuecat', () => ({
  initializeRevenueCat: jest.fn(() => Promise.resolve()),
  checkSubscriptionStatus: jest.fn(() => Promise.resolve(false)),
  setProStatusChangeCallback: jest.fn(),
}));

jest.mock('../src/services/admob', () => ({
  initializeAdMob: jest.fn(() => Promise.resolve()),
  showInterstitialAd: jest.fn(),
}));

jest.mock('../src/services/alarmService', () => ({
  initializeAlarmService: jest.fn(),
  stopAlarmService: jest.fn(),
  schedulePaymentAlarms: jest.fn(),
  dismissAlarm: jest.fn(),
  markPaymentAsPaid: jest.fn(),
  snoozeAlarm: jest.fn(),
  hasBeenSnoozed: jest.fn(() => false),
}));

jest.mock('../src/utils/reliableNotifications', () => ({
  createNotificationChannels: jest.fn(() => Promise.resolve()),
  requestNotificationPermission: jest.fn(() => Promise.resolve(true)),
}));

describe('App', () => {
  it('should be defined', () => {
    // Basic smoke test - just ensure the module can be imported
    const App = require('../App').default;
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});
