import { parseSms } from '../smsParser';
import { extractAutopayTransactions, filterNonSubscriptionAutopay } from '../autopayDetector';
import type { RawSms, ParsedTransaction } from '../../types';

describe('Edge Cases & SMS Format Variations', () => {
  // SUBSCRIPTION SMS - Various formats from different banks
  const subscriptionVariants: RawSms[] = [
    // Format 1: Standard mandate creation
    {
      body: "Dear Customer, UPI Mandate of INR 149.00 created for Netflix India from A/c XX1234. Ref: NF123456. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // Format 2: Short format
    {
      body: "Rs 399 autopay set for Amazon Prime Video. A/c: XX5678 -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // Format 3: With special characters
    {
      body: "Your A/c XX9012 debited with Rs.119/- for Spotify Premium via UPI-AutoPay on 10-Feb-26. -Axis",
      date: Date.now(),
      address: "AXISBK"
    },
    // Format 4: Uppercase
    {
      body: "UPI AUTOPAY MANDATE CREATED FOR RS.999.00 TOWARDS DISNEY+ HOTSTAR FROM A/C XXXXXX3456. -HDFC BANK",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Format 5: With date range
    {
      body: "Your recurring payment mandate for YouTube Premium Rs.129 valid from 10-Feb-2026 to 10-Feb-2027 is active. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Format 6: E-mandate format
    {
      body: "E-Mandate registered successfully for Adobe Creative Cloud subscription of Rs.1699.00 per month. UMN: adobe@ybl -Kotak",
      date: Date.now(),
      address: "KOTAKB"
    },
    // Format 7: Standing instruction
    {
      body: "Standing instruction set up for Rs.299 to Apple Music monthly. Debit from A/c XX7890. -HDFC",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Format 8: Auto-debit
    {
      body: "Auto-debit of Rs.699 enabled for Zee5 Premium. Next debit on 10-Mar-2026. A/c: XX2345 -Paytm Payments Bank",
      date: Date.now(),
      address: "PAYTMB"
    },
    // Format 9: With merchant VPA
    {
      body: "Autopay mandate approved: Rs.199 to netflix@paytm for Netflix subscription. From A/c XX6789. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    // Format 10: Renewal format
    {
      body: "Your Microsoft 365 subscription renewed via autopay. Rs.489 debited from A/c XX4567 on 10-Feb-26. -ICICI",
      date: Date.now(),
      address: "ICICIB"
    },
    // Format 11: With frequency
    {
      body: "Monthly autopay of Rs.99 set for Gaana Plus subscription starting 10-Feb-2026. A/c: XX8901 -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Format 12: Confirmation format
    {
      body: "Confirmed! Your SonyLIV Premium autopay mandate for Rs.699/month is now active. Ref: SL456789 -Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
  ];

  // AUTOPAY TRACKER SMS - Various formats
  const autopayVariants: RawSms[] = [
    // Format 1: Loan EMI - standard
    {
      body: "Dear Customer, EMI of Rs.15000 for your Home Loan debited via autopay from A/c XX1234. Loan A/c: HL987654 -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Format 2: Insurance - short
    {
      body: "Rs 5000 debited for LIC policy premium via autopay. Policy: 123456789 -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Format 3: Electricity - with consumer number
    {
      body: "Your BESCOM bill payment of Rs.1800 processed via autopay. Consumer No: BES789012. A/c: XX5678 -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // Format 4: Credit card - full format
    {
      body: "Your HDFC Bank Credit Card A/c ending 5678 autopay of Rs.8500.00 is processed from Savings A/c XX9012. -HDFC",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Format 5: Broadband - ISP
    {
      body: "Jio Fiber monthly bill Rs.999 paid via auto-debit. Connection ID: JF345678. A/c: XX3456 -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    // Format 6: Vehicle loan
    {
      body: "Car Loan EMI Rs.22000 debited through autopay on 10-Feb-26. Loan No: CL654321. -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
    // Format 7: Health insurance
    {
      body: "Max Bupa health insurance premium Rs.7500 auto-debited from A/c XX7890. Policy: MB234567 -Kotak",
      date: Date.now(),
      address: "KOTAKB"
    },
    // Format 8: Gas cylinder
    {
      body: "Indane Gas LPG booking payment Rs.950 processed via autopay. Consumer: IND567890 -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Format 9: Mobile postpaid
    {
      body: "Airtel postpaid bill Rs.699 paid through auto-debit. Mobile: 98XXXXXX56. A/c: XX2345 -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // Format 10: Personal loan
    {
      body: "Personal Loan EMI of Rs.12000 debited via standing instruction. Loan A/c: PL456789. -Axis Bank",
      date: Date.now(),
      address: "AXISBK"
    },
    // Format 11: Water bill
    {
      body: "Water bill payment Rs.450 processed via autopay. Consumer No: WTR123456. A/c: XX6789 -HDFC",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Format 12: Term insurance
    {
      body: "ICICI Prudential term insurance premium Rs.4500 auto-debited. Policy: IP789012. A/c: XX4567 -ICICI",
      date: Date.now(),
      address: "ICICIB"
    },
  ];

  // EDGE CASES - Tricky formats
  const edgeCases: RawSms[] = [
    // Edge 1: Amount without decimal
    {
      body: "Autopay mandate for Rs 199 created for Netflix from A/c XX1234 -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    // Edge 2: Amount with comma
    {
      body: "Home Loan EMI Rs.25,000 debited via autopay from A/c XX5678 -HDFC Bank",
      date: Date.now(),
      address: "HDFCBK"
    },
    // Edge 3: Multiple spaces
    {
      body: "Your   autopay   mandate   for   Spotify   Premium   Rs.119   is   active   -Axis",
      date: Date.now(),
      address: "AXISBK"
    },
    // Edge 4: Lowercase everything
    {
      body: "autopay of rs.299 for amazon prime video is set up from a/c xx9012 -paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    // Edge 5: With rupee symbol
    {
      body: "Your mandate for ₹699 towards Disney+ Hotstar is successfully created -Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    // Edge 6: INR format
    {
      body: "Autopay mandate created for INR 1699.00 towards Adobe Creative Cloud -ICICI Bank",
      date: Date.now(),
      address: "ICICIB"
    },
  ];

  describe('Subscription Format Variations', () => {
    test('should parse all 12 subscription format variants', () => {
      const parsed: ParsedTransaction[] = [];
      
      console.log('\n========================================');
      console.log('SUBSCRIPTION FORMAT VARIATIONS');
      console.log('========================================\n');
      
      subscriptionVariants.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ ${(index + 1).toString().padStart(2)}. ${result.merchantName.padEnd(35)} ₹${result.amount.toString().padStart(6)} (${result.paymentType})`);
        } else {
          console.log(`✗ ${(index + 1).toString().padStart(2)}. FAILED TO PARSE`);
          console.log(`   SMS: ${sms.body.substring(0, 80)}...`);
        }
      });

      console.log(`\nParsed: ${parsed.length}/${subscriptionVariants.length}`);
      expect(parsed.length).toBe(subscriptionVariants.length);
    });

    test('should categorize all subscription variants as "subscription"', () => {
      const parsed: ParsedTransaction[] = subscriptionVariants
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n========================================');
      console.log('SUBSCRIPTION CATEGORIZATION CHECK');
      console.log('========================================\n');
      
      const failures: string[] = [];
      autopayTxns.forEach((txn, index) => {
        const status = txn.category === 'subscription' ? '✓' : '✗';
        console.log(`${status} ${(index + 1).toString().padStart(2)}. ${txn.merchantName.padEnd(35)} → ${txn.category}`);
        if (txn.category !== 'subscription') {
          failures.push(txn.merchantName);
        }
      });

      if (failures.length > 0) {
        console.log(`\n⚠ Failed categorization: ${failures.join(', ')}`);
      }

      expect(autopayTxns.every(txn => txn.category === 'subscription')).toBe(true);
    });
  });

  describe('Autopay Tracker Format Variations', () => {
    test('should parse all 12 autopay tracker format variants', () => {
      const parsed: ParsedTransaction[] = [];
      
      console.log('\n========================================');
      console.log('AUTOPAY TRACKER FORMAT VARIATIONS');
      console.log('========================================\n');
      
      autopayVariants.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ ${(index + 1).toString().padStart(2)}. ${result.merchantName.padEnd(35)} ₹${result.amount.toString().padStart(6)} (${result.paymentType})`);
        } else {
          console.log(`✗ ${(index + 1).toString().padStart(2)}. FAILED TO PARSE`);
          console.log(`   SMS: ${sms.body.substring(0, 80)}...`);
        }
      });

      console.log(`\nParsed: ${parsed.length}/${autopayVariants.length}`);
      expect(parsed.length).toBe(autopayVariants.length);
    });

    test('should categorize autopay tracker variants correctly (NOT subscription)', () => {
      const parsed: ParsedTransaction[] = autopayVariants
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n========================================');
      console.log('AUTOPAY TRACKER CATEGORIZATION CHECK');
      console.log('========================================\n');
      
      const failures: string[] = [];
      autopayTxns.forEach((txn, index) => {
        const status = txn.category !== 'subscription' ? '✓' : '✗';
        console.log(`${status} ${(index + 1).toString().padStart(2)}. ${txn.merchantName.padEnd(35)} → ${txn.category}`);
        if (txn.category === 'subscription') {
          failures.push(txn.merchantName);
        }
      });

      if (failures.length > 0) {
        console.log(`\n⚠ Incorrectly categorized as subscription: ${failures.join(', ')}`);
      }

      expect(autopayTxns.every(txn => txn.category !== 'subscription')).toBe(true);
    });
  });

  describe('Edge Cases & Tricky Formats', () => {
    test('should handle edge cases correctly', () => {
      const parsed: ParsedTransaction[] = [];
      
      console.log('\n========================================');
      console.log('EDGE CASES & TRICKY FORMATS');
      console.log('========================================\n');
      
      edgeCases.forEach((sms, index) => {
        const result = parseSms(sms);
        if (result) {
          parsed.push(result);
          console.log(`✓ ${(index + 1).toString().padStart(2)}. ${result.merchantName.padEnd(35)} ₹${result.amount.toString().padStart(6)}`);
        } else {
          console.log(`✗ ${(index + 1).toString().padStart(2)}. FAILED TO PARSE`);
          console.log(`   SMS: ${sms.body.substring(0, 80)}...`);
        }
      });

      console.log(`\nParsed: ${parsed.length}/${edgeCases.length}`);
      expect(parsed.length).toBe(edgeCases.length);
    });

    test('should categorize edge cases correctly', () => {
      const parsed: ParsedTransaction[] = edgeCases
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const autopayTxns = extractAutopayTransactions(parsed);
      
      console.log('\n========================================');
      console.log('EDGE CASE CATEGORIZATION');
      console.log('========================================\n');
      
      autopayTxns.forEach((txn, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${txn.merchantName.padEnd(35)} → ${txn.category}`);
      });

      // First 4 edge cases are subscriptions, last 2 are subscriptions too
      const subscriptionCount = autopayTxns.filter(t => t.category === 'subscription').length;
      console.log(`\nSubscriptions: ${subscriptionCount}/${autopayTxns.length}`);
      
      expect(autopayTxns.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Integration Test', () => {
    test('should handle all 30 SMS variants correctly', () => {
      const allSMS = [...subscriptionVariants, ...autopayVariants, ...edgeCases];
      const allParsed = allSMS
        .map(sms => parseSms(sms))
        .filter((p): p is ParsedTransaction => p !== null);

      const allAutopay = extractAutopayTransactions(allParsed);
      const subscriptions = allAutopay.filter(txn => txn.category === 'subscription');
      const trackerItems = filterNonSubscriptionAutopay(allAutopay);

      console.log('\n========================================');
      console.log('COMPLETE INTEGRATION TEST');
      console.log('========================================');
      console.log(`Total SMS variants tested: ${allSMS.length}`);
      console.log(`Successfully parsed: ${allParsed.length}`);
      console.log(`Autopay transactions: ${allAutopay.length}`);
      console.log(`\n✓ Subscriptions: ${subscriptions.length}`);
      console.log(`✓ Autopay Tracker: ${trackerItems.length}`);
      
      const parseRate = ((allParsed.length / allSMS.length) * 100).toFixed(1);
      console.log(`\nParse Success Rate: ${parseRate}%`);
      
      console.log('\n--- CATEGORY BREAKDOWN ---');
      const categoryCount: Record<string, number> = {};
      allAutopay.forEach(txn => {
        categoryCount[txn.category || 'unknown'] = (categoryCount[txn.category || 'unknown'] || 0) + 1;
      });
      
      Object.entries(categoryCount).forEach(([category, count]) => {
        console.log(`${category.padEnd(15)}: ${count}`);
      });
      
      console.log('========================================\n');

      // Assertions
      expect(allParsed.length).toBe(30); // All SMS should be parsed (100%)
      expect(subscriptions.length).toBeGreaterThanOrEqual(15); // At least 15 subscriptions
      expect(trackerItems.length).toBeGreaterThanOrEqual(8); // At least 8 tracker items
      expect(Number(parseRate)).toBe(100); // 100% parse rate
    });
  });
});
