import { parseSms } from '../smsParser';
import { extractAutopayTransactions, filterNonSubscriptionAutopay } from '../autopayDetector';
import type { RawSms, ParsedTransaction } from '../../types';

describe('Extended SMS Categorization Tests - Different Merchants', () => {
  // Test SMS messages for real user scenarios (mandate creation only)
  const realUserSMS: RawSms[] = [
    // 1. Google Play mandate creation (₹60)
    {
      body: "Your UPI-Mandate for Rs.60.00 is successfully created towards Google Play from A/c No: XXXXXX2572. UMN:4b4ff9ae5cb44c15e063e8eee20a18a5@pthdfc. If not you, kindly report on 18001234. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // 2. Google Play autopay setup confirmation (₹60)
    {
      body: "Congratulations! Automatic payment of Rs.60 for Google Play has been setup successfully - Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // 3. Google mandate creation (₹100)
    {
      body: "Your UPI-Mandate for Rs.100.00 is successfully created towards Google from A/c No: XXXXXX2572. UMN:a695ad6b4fdb4bad9a94cfa511de11ae@ybl. If not you, kindly report on 18001234. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
  ];

  describe('Real User SMS Detection', () => {
    test('should parse mandate creation and NACH debit messages', () => {
      const parsed: ParsedTransaction[] = [];
      
      console.log('\n========================================');
      console.log('PARSING REAL USER SMS');
      console.log('========================================\n');
      
      realUserSMS.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ ${index + 1}. ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
        } else {
          console.log(`✗ ${index + 1}. Failed to parse: ${sms.body.substring(0, 80)}...`);
        }
      });

      // Should parse the mandate creation messages
      expect(parsed.length).toBe(3);
      
      // Check specific merchants
      const merchants = parsed.map(p => p.merchantName);
      expect(merchants).toContain('Google Play');
      expect(merchants).toContain('Google');
      
      console.log('\nParsed transactions:');
      parsed.forEach(p => {
        console.log(`  - ${p.merchantName}: ₹${p.amount} (${p.paymentType})`);
      });
    });
  });

  // Test SMS messages for APP SUBSCRIPTIONS (should appear in Subscriptions tab)
  const subscriptionSMS: RawSms[] = [
    // 1. Apple One
    {
      body: "Your UPI mandate for Rs.195.00 towards Apple One is successfully created from A/c XX4567. Ref: APL123456 -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    // 2. Zee5
    {
      body: "Autopay executed: Rs.299 debited for Zee5 Premium subscription on 10-Feb-2026. A/c: XX8901. -Paytm Payments Bank",
      date: Date.now(),
      address: "PAYTMB"
    },
    // 3. SonyLIV
    {
      body: "Your mandate for Rs.699.00 towards SonyLIV is active. UMN: sony789@ybl -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    // 4. Canva Pro
    {
      body: "Rs.500 debited via autopay for Canva Pro subscription. Ref: CNV456789. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // 5. Adobe Creative Cloud
    {
      body: "Your UPI AutoPay Mandate for Rs.1699.00 towards Adobe Creative Cloud is successfully created. -Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    // 6. Microsoft 365
    {
      body: "Automatic payment of Rs.489 for Microsoft 365 has been setup successfully - PhonePe",
      date: Date.now(),
      address: "PHONEPE"
    },
    // 7. Gaana Plus
    {
      body: "Your mandate for Rs.99.00 towards Gaana Plus is successfully created. UMN: gaana123@paytm -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // 8. Voot Select
    {
      body: "Rs.299 debited from A/c XX2345 for Voot Select subscription via UPI autopay. Ref: VT789012. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // 9. PlayStation Plus
    {
      body: "Your UPI mandate for Rs.499.00 towards PlayStation Plus is successfully executed from A/c XX6789. -HDFC",
      date: Date.now(),
      address: "HDFCBK"
    },
    // 10. Dropbox Plus
    {
      body: "Autopay: Rs.820 debited for Dropbox Plus on 10-Feb-2026. A/c: XX3456. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
  ];

  // Test SMS messages for AUTOPAY TRACKER (loans, utilities, insurance, etc.)
  const autopayTrackerSMS: RawSms[] = [
    // 1. Bajaj Finserv Loan
    {
      body: "Your Bajaj Finserv loan EMI of Rs.8500.00 is debited from A/c XX7890 via autopay on 10-Feb-2026. Loan A/c: BFL987654. -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    // 2. Tata AIG Insurance
    {
      body: "Your Tata AIG Insurance premium of Rs.4500 is debited via autopay. Policy: TAI456789. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // 3. BSNL Broadband
    {
      body: "Autopay mandate executed: Rs.699 debited for BSNL Broadband bill. Consumer No: BSN123456. -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // 4. Mahindra Finance
    {
      body: "Rs.18000 debited via autopay for Mahindra Finance car loan EMI on 10-02-26. Loan No: MF654321. -Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    // 5. Max Bupa Health Insurance
    {
      body: "Your Max Bupa Health Insurance premium of Rs.6500 is processed via autopay. Policy: MB789012. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    // 6. Indane Gas
    {
      body: "Autopay: Rs.950 debited for Indane Gas LPG cylinder booking. Consumer: IND345678. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // 7. Vodafone Idea Postpaid
    {
      body: "Your Vodafone Idea postpaid autopay of Rs.799 is processed from A/c XX4567. Mobile: 98XXXXXX34. -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    // 8. MSEB Electricity
    {
      body: "Rs.2800 debited via autopay for MSEB electricity bill. Consumer No: MSB567890. -Paytm Payments Bank",
      date: Date.now(),
      address: "PAYTMB"
    },
    // 9. IDFC First Bank Credit Card
    {
      body: "Your IDFC First Bank Credit Card autopay of Rs.12000.00 is processed from A/c XX8901. Card: XXXX5678. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // 10. ACT Fibernet
    {
      body: "Autopay executed: Rs.999 debited for ACT Fibernet broadband. Account: ACT234567. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
  ];

  describe('Subscription SMS Detection - Extended', () => {
    test('should parse all 10 subscription SMS correctly', () => {
      const parsed: ParsedTransaction[] = [];
      
      console.log('\n========================================');
      console.log('PARSING SUBSCRIPTION SMS');
      console.log('========================================\n');
      
      subscriptionSMS.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ ${index + 1}. ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
        } else {
          console.log(`✗ ${index + 1}. Failed to parse`);
        }
      });

      expect(parsed.length).toBe(subscriptionSMS.length);
      expect(parsed.length).toBe(10);
    });

    test('should categorize all 10 subscriptions as "subscription"', () => {
      const parsed: ParsedTransaction[] = subscriptionSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n========================================');
      console.log('SUBSCRIPTION CATEGORIZATION');
      console.log('========================================\n');
      
      autopayTxns.forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.merchantName.padEnd(30)} → ${txn.category}`);
        expect(txn.category).toBe('subscription');
      });

      expect(autopayTxns.length).toBe(10);
      expect(autopayTxns.every(txn => txn.category === 'subscription')).toBe(true);
    });

    test('should filter all subscriptions from autopay tracker', () => {
      const parsed: ParsedTransaction[] = subscriptionSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      const filteredForTracker = filterNonSubscriptionAutopay(autopayTxns);

      console.log('\n========================================');
      console.log('AUTOPAY TRACKER FILTER TEST');
      console.log('========================================');
      console.log(`Total autopay transactions: ${autopayTxns.length}`);
      console.log(`After filtering subscriptions: ${filteredForTracker.length}`);
      console.log('Expected: 0 (all should be filtered out)\n');

      expect(filteredForTracker.length).toBe(0);
    });
  });

  describe('Autopay Tracker SMS Detection - Extended', () => {
    test('should parse all 10 autopay tracker SMS correctly', () => {
      const parsed: ParsedTransaction[] = [];
      
      console.log('\n========================================');
      console.log('PARSING AUTOPAY TRACKER SMS');
      console.log('========================================\n');
      
      autopayTrackerSMS.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ ${index + 1}. ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
        } else {
          console.log(`✗ ${index + 1}. Failed to parse`);
        }
      });

      expect(parsed.length).toBe(autopayTrackerSMS.length);
      expect(parsed.length).toBe(10);
    });

    test('should categorize autopay tracker items correctly (NOT subscription)', () => {
      const parsed: ParsedTransaction[] = autopayTrackerSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n========================================');
      console.log('AUTOPAY TRACKER CATEGORIZATION');
      console.log('========================================\n');
      
      autopayTxns.forEach((txn, index) => {
        console.log(`${index + 1}. ${txn.merchantName.padEnd(30)} → ${txn.category}`);
        expect(txn.category).not.toBe('subscription');
      });

      const categories = [...new Set(autopayTxns.map(t => t.category))];
      console.log(`\nCategories found: ${categories.join(', ')}`);
      
      expect(autopayTxns.length).toBe(10);
      expect(autopayTxns.every(txn => txn.category !== 'subscription')).toBe(true);
    });

    test('should NOT filter autopay tracker items', () => {
      const parsed: ParsedTransaction[] = autopayTrackerSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      const filteredForTracker = filterNonSubscriptionAutopay(autopayTxns);

      console.log('\n========================================');
      console.log('AUTOPAY TRACKER FILTER TEST');
      console.log('========================================');
      console.log(`Total autopay transactions: ${autopayTxns.length}`);
      console.log(`After filtering: ${filteredForTracker.length}`);
      console.log('Expected: Same count (none should be filtered)\n');

      expect(filteredForTracker.length).toBe(autopayTxns.length);
      expect(filteredForTracker.length).toBe(10);
    });
  });

  describe('Combined Test - Full Separation', () => {
    test('should correctly separate 10 subscriptions and 10 autopay tracker items', () => {
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

      console.log('\n========================================');
      console.log('FINAL SEPARATION TEST');
      console.log('========================================');
      console.log(`Total SMS processed: ${allSMS.length}`);
      console.log(`Total parsed: ${allParsed.length}`);
      console.log(`Total autopay transactions: ${allAutopay.length}`);
      console.log(`\n✓ Subscriptions (for Subscriptions tab): ${subscriptions.length}`);
      console.log(`✓ Autopay Tracker items: ${trackerItems.length}`);

      console.log('\n--- SUBSCRIPTIONS TAB ---');
      subscriptions.forEach((txn, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${txn.merchantName.padEnd(30)} ₹${txn.amount}`);
      });

      console.log('\n--- AUTOPAY TRACKER TAB ---');
      trackerItems.forEach((txn, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${txn.merchantName.padEnd(30)} ₹${txn.amount.toString().padStart(6)} (${txn.category})`);
      });

      // Assertions
      expect(subscriptions.length).toBe(10);
      expect(trackerItems.length).toBe(10);
      expect(subscriptions.length + trackerItems.length).toBe(allAutopay.length);
      
      // Verify no overlap
      const subscriptionIds = new Set(subscriptions.map(s => s.id));
      const trackerIds = new Set(trackerItems.map(t => t.id));
      const overlap = [...subscriptionIds].filter(id => trackerIds.has(id));
      
      console.log(`\n✓ Overlap check: ${overlap.length} items (should be 0)`);
      console.log('========================================\n');
      
      expect(overlap.length).toBe(0);
    });
  });
});
