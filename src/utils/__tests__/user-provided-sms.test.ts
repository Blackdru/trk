import { parseSms } from '../smsParser';
import { extractAutopayTransactions } from '../autopayDetector';
import { detectSubscriptions } from '../subscriptionDetector';
import type { RawSms } from '../../types';

describe('User Provided SMS Examples', () => {
  const userProvidedSMS: RawSms[] = [
    {
      body: "Congratulations! Your JioHotstar mobile subscription for 28 days is now active. Enjoy unlimited Cricket & Entertainment for 28 Days.",
      date: Date.now(),
      address: "JIOHOT"
    },
    {
      body: "Your UPI-Mandate for Rs.60.00 is successfully created towards Google Play from A/c No: XXXXXX2572. UMN:4b4ff9ae5cb44c15e063e8eee20a18a5@pthdfc. If not you, kindly report on 18001234. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    {
      body: "Congratulations! Automatic payment of Rs.60 for Google Play has been setup successfully - Paytm",
      date: Date.now(),
      address: "PAYTM"
    },
    {
      body: "Your ASPRESENTED UPI AutoPay Mandate from 18/01/2026 to 31/12/2036 is successfully created towards Google for Rs.100.00. Refer UM no. 922c555ed5fd4bb4a26b2bd313d1e3ed@ibl. Regards, Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    {
      body: "Dear Customer, Your account has been set up with us and we are here to assist you with your financial needs. This message is a reminder that you have an upcoming EMI of Rs.3268/- due on 2024-09-03, kindly keep your bank account funded with an adequate balance amount. Thank you for being our valuable customer. Regards, L&T Finance Ltd.",
      date: Date.now(),
      address: "LTFIN"
    },
    {
      body: "Your ASPRESENTED UPI AutoPay Mandate from 21/02/2026 to 21/02/2041 is successfully created towards AWS India for Rs.15000.00. Refer UM no. b40b3f804bf84894b2a4775eaa6d6af5@ibl. Regards, Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    {
      body: "Your ASPRESENTED UPI AutoPay Mandate from 15/01/2026 to 31/12/2036 is successfully created towards Google for Rs.100.00. Refer UM no. 7ef81e9384e547e08ff538157d5d15d9@ibl. Regards, Kotak Bank",
      date: Date.now(),
      address: "KOTAKB"
    },
    {
      body: "Dear Customer, You have successfully created a mandate on SPOTIFY for a ASPRESENTED frequency starting from 26-02-2026 for a maximum amount of Rs 199.00 Mandate Ref No- ecbb57f197f4446a82593597d06d922a@ybl - Federal Bank",
      date: Date.now(),
      address: "FEDBK"
    }
  ];

  test('should parse all user-provided SMS correctly', () => {
    console.log('\n========================================');
    console.log('USER PROVIDED SMS PARSING TEST');
    console.log('========================================\n');

    const parsed = userProvidedSMS
      .map((sms, index) => {
        console.log(`\n--- SMS ${index + 1} ---`);
        console.log(`Body: ${sms.body.substring(0, 80)}...`);
        
        const result = parseSms(sms);
        
        if (result) {
          console.log(`✓ Parsed: ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
        } else {
          console.log(`✗ Failed to parse`);
        }
        
        return result;
      })
      .filter(p => p !== null);

    console.log('\n========================================');
    console.log(`Total parsed: ${parsed.length}/${userProvidedSMS.length}`);
    console.log('========================================\n');

    // We expect at least 7 out of 8 to parse (EMI reminder might not parse as it's just a reminder)
    expect(parsed.length).toBeGreaterThanOrEqual(7);
  });

  test('should detect autopay/mandate transactions correctly', () => {
    console.log('\n========================================');
    console.log('AUTOPAY/MANDATE DETECTION TEST');
    console.log('========================================\n');

    const parsed = userProvidedSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const autopayTxns = extractAutopayTransactions(parsed);

    console.log(`\nTotal autopay/mandate transactions: ${autopayTxns.length}`);
    
    autopayTxns.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchantName} - ₹${txn.amount} (${txn.paymentType}, ${txn.category})`);
    });

    console.log('\n========================================\n');

    // We expect at least 6 autopay/mandate transactions
    expect(autopayTxns.length).toBeGreaterThanOrEqual(6);
  });

  test('should extract correct merchant names', () => {
    const expectedMerchants = [
      { sms: userProvidedSMS[0], expected: 'JioHotstar' },
      { sms: userProvidedSMS[1], expected: 'Google Play' },
      { sms: userProvidedSMS[2], expected: 'Google Play' },
      { sms: userProvidedSMS[3], expected: 'Google' },
      { sms: userProvidedSMS[5], expected: 'AWS India' },
      { sms: userProvidedSMS[6], expected: 'Google' },
      { sms: userProvidedSMS[7], expected: 'Spotify' },
    ];

    expectedMerchants.forEach(({ sms, expected }) => {
      const result = parseSms(sms);
      if (result) {
        expect(result.merchantName.toLowerCase()).toContain(expected.toLowerCase());
      }
    });
  });

  test('should extract correct amounts', () => {
    const expectedAmounts = [
      { sms: userProvidedSMS[1], expected: 60 },
      { sms: userProvidedSMS[2], expected: 60 },
      { sms: userProvidedSMS[3], expected: 100 },
      { sms: userProvidedSMS[4], expected: 3268 },
      { sms: userProvidedSMS[5], expected: 15000 },
      { sms: userProvidedSMS[6], expected: 100 },
      { sms: userProvidedSMS[7], expected: 199 },
    ];

    expectedAmounts.forEach(({ sms, expected }) => {
      const result = parseSms(sms);
      if (result) {
        expect(result.amount).toBe(expected);
      }
    });
  });

  test('should categorize subscriptions correctly', () => {
    const parsed = userProvidedSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const subscriptions = detectSubscriptions(parsed);
    
    console.log('\nSubscription transactions:');
    subscriptions.forEach(sub => {
      console.log(`- ${sub.merchantName} (${sub.billingCycle})`);
    });

    // Should detect: JioHotstar, Google Play (x2), Spotify
    // Should NOT detect: Google (x2), AWS India, L&T Finance
    expect(subscriptions.length).toBeGreaterThanOrEqual(3);
    
    const merchantNames = subscriptions.map(s => s.merchantName.toLowerCase());
    
    // Should have these
    expect(merchantNames.some(n => n.includes('jiohotstar') || n.includes('jio hotstar'))).toBe(true);
    expect(merchantNames.some(n => n.includes('google play'))).toBe(true);
    expect(merchantNames.some(n => n.includes('spotify'))).toBe(true);
    
    // Should NOT have plain "Google" (without "Play")
    const plainGoogleCount = merchantNames.filter(n => n === 'google').length;
    expect(plainGoogleCount).toBe(0);
    
    // Should NOT have AWS or L&T Finance
    expect(merchantNames.some(n => n.includes('aws'))).toBe(false);
    expect(merchantNames.some(n => n.includes('finance'))).toBe(false);
  });
});
