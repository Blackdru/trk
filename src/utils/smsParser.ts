import type { RawSms, ParsedTransaction } from '../types';
import { extractFeatures, classifySms } from './smsClassifier';
import { getSpecialServiceMap, findMerchantPattern } from './merchantPatterns';

/**
 * Parse SMS body to extract UPI transaction details.
 * 
 * Uses Rule-Based ML (Decision Tree) for classification.
 * PRIVACY: All processing happens locally on-device.
 * No SMS data is transmitted externally.
 */
export function parseSms(sms: RawSms): ParsedTransaction | null {
  const { body, date } = sms;

  // Skip OTP messages
  if (isOtpMessage(body)) {
    return null;
  }

  // Extract features and classify using decision tree
  const features = extractFeatures(sms);
  const classification = classifySms(features, body);
  
  // Log classification for debugging
  console.log(`[SmsClassifier] Type: ${classification.type}, Confidence: ${classification.confidence}, Reason: ${classification.reason}`);
  
  // Reject P2P transfers and unknown types
  if (classification.type === 'p2p-transfer') {
    console.log(`[SmsParser] Rejected P2P transfer: ${classification.reason}`);
    return null;
  }
  
  // Reject unknown type — classifySms always returns confidence 0.50 for 'unknown',
  // so we use <= to actually catch and reject these cases
  if (classification.type === 'unknown' && classification.confidence <= 0.50) {
    console.log(`[SmsParser] Rejected unknown: Low confidence (${classification.confidence})`);
    return null;
  }
  
  // Accept all subscription-related types (subscription, autopay, mandate, emi) with lower threshold
  // Lowered from 0.65 to 0.55 to catch more legitimate subscriptions
  if (classification.confidence < 0.55 && classification.type !== 'subscription' && classification.type !== 'autopay' && classification.type !== 'mandate' && classification.type !== 'emi') {
    console.log(`[SmsParser] Rejected: Low confidence (${classification.confidence}) for type ${classification.type}`);
    return null;
  }

  // Determine payment type based on classification
  let paymentType: 'UPI' | 'Autopay' | 'Mandate' = 'UPI';
  if (classification.type === 'mandate') {
    paymentType = 'Mandate';
  } else if (classification.type === 'autopay') {
    paymentType = 'Autopay';
  } else if (classification.type === 'subscription' || classification.type === 'emi') {
    paymentType = 'Autopay'; // Treat subscriptions and EMI as Autopay
  }

  // Extract amount (handles Rs., Rs, INR, ₹ formats)
  const amount = extractAmount(body);
  
  // Extract due date if present (for reminders and scheduled payments)
  const dueDate = extractDueDate(body);
  
  // Special case: Payment reminders (with or without amount, but with due date)
  // These are important for tracking upcoming payments
  // Examples: "Your next EMI is due on 05 April 2026", "UPI AutoPay debit scheduled on 03/04/26"
  if (dueDate) {
    const merchantName = extractMerchantName(body);
    if (!merchantName) {
      console.log('[SmsParser] Could not extract merchant from reminder:', body.substring(0, 100));
      // Don't return null yet - we might still have amount
      if (!amount) {
        return null;
      }
    }
    
    // If we have a due date, this is a reminder/scheduled payment
    // Use the due date as the transaction date for proper tracking
    const finalMerchantName = merchantName || 'Unknown Merchant';
    const finalAmount = amount || 0;
    
    console.log(`[SmsParser] Payment reminder: ${finalMerchantName} - ₹${finalAmount} - Due on ${new Date(dueDate).toLocaleDateString()} (${paymentType})`);
    
    return {
      id: `${dueDate}-${finalMerchantName}-${finalAmount}`,
      merchantName: finalMerchantName,
      amount: finalAmount,
      date: dueDate, // Use due date as the transaction date for reminders
      paymentType,
      rawSms: body,
    };
  }
  
  // Special case: Subscription confirmation without amount (e.g., JioHotstar activation)
  // If it's a subscription type and has duration but no amount, use 0 as placeholder
  if (!amount) {
    if (classification.type === 'subscription' && /\d+\s*days/i.test(body)) {
      console.log('[SmsParser] Subscription confirmation without amount, using 0 as placeholder');
      // Still need merchant name
      const merchantName = extractMerchantName(body);
      if (!merchantName) {
        console.log('[SmsParser] Could not extract merchant from:', body.substring(0, 100));
        return null;
      }
      
      return {
        id: `${date}-${merchantName}-0`,
        merchantName,
        amount: 0,
        date,
        paymentType: 'Autopay',
        rawSms: body,
      };
    }
    
    console.log('[SmsParser] Could not extract amount from:', body.substring(0, 100));
    return null;
  }

  // Extract merchant name
  const merchantName = extractMerchantName(body);
  if (!merchantName) {
    console.log('[SmsParser] Could not extract merchant from:', body.substring(0, 100));
    return null;
  }

  // Use due date if available (for scheduled payments), otherwise use SMS date
  const transactionDate = dueDate || date;

  console.log(`[SmsParser] Parsed: ${merchantName} - ₹${amount} (${paymentType})`);

  return {
    id: `${transactionDate}-${merchantName}-${amount}`,
    merchantName,
    amount,
    date: transactionDate,
    paymentType,
    rawSms: body,
  };
}

function isOtpMessage(body: string): boolean {
  // OTP patterns must be specific to avoid false positives with mandate/subscription SMS
  const strongOtpPatterns = [
    /\botp\b.*\b\d{4,6}\b/i,          // "OTP" followed by a number
    /\b\d{4,6}\b.*\botp\b/i,          // Number followed by "OTP"
    /one.?time.?password/i,
    /verification code\s*:?\s*\d{4,6}/i, // "verification code: 1234"
  ];
  
  // Always check for subscription/payment keywords FIRST — never reject these
  const hasSubscriptionKeywords = /debited|paid|transferred|payment|autopay|mandate|subscription|recurring|e-mandate|nach|emi|debit|charged|billed|renewed|renewal|premium|installment|due|standing instruction|auto-debit/i.test(body);
  
  if (hasSubscriptionKeywords) {
    return false; // Never reject SMS that contain subscription/payment keywords
  }
  
  // Only reject if it strongly looks like an OTP message
  if (strongOtpPatterns.some(p => p.test(body))) {
    return true;
  }

  return false;
}

function extractAmount(body: string): number | null {
  const curr = '(?:rs\\.?|inr|₹|\\$|€|£|¥|aed|sar|qar|omr|kwd|bhd|sgd|aud|cad)';

  const patterns = [
    // 1. "debited by 80.00", "debited by Rs.550", "debited with Rs.119/-", "debited Rs.500"
    new RegExp(`debited\\s+(?:with|by)?\\s*${curr}?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*\\/?-?`, 'i'),
    // 2. "EMI of Rs.12000" / "loan EMI Rs. 1619" / "payment of Rs.1800" / "premium Rs.7500" / "repaying Rs. 1935.00" / "overdue loan of INR 4366.0"
    new RegExp(`(?:emi|loan\\s*emi|payment|premium|bill|autopay|mandate|subscription|charge|repaying|repayment\\s+of|overdue\\s+loan\\s+of|amounting\\s+to)\\s+(?:of\\s+|is\\s+)?${curr}?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 3. "Automatic payment of Rs.199 for Canva" / "payment of INR 1.00 for order"
    new RegExp(`(?:automatic\\s+payment|payment|recharge)\\s+(?:of\\s+)?${curr}?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 4. "for Rs.15000.00 is successfully created" / "of Rs.15000"
    new RegExp(`(?:of|for)\\s+${curr}\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 5. "set up for Rs.X to Y" or "setup for Rs.X"
    new RegExp(`set\\s*up\\s+(?:for\\s+)?${curr}?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 6. "charged Rs.X" or "charge of Rs.X"
    new RegExp(`charg(?:ed|e)\\s+(?:of\\s+)?${curr}?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 7. "amount Rs.X" or "amt Rs.X" / "Total Premium: Rs.5,107"
    new RegExp(`(?:amount|amt|total\\s*premium)\\.?\\s*(?:is|:)?\\s*${curr}?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 8. "Rs.X has been" or "INR X has been"
    new RegExp(`${curr}\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s+has\\s+been`, 'i'),
    // 9. Generic: "Rs 3,275.00" or "Rs.3,275.00" or "₹3275" (broad catch-all WITH currency)
    new RegExp(`${curr}\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, 'i'),
    // 10. Generic: "3,275.00 Rs" or "3275 INR" (amount before currency)
    new RegExp(`([0-9,]+(?:\\.[0-9]{1,2})?)\\s*${curr}`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0 && amount < 100000000) {
        return amount;
      }
    }
  }

  return null;
}

// Issue #5: Tagged pattern objects instead of fragile regex.source inspection
interface DueDatePattern {
  regex: RegExp;
  format: 'iso' | 'scheduled-dmy' | 'dmy-named' | 'dmy-numeric';
}

function extractDueDate(body: string): number | null {
  const patterns: DueDatePattern[] = [
    // "due on 2026-02-05" (ISO YYYY-MM-DD format)
    { regex: /(?:is\s+)?due\s+(?:on|by)\s+(\d{4})-(\d{1,2})-(\d{1,2})/i, format: 'iso' },
    // "due on 05 April 2026" or "is due on 05 April 2026"
    { regex: /(?:is\s+)?due\s+on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i, format: 'dmy-named' },
    // "due on 05-Mar-26" or "is due on 05-Mar-26" or "due on 05-Mar-2026"
    { regex: /(?:is\s+)?due\s+on\s+(\d{1,2})-([A-Za-z]{3}|\d{2})-(\d{2,4})/i, format: 'dmy-numeric' },
    // "due by 05.02.2026" or "due by 05-02-2026" (DD.MM.YYYY / DD-MM-YYYY)
    { regex: /(?:is\s+)?due\s+(?:on|by)\s+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/i, format: 'dmy-numeric' },
    // "scheduled on .03/04/26" or "scheduled on 03/04/26" (DD/MM/YY format)
    { regex: /scheduled\s+on\s+\.?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i, format: 'scheduled-dmy' },
    // "scheduled for 03/04/26" or "scheduled for 03-04-26"
    { regex: /scheduled\s+for\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/i, format: 'scheduled-dmy' },
    // "debit on 05 April" or "debit on 05-Apr"
    { regex: /debit\s+on\s+(\d{1,2})[\s-]([A-Za-z]{3,})/i, format: 'dmy-named' },
    // "payment on 05/04/26"
    { regex: /payment\s+on\s+(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i, format: 'dmy-numeric' },
    // "debit on 5th Feb" or "due on 5th February 2026" (ordinal day)
    { regex: /(?:due|debit)\s+(?:on|by)\s+(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]{3,})(?:\s+(\d{4}))?/i, format: 'dmy-named' },
    // "on 10-Jan-26" or "on 10-Jan-2026" (common pre-debit alert format)
    { regex: /\bon\s+(\d{1,2})-([A-Za-z]{3}|\d{2})-(\d{2,4})\b/i, format: 'dmy-numeric' },
    // "on 10 Jan 2026" or "on 10 January 2026"
    { regex: /\bon\s+(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})\b/i, format: 'dmy-named' },
    // "on 10/01/26" or "on 10/01/2026"
    { regex: /\bon\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i, format: 'scheduled-dmy' },
    // "on 05.02.2026" (DD.MM.YYYY with dots — generic)
    { regex: /\bon\s+(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/i, format: 'dmy-numeric' },
    // "on 10-Jan" or "on 10 Jan" (without year)
    { regex: /\bon\s+(\d{1,2})[- ]([A-Za-z]{3,})\b/i, format: 'dmy-named' },
  ];

  for (const { regex, format } of patterns) {
    const match = body.match(regex);
    if (match) {
      try {
        let day: number, month: number, year: number;
        
        if (format === 'iso') {
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          day = parseInt(match[3], 10);
        } else if (format === 'scheduled-dmy') {
          day = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1;
          year = parseInt(match[3], 10);
          if (year < 100) year += 2000;
        } else if (match[2] && match[2].match(/^[A-Za-z]+$/)) {
          // Named month: DD Month YYYY or DDth Month YYYY
          day = parseInt(match[1], 10);
          month = parseMonth(match[2]);
          year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
          if (year < 100) year += 2000;
        } else {
          // Numeric: DD-MM-YY or DD-MM-YYYY or DD.MM.YYYY
          day = parseInt(match[1], 10);
          const monthStr = match[2];
          if (monthStr && monthStr.match(/^[A-Za-z]{3}$/)) {
            month = parseMonth(monthStr);
          } else {
            month = parseInt(monthStr, 10) - 1;
          }
          year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
          if (year < 100) year += 2000;
        }
        
        if (month === -1) continue; // Invalid month name
        
        // Issue #11: Validate day/month ranges to prevent silent date wrapping
        if (day < 1 || day > 31 || month < 0 || month > 11) continue;
        
        const dueDate = new Date(year, month, day);
        if (!isNaN(dueDate.getTime())) {
          return dueDate.getTime();
        }
      } catch (e) {
        console.log('[SmsParser] Error parsing due date:', e);
        continue;
      }
    }
  }

  return null;
}

function parseMonth(monthStr: string): number {
  const months: Record<string, number> = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11,
  };
  
  return months[monthStr.toLowerCase()] ?? -1;
}

function extractMerchantName(body: string): string | null {
  // Issue #1: Cap input length to prevent ReDoS on very long SMS
  const cappedBody = body.length > 500 ? body.substring(0, 500) : body;

  // Issue #6: Use single source of truth from merchantPatterns.ts
  const specialServices = getSpecialServiceMap();
  
  for (const service of specialServices) {
    if (service.pattern.test(cappedBody)) {
      return service.name;
    }
  }
  
  // Handle plain "Google" (not Google Play/One/Cloud)
  if (/\bgoogle\b/i.test(cappedBody) && !/google\s*(?:play|one|cloud)/i.test(cappedBody)) {
    return 'Google';
  }
  
  // Also check for services not in merchantPatterns but common in SMS
  const extraServices = [
    { pattern: /branch\s*intl|branch\s*international/i, name: 'Branch' },
    { pattern: /true\s+credits|true\s+balance/i, name: 'True Credits' },
    { pattern: /\bmoneyview\b/i, name: 'Moneyview' },
    { pattern: /home\s*loan\s*emi/i, name: 'Home Loan' },
    { pattern: /home\s*appliance\s*emi/i, name: 'Home Appliance EMI' },
    { pattern: /car\s*loan\s*emi/i, name: 'Car Loan' },
    { pattern: /personal\s*loan\s*emi/i, name: 'Personal Loan' },
    { pattern: /education\s*loan\s*emi/i, name: 'Education Loan EMI' },
    { pattern: /vehicle\s*loan\s*emi/i, name: 'Vehicle Loan EMI' },
    { pattern: /business\s*loan\s*emi/i, name: 'Business Loan EMI' },
    { pattern: /credit\s*card\s*autopay/i, name: 'Credit Card' },
    // Generic EMI fallback: "towards/for MERCHANT EMI" e.g. HOME APPLIANCE EMI
    // Deliberately last so more-specific patterns above take priority
  ];
  
  // Also check for services not in merchantPatterns but common in SMS
  for (const service of extraServices) {
    if (service.pattern.test(cappedBody)) {
      return service.name;
    }
  }

  // Generic "towards/for X EMI" fallback (e.g. HOME APPLIANCE EMI, CONSUMER DURABLE EMI)
  const genericEmiMatch = cappedBody.match(/(?:towards|for)\s+([A-Za-z0-9\s&.+-]{3,40}?\s+emi)(?:\s*\.?\s*(?:bal|avail|on\s+\d|from|a\/c|ref|$))/i);
  if (genericEmiMatch && genericEmiMatch[1]) {
    const emiName = genericEmiMatch[1].trim();
    const known = findMerchantPattern(emiName);
    if (known) return known.name;
    if (emiName.length >= 4 && emiName.length <= 50) return emiName;
  }
  
  // Issue #1: Use cappedBody for all regex matching to prevent ReDoS
  // Common patterns for merchant names in UPI SMS
  // NOTE: Order matters — more specific patterns first, generic patterns last
  const patterns = [
    // "Automatic payment of Rs.199 for Canva Pty Ltd has been setup successfully"
    /(?:automatic\s+payment|autopay)\s+of\s+(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+has\s+been\s+setup|\s+has\s+been\s+set|\s+is\s+setup|\s+registered|\s+created)/i,
    // "UPI-Mandate for Rs.15000.00 is successfully created towards Command Code from A/c No"
    /upi-mandate\s+for\s+(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+is\s+successfully\s+created\s+towards\s+([A-Za-z0-9\s&.+-]+?)(?:\s+from|\s+a\/c|\.|$)/i,
    // "Your SONU MARKETING PVT LTD subscription request for ..."
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+subscription\s+request\s+for/i,
    // "Recurring payment request with Chhotaria Securities Privat... for ..."
    /recurring\s+payment\s+request\s+with\s+([A-Za-z0-9\s&.+-]+?)(?:\s+for|\s+subscription|\s+amounting)/i,
    // "Recharge of INR 379.00 is successful for your Airtel Mobile"
    /recharge\s+of\s+(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+is\s+successful\s+for\s+your\s+([A-Za-z0-9\s&.+-]+?)(?:\s+on|\s+mobile|\.|$)/i,
    // "loan EMI Rs. 1619 is received with trxn ID 507197956 successfully. True Credits"
    /loan\s*emi\s+(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+is\s+received.*?[-.\n\r]\s*([A-Za-z0-9\s&.+-]+?)(?:\.|$)/i,
    // "repaying Rs. 1935.00 Your 1 installment ... - Pocket Mitra Team"
    /repaying\s+(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?.*?[-–]\s*([A-Za-z0-9\s&.+-]+?)(?:\s+team)?(?:\.|$)/i,
    // "reminder from TrustPaisa regarding your overdue loan"
    /reminder\s+from\s+([A-Za-z0-9\s&.+-]+?)\s+regarding\s+your\s+overdue/i,
    // "scheduled for debit of Rs.X towards MERCHANT" - HIGHEST PRIORITY for mandate notices
    /(?:scheduled\s+for\s+debit\s+of\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+towards|scheduled\s+for\s+.*?towards)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|via|ref|umn|\.|$))/i,
    // "Your next EMI of Rs.X" or "next payment of Rs.X" - HIGHEST PRIORITY for reminders
    /(?:your\s+)?next\s+(?:emi|payment|bill)\s+of\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+is\s+due.*?-\s*([A-Za-z0-9\s&.+-]+?)(?:\s*$)/i,
    // "UPI AutoPay for X debit" - HIGH PRIORITY for scheduled payments
    /upi\s+autopay\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+debit/i,
    // "payment on the X app" or "payment on X app"
    /payment\s+on\s+(?:the\s+)?([A-Za-z0-9\s&.+-]+?)\s+app/i,
    // "payment of Rs.X for X has been setup" pattern - HIGH PRIORITY for Paytm-style messages
    /payment\s+of\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+has\s+been\s+setup/i,
    // "of Rs.X for X has been" pattern
    /of\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+has\s+been/i,
    // "Your X EMI is due" pattern - HIGH PRIORITY
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+emi\s+is\s+due/i,
    // "Pay on X app" pattern
    /pay\s+on\s+(?:the\s+)?([A-Za-z0-9\s&.+-]+?)\s+app/i,
    // "Your X autopay of" pattern - HIGHEST PRIORITY
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+(?:of|mandate\s+for)/i,
    // "created for X from" pattern - HIGH PRIORITY for mandate creation
    /(?:created|registered|set up|setup|approved)\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+(?:from|per|monthly|yearly|subscription)/i,
    // "created for X from" pattern
    /(?:created|registered)\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+from/i,
    // "CREATED FOR RS.X TOWARDS X" pattern (uppercase)
    /created\s+for\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+towards\s+([A-Za-z0-9\s&.+-]+?)(?:\s+from)/i,
    // "towards X" pattern - improved to capture more variations
    /(?:towards|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:is|from|for|per|rs|inr|₹|\.|a\/c|has|refer|valid|monthly|subscription|via|on\s+\d|bal|avail))/i,
    // "set for X. A/c" pattern
    /set\s+for\s+([A-Za-z0-9\s&.+-]+?)\.?\s+A\/c/i,
    // "set up for Rs.X to X" pattern
    /set\s+up\s+for\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+to\s+([A-Za-z0-9\s&.+-]+?)\s+(?:monthly|yearly)/i,
    // "trf to X Refno" pattern (SBI and other banks)
    /trf\s+to\s+([A-Za-z0-9\s&.+-]+?)\s+(?:Refno|ref|upi)/i,
    // "to X monthly/per month" pattern
    /(?:to|for)\s+([A-Za-z0-9\s&.+-]+?)\s+(?:monthly|yearly|quarterly|weekly|per\s+month|subscription)/i,
    // "for X via" pattern
    /for\s+([A-Za-z0-9\s&.+-]+?)\s+via\s+(?:autopay|upi|mandate)/i,
    // "enabled for X." pattern
    /enabled\s+for\s+([A-Za-z0-9\s&.+-]+?)\.?\s+(?:Next|Debit|A\/c)/i,
    // "Auto-debit of Rs.X enabled for X" pattern
    /auto-debit\s+of\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+enabled\s+for\s+([A-Za-z0-9\s&.+-]+?)\./i,
    // "to X@" pattern (VPA)
    /to\s+([A-Za-z0-9\s&.+-]+?)@\w+\s+for/i,
    // "mandate approved: Rs.X to X@" pattern
    /mandate\s+approved:\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+to\s+([A-Za-z0-9\s&.+-]+?)@/i,
    // "Your X subscription" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+subscription/i,
    // "X subscription renewed via autopay" pattern (specific before generic)
    /([A-Za-z0-9\s&.+-]+?)\s+subscription\s+renewed\s+via/i,
    // "X subscription renewed/active" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+subscription\s+(?:renewed|active|via)/i,
    // "for X starting" pattern
    /for\s+([A-Za-z0-9\s&.+-]+?)\s+starting/i,
    // "Your X autopay mandate for Rs" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+mandate\s+for/i,
    // "Your X autopay of" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+(?:of|mandate)/i,
    // "Your X EMI" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+emi/i,
    // "X EMI of" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+emi\s+of/i,
    // "X EMI mandate" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+emi\s+mandate/i,
    // "debited for X" pattern - for autopay/debited messages
    /(?:debited|paid|processed)\s+for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|via|from|policy|consumer|connection|loan|card|mobile|emi|bill|subscription|\.))/i,
    // "charged for X" or "billed for X" pattern
    /(?:charged|billed)\s+(?:for\s+)?([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|via|from|rs|inr|₹|subscription|\.))/i,
    // "for your X" pattern (loans)
    /for\s+your\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:debited|from|loan|a\/c|emi))/i,
    // "X bill payment" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+(?:bill|electricity\s+bill)\s+(?:payment|Rs|INR|₹)/i,
    // "X policy premium" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+(?:insurance\s+)?(?:policy\s+)?premium/i,
    // "X monthly bill" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+monthly\s+bill/i,
    // "X booking payment" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+(?:booking|cylinder)\s+payment/i,
    // "X Card autopay" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+card\s+autopay/i,
    // "X autopay mandate for" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+autopay\s+mandate\s+for/i,
    // "X autopay of" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+autopay\s+of/i,
    // "mandate for X Rs" pattern
    /(?:mandate|autopay)\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+(?:rs\.?|inr|₹)/i,
    // "registered successfully for X subscription" pattern
    /registered\s+successfully\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+subscription/i,
    // NACH debit pattern
    /debit.*?by\s+nach.*?(?:trf to|to)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:Refno|ref|upi|\.))/i,
    // Auto-debit patterns (common in Indian banking)
    /auto[\s-]*debit\s+of\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:from|on|via|has|a\/c|\.))/i,
    /auto[\s-]*debit\s+for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|via|rs|inr|₹|has|a\/c|\.))/i,
    // NACH debit for MERCHANT
    /nach\s+(?:debit|trf)\s+(?:for|to|towards)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|ref|a\/c|\.))/i,
    // UPI mandate for MERCHANT
    /upi\s+mandate\s+(?:for|of|to)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|has|\.))/i,
    // Autopay payment for MERCHANT
    /autopay\s+payment\s+(?:for|of|to)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|has|\.))/i,
    // SI debit for MERCHANT (standing instruction)
    /si\s+(?:debit|payment|execution)\s+(?:for|of|to|towards)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|has|a\/c|\.))/i,
    // "debited for MERCHANT on" (without explicit follow-up keywords)
    /(?:debited|debit)\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+on\s+\d/i,
    // "debit towards MERCHANT"
    /(?:debited?|paid)\s+towards\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|ref|a\/c|vide|\.))/i,
    // "will be debited for MERCHANT" (upcoming debit)
    /will\s+be\s+debited\s+(?:for|towards)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|\.))/i,
    // "renewal of MERCHANT" or "renewed for MERCHANT"
    /(?:renewal|renewed)\s+(?:of|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|from|on|rs|inr|₹|subscription|has|\.))/i,
    // Generic patterns (lower priority)
    /(?:autopay|mandate).*?(?:to|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|for|from|rs|inr|₹))/i,
    /([A-Za-z0-9\s&.+-]+?)\s+(?:autopay|mandate)/i,
  ];

  for (const pattern of patterns) {
    const match = cappedBody.match(pattern);
    if (match) {
      const name = match[1]?.trim();
      if (!name) continue;
      
      // Clean up the merchant name — strip bank noise and formatting artifacts
      let cleanName = name
        .replace(/\s+/g, ' ')
        .replace(/^(mr|ms|mrs|dr)\.?\s*/i, '');

      if (/towards\s+(.+)/i.test(cleanName)) {
        const afterTowards = cleanName.match(/towards\s+(.+)/i);
        if (afterTowards) cleanName = afterTowards[1];
      }
      if (/for\s+(.+)/i.test(cleanName) && !/^(?:you|rs|inr|₹)/i.test(cleanName)) {
        const afterFor = cleanName.match(/for\s+(.+)/i);
        if (afterFor) cleanName = afterFor[1];
      }

      cleanName = cleanName
        .replace(/^nach[- ]+/i, '')
        .replace(/^si[- ]+/i, '')
        .replace(/\s*\/-?\s*$/, '')         // Remove trailing /-
        .replace(/\s*\.\s*$/, '')            // Remove trailing period
        .replace(/\s*Refno.*$/i, '')         // Remove "Refno..." suffix
        .replace(/\s*UMN:.*$/i, '')          // Remove "UMN:..." suffix
        .replace(/\s*Refer\s.*$/i, '')       // Remove "Refer..." suffix
        .replace(/\s*Regards.*$/i, '')       // Remove "Regards..." suffix
        .replace(/\s*If not you.*$/i, '')    // Remove "If not you..." suffix
        .replace(/\s*If not u.*$/i, '')      // Remove "If not u..." suffix
        .replace(/\s*kindly.*$/i, '')        // Remove "kindly..." suffix
        .replace(/\s*Download.*$/i, '')      // Remove "Download..." suffix
        .replace(/\s*Avl\s+Bal.*$/i, '')     // Remove "Avl Bal..." suffix
        .replace(/\s*will\s+(?:happen|be).*$/i, '')
        .replace(/\s*is\s+scheduled.*$/i, '')
        .replace(/\s+via\s+(?:autopay|upi|mandate|card|netbanking).*$/i, '')
        .replace(/\s*-\s*$/, '')             // Remove trailing dash
        .replace(/\s*(?:a\/c|ac|acct)[\s:]*(?:xx+\d+|\d{4,})/i, '') // Account number fragments
        .replace(/\s*(?:dt|date)[\s.:]*\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4}/i, '') // Date fragments
        .replace(/\s*(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d+)?/i, '') // Currency amount leaking into name
        .replace(/\s*xx+\d+/i, '')           // Masked card/account numbers
        .replace(/\s*w\.?e\.?f\.?\s*/i, '')  // "with effect from" abbreviation
        .replace(/\s*on\s+\d{1,2}[\/\-.][\dA-Za-z]+/i, '') // "on DD/MM" date suffix
        .trim();
      
      // Skip noise words or "debit of"
      if (/^(?:debit\s*of|credit\s*of|payment\s*of|auto[- ]?debit|mandate|the|a\/c|card)$/i.test(cleanName)) {
        continue;
      }

      // Skip if it's just numbers or too short
      if (/^\d+$/.test(cleanName) || cleanName.length < 2) {
        continue;
      }
      
      const pattern = findMerchantPattern(cleanName) || findMerchantPattern(name);
      if (pattern) {
        return pattern.name;
      }

      if (cleanName.length >= 2 && cleanName.length <= 60) {
        return cleanName;
      }
    }
  }

  return null;
}
