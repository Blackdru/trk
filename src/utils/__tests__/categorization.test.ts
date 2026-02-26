import { parseSms } from '../smsParser';
import { extractAutopayTransactions, filterNonSubscriptionAutopay } from '../autopayDetector';
import type { RawSms, ParsedTransaction } from '../../types';

describe('SMS Categorization Tests', () => {
  // Test SMS messages for APP SUBSCRIPTIONS (should appear in Subscriptions tab)
  const subscriptionSMS: RawSms[] = [
    // Google Play subscriptions
    {
      body: "Your UPI-Mandate for Rs.100.00 is successfully created towards Google from A/c No: XXXXXX2572. UMN:a695ad6b4fdb4bad9a94cfa511de11ae@ybl. If not you, kindly report on 18001234. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    {
      body: "Your ASPRESENTED UPI AutoPay Mandate from 18/01/2026 to 31/12/2036 is successfully created towards Google for Rs.100.00. Refer UM no. 922c555ed5fd4bb4a26b2bd313d1e3ed@ibl. Regards, Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    {
      body: "Congratulations! Automatic payment of Rs.70 for Google Play has been setup successfully - Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // Netflix
    {
      body: "Your UPI AutoPay mandate for Rs.199.00 is successfully created towards Netflix from A/c No: XXXXXX1234. -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    {
      body: "Rs.199 debited from A/c XX1234 on 10-02-26 for Netflix subscription via UPI autopay. Ref: 123456789. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // Spotify
    {
      body: "Your mandate for Rs.119.00 towards Spotify Premium is successfully created. UMN: abc123@ybl -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    {
      body: "Autopay executed: Rs.119 debited for Spotify on 10-Feb-2026. A/c: XX5678. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Amazon Prime
    {
      body: "Your UPI mandate for Rs.299.00 is created towards Amazon Prime from A/c XXXXXX9876. -Paytm Payments Bank",
      date: Date.now(),
      address: "PAYTMB"
    },
    // Disney+ Hotstar
    {
      body: "Autopay mandate successfully created for Rs.499 towards Disney Hotstar. Ref: DH123456 -HDFC",
      date: Date.now(),
      address: "HDFCBK"
    },
    // YouTube Premium
    {
      body: "Your mandate for Rs.129.00 towards YouTube Premium is active. UMN: xyz789@paytm -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
  ];

  // Test SMS messages for AUTOPAY TRACKER (loans, utilities, insurance, etc.)
  const autopayTrackerSMS: RawSms[] = [
    // Home Loan EMI
    {
      body: "Your Home Loan EMI of Rs.25000.00 is debited from A/c XX1234 via autopay on 10-Feb-2026. Loan A/c: HL123456. -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    {
      body: "Autopay executed: Rs.30000 debited for Home Loan EMI. A/c: XX5678. Ref: SBI/HL/789. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Car Loan
    {
      body: "Your Car Loan EMI mandate for Rs.15000 is successfully executed from A/c XXXXXX2345. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // Personal Loan
    {
      body: "Rs.12000 debited via autopay for Personal Loan EMI on 10-02-26. Loan No: PL987654. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    // Credit Card
    {
      body: "Your Credit Card autopay of Rs.5000.00 is processed from A/c XX9876. Card: XXXX1234. -Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    // Electricity Bill
    {
      body: "Autopay mandate executed: Rs.1500 debited for BESCOM Electricity bill. Consumer No: 123456789. -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    {
      body: "Your mandate for Rs.2000 towards Tata Power is successfully executed. Bill paid. -HDFC",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Insurance Premium
    {
      body: "Your LIC Insurance premium of Rs.3000 is debited via autopay. Policy: 123456789. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    {
      body: "Autopay: Rs.2500 debited for HDFC Life Insurance premium on 10-Feb-2026. -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Broadband/Internet
    {
      body: "Your Jio Fiber autopay mandate for Rs.999 is executed. A/c: XX1234. -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    {
      body: "Rs.799 debited for Airtel Fiber broadband via autopay. Ref: AF123456. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // Mobile Postpaid
    {
      body: "Your Airtel Postpaid autopay of Rs.599 is processed from A/c XX5678. Mobile: 98XXXXXX12. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
  ];

  describe('Subscription SMS Detection', () => {
    test('should parse all subscription SMS correctly', () => {
      const parsed: ParsedTransaction[] = [];
      
      subscriptionSMS.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ Subscription ${index + 1}: ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
        } else {
          console.log(`✗ Failed to parse subscription SMS ${index + 1}`);
        }
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed.length).toBe(subscriptionSMS.length);
    });

    test('should categorize all subscriptions correctly', () => {
      const parsed: ParsedTransaction[] = subscriptionSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n=== SUBSCRIPTION CATEGORIZATION ===');
      autopayTxns.forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.merchantName} - Category: ${txn.category}`);
        expect(txn.category).toBe('subscription');
      });

      expect(autopayTxns.every(txn => txn.category === 'subscription')).toBe(true);
    });

    test('should filter subscriptions from autopay tracker', () => {
      const parsed: ParsedTransaction[] = subscriptionSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      const filteredForTracker = filterNonSubscriptionAutopay(autopayTxns);

      console.log('\n=== AUTOPAY TRACKER FILTER (Subscriptions) ===');
      console.log(`Total autopay transactions: ${autopayTxns.length}`);
      console.log(`After filtering subscriptions: ${filteredForTracker.length}`);
      console.log('Expected: 0 (all should be filtered out)');

      expect(filteredForTracker.length).toBe(0);
    });
  });

  describe('Autopay Tracker SMS Detection', () => {
    test('should parse all autopay tracker SMS correctly', () => {
      const parsed: ParsedTransaction[] = [];
      
      autopayTrackerSMS.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ Autopay ${index + 1}: ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
        } else {
          console.log(`✗ Failed to parse autopay SMS ${index + 1}`);
        }
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed.length).toBe(autopayTrackerSMS.length);
    });

    test('should categorize autopay tracker items correctly', () => {
      const parsed: ParsedTransaction[] = autopayTrackerSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n=== AUTOPAY TRACKER CATEGORIZATION ===');
      autopayTxns.forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.merchantName} - Category: ${txn.category}`);
        expect(txn.category).not.toBe('subscription');
      });

      const categories = [...new Set(autopayTxns.map(t => t.category))];
      console.log(`\nCategories found: ${categories.join(', ')}`);
      
      expect(autopayTxns.every(txn => txn.category !== 'subscription')).toBe(true);
    });

    test('should NOT filter autopay tracker items', () => {
      const parsed: ParsedTransaction[] = autopayTrackerSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      const filteredForTracker = filterNonSubscriptionAutopay(autopayTxns);

      console.log('\n=== AUTOPAY TRACKER FILTER (Non-Subscriptions) ===');
      console.log(`Total autopay transactions: ${autopayTxns.length}`);
      console.log(`After filtering: ${filteredForTracker.length}`);
      console.log('Expected: Same count (none should be filtered)');

      expect(filteredForTracker.length).toBe(autopayTxns.length);
    });
  });

  describe('Combined Test - Full Flow', () => {
    test('should correctly separate subscriptions and autopay tracker items', () => {
      // Parse all SMS
      const allSMS = [...subscriptionSMS, ...autopayTrackerSMS];
      const allParsed = allSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      // Extract autopay transactions
      const allAutopay = extractAutopayTransactions(allParsed);

      // Separate into subscriptions and tracker items
      const subscriptions = allAutopay.filter(txn => txn.category === 'subscription');
      const trackerItems = filterNonSubscriptionAutopay(allAutopay);

      console.log('\n=== FINAL SEPARATION TEST ===');
      console.log(`Total SMS processed: ${allSMS.length}`);
      console.log(`Total parsed: ${allParsed.length}`);
      console.log(`Total autopay transactions: ${allAutopay.length}`);
      console.log(`\nSubscriptions (for Subscriptions tab): ${subscriptions.length}`);
      console.log(`Autopay Tracker items: ${trackerItems.length}`);

      console.log('\n--- Subscriptions ---');
      subscriptions.forEach((txn, i) => {
        console.log(`${i + 1}. ${txn.merchantName} - ₹${txn.amount}`);
      });

      console.log('\n--- Autopay Tracker ---');
      trackerItems.forEach((txn, i) => {
        console.log(`${i + 1}. ${txn.merchantName} - ₹${txn.amount} (${txn.category})`);
      });

      // Assertions
      expect(subscriptions.length).toBe(subscriptionSMS.length);
      expect(trackerItems.length).toBe(autopayTrackerSMS.length);
      expect(subscriptions.length + trackerItems.length).toBe(allAutopay.length);
      
      // Verify no overlap
      const subscriptionIds = new Set(subscriptions.map(s => s.id));
      const trackerIds = new Set(trackerItems.map(t => t.id));
      const overlap = [...subscriptionIds].filter(id => trackerIds.has(id));
      
      console.log(`\nOverlap check: ${overlap.length} items (should be 0)`);
      expect(overlap.length).toBe(0);
    });
  });
});
