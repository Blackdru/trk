/**
 * Integration tests for SMS sync flow
 */

import { parseSms } from '../../utils/smsParser';
import { detectSubscriptions } from '../../utils/subscriptionDetector';
import { extractAutopayTransactions } from '../../utils/autopayDetector';
import type { RawSms, ParsedTransaction } from '../../types';

// Mock storage for tests
jest.mock('../../storage', () => ({
  getStorage: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(() => 0),
    delete: jest.fn(),
  })),
  getSubscriptions: jest.fn(() => []),
  saveSubscriptions: jest.fn(),
  getAutopayTransactions: jest.fn(() => []),
  saveAutopayTransactions: jest.fn(),
  getSettings: jest.fn(() => ({
    notificationsEnabled: true,
    lastSmsSync: 0,
    trackAutopay: true,
    alarmTimeBeforeDue: 8,
    alarmTimeOnDueDate: 6,
  })),
}));

describe('SMS Sync Integration Tests', () => {
  describe('Full SMS Processing Pipeline', () => {
    it('should process SMS from parsing to subscription detection', () => {
      const testSms: RawSms[] = [
        {
          body: "Your UPI-Mandate for Rs.199.00 is successfully created towards Netflix from A/c No: XXXXXX1234. -HDFC Bank",
          date: Date.now(),
          address: "HDFCBK"
        },
        {
          body: "Your mandate for Rs.119.00 towards Spotify Premium is successfully created. -Axis Bank",
          date: Date.now(),
          address: "AXISBK"
        },
      ];
      
      // Step 1: Parse SMS
      const parsed = testSms.map(sms => parseSms(sms)).filter(p => p !== null);
      expect(parsed.length).toBe(2);
      
      // Step 2: Detect subscriptions
      const subscriptions = detectSubscriptions(parsed);
      expect(subscriptions.length).toBe(2);
      expect(subscriptions[0].merchantName).toMatch(/Netflix/i);
      expect(subscriptions[1].merchantName).toMatch(/Spotify/i);
      
      // Step 3: Extract autopay
      const autopay = extractAutopayTransactions(parsed);
      expect(autopay.length).toBe(2);
      expect(autopay.every(a => a.category === 'subscription')).toBe(true);
    });
    
    it('should handle mixed subscription and utility SMS', () => {
      const testSms: RawSms[] = [
        {
          body: "Your UPI-Mandate for Rs.199.00 is successfully created towards Netflix from A/c No: XXXXXX1234. -HDFC Bank",
          date: Date.now(),
          address: "HDFCBK"
        },
        {
          body: "Autopay mandate executed: Rs.1500 debited for BESCOM Electricity bill. Consumer No: 123456789. -Paytm",
          date: Date.now(),
          address: "PAYTM"
        },
        {
          body: "Your Home Loan EMI of Rs.25000.00 is debited from A/c XX1234 via autopay. -HDFC Bank",
          date: Date.now(),
          address: "HDFCBK"
        },
      ];
      
      const parsed = testSms.map(sms => parseSms(sms)).filter(p => p !== null);
      expect(parsed.length).toBe(3);
      
      // Only Netflix should be detected as subscription
      const subscriptions = detectSubscriptions(parsed);
      expect(subscriptions.length).toBe(1);
      expect(subscriptions[0].merchantName).toMatch(/Netflix/i);
      
      // All should be in autopay
      const autopay = extractAutopayTransactions(parsed);
      expect(autopay.length).toBe(3);
      
      // Check categories
      const categories = autopay.map(a => a.category);
      expect(categories).toContain('subscription');
      expect(categories).toContain('utility');
      expect(categories).toContain('loan');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle malformed SMS gracefully', () => {
      const malformedSms: RawSms[] = [
        {
          body: "Random text without any payment info",
          date: Date.now(),
          address: "RANDOM"
        },
        {
          body: "OTP: 123456 is your verification code",
          date: Date.now(),
          address: "VERIFY"
        },
        {
          body: "", // Empty body
          date: Date.now(),
          address: "EMPTY"
        },
      ];
      
      const parsed = malformedSms.map(sms => parseSms(sms)).filter(p => p !== null);
      expect(parsed.length).toBe(0); // None should be parsed
      
      // Should not throw errors
      expect(() => detectSubscriptions(parsed)).not.toThrow();
      expect(() => extractAutopayTransactions(parsed)).not.toThrow();
    });
    
    it('should handle SMS with missing amounts', () => {
      const smsWithoutAmount: RawSms = {
        body: "Your Netflix subscription is now active. Enjoy unlimited streaming!",
        date: Date.now(),
        address: "NETFLIX"
      };
      
      const parsed = parseSms(smsWithoutAmount);
      // Should either parse with amount 0 or return null
      if (parsed) {
        expect(parsed.amount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
