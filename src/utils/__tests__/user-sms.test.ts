import { parseSms } from '../smsParser';
import { extractAutopayTransactions } from '../autopayDetector';
import type { RawSms } from '../../types';

describe('User SMS Messages - Real World Test', () => {
  const userSMS: RawSms[] = [
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
      body: "Dear Customer, Your A/C XXXXX822572 has a debit by NACH of Rs 3,275.00 on 05/02/26. Avl Bal Rs 992.03. Download YONO - SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
    {
      body: "Your UPI-Mandate for Rs.100.00 is successfully created towards Google from A/c No: XXXXXX2572. UMN:a695ad6b4fdb4bad9a94cfa511de11ae@ybl. If not you, kindly report on 18001234. -SBI",
      date: Date.now(),
      address: "SBIUPI"
    },
  ];

  test('should parse all user SMS messages', () => {
    console.log('\n========================================');
    console.log('PARSING USER SMS MESSAGES');
    console.log('========================================\n');

    const parsed = userSMS.map((sms, index) => {
      const result = parseSms(sms);
      if (result) {
        console.log(`✓ ${index + 1}. ${result.merchantName} - ₹${result.amount} (${result.paymentType})`);
      } else {
        console.log(`✗ ${index + 1}. Failed to parse: ${sms.body.substring(0, 80)}...`);
      }
      return result;
    }).filter(p => p !== null);

    console.log(`\nTotal parsed: ${parsed.length} out of ${userSMS.length}`);
    console.log('========================================\n');

    // Should parse 3 mandate messages (2 Google Play, 1 Google)
    // The NACH debit is NOT a mandate setup, so it shouldn't be parsed
    expect(parsed.length).toBeGreaterThanOrEqual(3);
  });

  test('should detect all autopay/mandate transactions', () => {
    const parsed = userSMS
      .map(sms => parseSms(sms))
      .filter(p => p !== null);

    const autopayTxns = extractAutopayTransactions(parsed);

    console.log('\n========================================');
    console.log('AUTOPAY/MANDATE DETECTION');
    console.log('========================================\n');

    autopayTxns.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.merchantName.padEnd(20)} ₹${txn.amount.toString().padStart(6)} (${txn.paymentType}) - ${txn.status}`);
    });

    console.log(`\nTotal autopay/mandate transactions: ${autopayTxns.length}`);
    console.log('========================================\n');

    // Should detect at least 3 mandates
    expect(autopayTxns.length).toBeGreaterThanOrEqual(3);
    
    // All should be categorized as subscription (Google/Google Play)
    autopayTxns.forEach(txn => {
      expect(txn.category).toBe('subscription');
    });

    // All should be active (successfully created/setup)
    autopayTxns.forEach(txn => {
      expect(txn.status).toBe('active');
    });
  });
});
