import { parseSms } from '../smsParser';
import { detectSubscriptions } from '../subscriptionDetector';
import { extractAutopayTransactions, filterNonSubscriptionAutopay } from '../autopayDetector';
import type { RawSms } from '../../types';

describe('Subscription vs Autopay Split Logic', () => {
  const testSMS: RawSms[] = [
    // Known subscription services - should go to BOTH Subscriptions AND Autopay
    {
      body: "Your UPI-Mandate for Rs.60.00 is successfully created towards Google Play from A/c No: XXXXXX2572.",
      date: Date.now(),
      address: "SBIUPI"
    },
    {
      body: "Your ASPRESENTED UPI AutoPay Mandate is successfully created towards Spotify for Rs.199.00.",
      date: Date.now(),
      address: "FEDBK"
    },
    {
      body: "Your ASPRESENTED UPI AutoPay Mandate is successfully created towards AWS India for Rs.15000.00.",
      date: Date.now(),
      address: "KOTAKB"
    },
    {
      body: "Congratulations! Your JioHotstar mobile subscription for 28 days is now active.",
      date: Date.now(),
      address: "JIOHOT"
    },
    
    // Utilities/Bills - should go to ONLY Autopay (NOT Subscriptions)
    {
      body: "Autopay mandate executed: Rs.1500 debited for BESCOM Electricity bill. Consumer No: 123456789. -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    {
      body: "Your Jio Fiber autopay mandate for Rs.999 is executed. A/c: XX1234. -Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    
    // Loans/EMI - should go to ONLY Autopay (NOT Subscriptions)
    {
      body: "Dear Customer, You have an upcoming EMI of Rs.3268/- due on 2024-09-03. Regards, L&T Finance Ltd.",
      date: Date.now(),
      address: "LTFIN"
    },
  ];

  test('should parse all SMS correctly', () => {
    const parsed = testSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    console.log('\n=== PARSED TRANSACTIONS ===');
    parsed.forEach(p => {
      console.log(`${p.merchantName} - ₹${p.amount} (${p.paymentType})`);
    });

    expect(parsed.length).toBeGreaterThanOrEqual(6);
  });

  test('should detect subscriptions ONLY for known services', () => {
    const parsed = testSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const subscriptions = detectSubscriptions(parsed);

    console.log('\n=== SUBSCRIPTIONS (Should be 3) ===');
    subscriptions.forEach(sub => {
      console.log(`${sub.merchantName} - ₹${sub.amount} (${sub.billingCycle})`);
    });

    // Should detect: Google Play, Spotify, JioHotstar (NOT Google, NOT AWS India, NOT BESCOM)
    expect(subscriptions.length).toBe(3);
    
    const merchantNames = subscriptions.map(s => s.merchantName.toLowerCase());
    expect(merchantNames.some(n => n.includes('google play'))).toBe(true);
    expect(merchantNames.some(n => n.includes('spotify'))).toBe(true);
    expect(merchantNames.some(n => n.includes('jiohotstar') || n.includes('jio hotstar'))).toBe(true);
    
    // Plain "Google", AWS, and BESCOM should NOT be in subscriptions
    expect(merchantNames.filter(n => n === 'google').length).toBe(0);
    expect(merchantNames.some(n => n.includes('aws'))).toBe(false);
    expect(merchantNames.some(n => n.includes('bescom'))).toBe(false);
  });

  test('should extract ALL autopay transactions', () => {
    const parsed = testSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const autopayTxns = extractAutopayTransactions(parsed);

    console.log('\n=== ALL AUTOPAY TRANSACTIONS (Should be 6) ===');
    autopayTxns.forEach(txn => {
      console.log(`${txn.merchantName} - ₹${txn.amount} (${txn.category})`);
    });

    // Should include: Google Play, Spotify, AWS India, BESCOM, Jio Fiber, L&T Finance
    expect(autopayTxns.length).toBe(6);
  });

  test('should filter subscription services from autopay tracker', () => {
    const parsed = testSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const autopayTxns = extractAutopayTransactions(parsed);
    const nonSubscriptionAutopay = filterNonSubscriptionAutopay(autopayTxns);

    console.log('\n=== AUTOPAY TRACKER (Non-Subscription, Should be 3) ===');
    nonSubscriptionAutopay.forEach(txn => {
      console.log(`${txn.merchantName} - ₹${txn.amount} (${txn.category})`);
    });

    // Should include: AWS India, BESCOM, L&T Finance
    // Should NOT include: Google Play, Spotify, JioHotstar
    expect(nonSubscriptionAutopay.length).toBe(3);
    
    const merchantNames = nonSubscriptionAutopay.map(t => t.merchantName.toLowerCase());
    expect(merchantNames.some(n => n.includes('aws'))).toBe(true);
    expect(merchantNames.some(n => n.includes('bescom') || n.includes('electricity'))).toBe(true);
    expect(merchantNames.some(n => n.includes('finance'))).toBe(true);
    
    // Should NOT have subscription services
    expect(merchantNames.some(n => n.includes('google play'))).toBe(false);
    expect(merchantNames.some(n => n.includes('spotify'))).toBe(false);
    expect(merchantNames.some(n => n.includes('jiohotstar') || n.includes('jio hotstar'))).toBe(false);
  });

  test('should categorize correctly', () => {
    const parsed = testSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const autopayTxns = extractAutopayTransactions(parsed);

    console.log('\n=== CATEGORIZATION ===');
    autopayTxns.forEach(txn => {
      console.log(`${txn.merchantName} → ${txn.category}`);
    });

    const subscriptionCategory = autopayTxns.filter(t => t.category === 'subscription');
    const utilityCategory = autopayTxns.filter(t => t.category === 'utility');
    const loanCategory = autopayTxns.filter(t => t.category === 'loan');
    const otherCategory = autopayTxns.filter(t => t.category === 'other');

    expect(subscriptionCategory.length).toBe(3); // Google Play, Spotify, JioHotstar
    expect(utilityCategory.length).toBe(1); // BESCOM
    expect(loanCategory.length).toBe(1); // L&T Finance
    expect(otherCategory.length).toBe(1); // AWS India
  });
});
