import { parseSms } from '../smsParser';
import { extractAutopayTransactions } from '../autopayDetector';
import type { RawSms } from '../../types';

describe('Payment Reminder SMS - New Test Cases', () => {
  const paymentReminderSMS: RawSms[] = [
    {
      body: "Dear UPI User, UPI AutoPay for True Credits Private Limited debit of Rs.1068.00 is scheduled on .03/04/26, df6ebfa0d90847d185703ad0ffcc98de@ptyes. Please ensure sufficient balance in your account.",
      date: Date.now(),
      address: "SBIUPI"
    },
    {
      body: "Your next EMI is due on 05 April 2026. Make an early payment on the Moneyview app or use this payment link - moneyview.in/l/MONVEW/p3n6mvCy",
      date: Date.now(),
      address: "MONVEW"
    },
    {
      body: "Dear Customer,Your EMI is due on 05-Mar-26. Pay on time for a higher limit & longer tenure on future loans.Pay on True Balance app T&C True Credits http://1kx.in/TRCRED/yRhToQ",
      date: Date.now(),
      address: "TRCRED"
    },
    {
      body: "Congratulations! Automatic payment of Rs.399 for Story Tv has been setup successfully - Paytm",
      date: Date.now(),
      address: "PAYTM"
    }
  ];

  test('should parse all payment reminder SMS correctly', () => {
    console.log('\n========================================');
    console.log('PAYMENT REMINDER SMS PARSING TEST');
    console.log('========================================\n');

    const parsed = paymentReminderSMS
      .map((sms, index) => {
        console.log(`\n--- SMS ${index + 1} ---`);
        console.log(`Body: ${sms.body.substring(0, 100)}...`);
        
        const result = parseSms(sms);
        
        if (result) {
          console.log(`✓ Parsed: ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
          if (result.amount === 0) {
            console.log(`  (Reminder without amount - due date: ${new Date(result.date).toLocaleDateString()})`);
          }
        } else {
          console.log(`✗ Failed to parse`);
        }
        
        return result;
      })
      .filter(p => p !== null);

    console.log('\n========================================');
    console.log(`Total parsed: ${parsed.length}/${paymentReminderSMS.length}`);
    console.log('========================================\n');

    // All 4 SMS should be parsed
    expect(parsed.length).toBe(4);
  });

  test('should extract correct merchant names from reminders', () => {
    const expectedMerchants = [
      { sms: paymentReminderSMS[0], expected: 'True Credits' },
      { sms: paymentReminderSMS[1], expected: 'Moneyview' },
      { sms: paymentReminderSMS[2], expected: 'True Credits' },
      { sms: paymentReminderSMS[3], expected: 'Story TV' },
    ];

    expectedMerchants.forEach(({ sms, expected }, index) => {
      const result = parseSms(sms);
      expect(result).not.toBeNull();
      if (result) {
        console.log(`SMS ${index + 1}: Expected "${expected}", Got "${result.merchantName}"`);
        expect(result.merchantName.toLowerCase()).toBe(expected.toLowerCase());
      }
    });
  });

  test('should extract correct amounts (or 0 for reminders)', () => {
    const expectedAmounts = [
      { sms: paymentReminderSMS[0], expected: 1068 },
      { sms: paymentReminderSMS[1], expected: 0 }, // Reminder without amount
      { sms: paymentReminderSMS[2], expected: 0 }, // Reminder without amount
      { sms: paymentReminderSMS[3], expected: 399 },
    ];

    expectedAmounts.forEach(({ sms, expected }, index) => {
      const result = parseSms(sms);
      expect(result).not.toBeNull();
      if (result) {
        console.log(`SMS ${index + 1}: Expected ₹${expected}, Got ₹${result.amount}`);
        expect(result.amount).toBe(expected);
      }
    });
  });

  test('should parse due dates correctly', () => {
    const result1 = parseSms(paymentReminderSMS[0]);
    expect(result1).not.toBeNull();
    if (result1) {
      const dueDate = new Date(result1.date);
      console.log(`SMS 1 due date: ${dueDate.toLocaleDateString()} (Day: ${dueDate.getDate()}, Month: ${dueDate.getMonth()}, Year: ${dueDate.getFullYear()})`);
      // ".03/04/26" = 3rd April 2026 (DD/MM/YY format)
      expect(dueDate.getDate()).toBe(3);
      expect(dueDate.getMonth()).toBe(3); // April (0-indexed)
      expect(dueDate.getFullYear()).toBe(2026);
    }

    const result2 = parseSms(paymentReminderSMS[1]);
    expect(result2).not.toBeNull();
    if (result2) {
      const dueDate = new Date(result2.date);
      console.log(`SMS 2 due date: ${dueDate.toLocaleDateString()} (Day: ${dueDate.getDate()}, Month: ${dueDate.getMonth()}, Year: ${dueDate.getFullYear()})`);
      expect(dueDate.getDate()).toBe(5);
      expect(dueDate.getMonth()).toBe(3); // April (0-indexed)
      expect(dueDate.getFullYear()).toBe(2026);
    }

    const result3 = parseSms(paymentReminderSMS[2]);
    expect(result3).not.toBeNull();
    if (result3) {
      const dueDate = new Date(result3.date);
      console.log(`SMS 3 due date: ${dueDate.toLocaleDateString()} (Day: ${dueDate.getDate()}, Month: ${dueDate.getMonth()}, Year: ${dueDate.getFullYear()})`);
      expect(dueDate.getDate()).toBe(5);
      expect(dueDate.getMonth()).toBe(2); // March (0-indexed)
      expect(dueDate.getFullYear()).toBe(2026);
    }
  });

  test('should categorize as autopay/loan correctly', () => {
    const parsed = paymentReminderSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const autopayTxns = extractAutopayTransactions(parsed);

    console.log('\n========================================');
    console.log('AUTOPAY CATEGORIZATION');
    console.log('========================================\n');

    autopayTxns.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchantName.padEnd(20)} ₹${txn.amount.toString().padStart(6)} - Category: ${txn.category}`);
    });

    console.log('\n========================================\n');

    // All 4 should be detected as autopay
    expect(autopayTxns.length).toBe(4);

    // True Credits and Moneyview should be categorized as 'loan'
    const trueCredits = autopayTxns.filter(t => t.merchantName.toLowerCase().includes('true credits'));
    const moneyview = autopayTxns.filter(t => t.merchantName.toLowerCase().includes('moneyview'));
    const storyTv = autopayTxns.filter(t => t.merchantName.toLowerCase().includes('story tv'));

    trueCredits.forEach(txn => {
      expect(txn.category).toBe('loan');
    });

    moneyview.forEach(txn => {
      expect(txn.category).toBe('loan');
    });

    // Story TV should be categorized as 'subscription'
    storyTv.forEach(txn => {
      expect(txn.category).toBe('subscription');
    });
  });

  test('should mark all as Autopay payment type', () => {
    const parsed = paymentReminderSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    parsed.forEach((txn, index) => {
      console.log(`SMS ${index + 1}: ${txn.merchantName} - Payment Type: ${txn.paymentType}`);
      expect(txn.paymentType).toBe('Autopay');
    });
  });
});
