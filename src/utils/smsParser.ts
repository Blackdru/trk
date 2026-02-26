import type { RawSms, ParsedTransaction } from '../types';
import { extractFeatures, classifySms } from './smsClassifier';

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
  const classification = classifySms(features);
  
  // Log classification for debugging
  console.log(`[SmsClassifier] Type: ${classification.type}, Confidence: ${classification.confidence}, Reason: ${classification.reason}`);
  
  // Reject P2P transfers and unknown types
  if (classification.type === 'p2p-transfer') {
    console.log(`[SmsParser] Rejected P2P transfer: ${classification.reason}`);
    return null;
  }
  
  // Reject unknown with low confidence
  if (classification.type === 'unknown' && classification.confidence < 0.60) {
    console.log(`[SmsParser] Rejected unknown: Low confidence (${classification.confidence})`);
    return null;
  }
  
  // Accept all subscription-related types (subscription, autopay, mandate, emi)
  // Even with lower confidence, as long as it's not P2P or completely unknown
  if (classification.confidence < 0.70 && classification.type !== 'subscription' && classification.type !== 'autopay' && classification.type !== 'mandate' && classification.type !== 'emi') {
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

  console.log(`[SmsParser] Parsed: ${merchantName} - ₹${amount} (${paymentType})`);

  return {
    id: `${date}-${merchantName}-${amount}`,
    merchantName,
    amount,
    date,
    paymentType,
    rawSms: body,
  };
}

function isOtpMessage(body: string): boolean {
  const otpPatterns = [
    /\botp\b/i,
    /one.?time.?password/i,
    /verification code/i,
    /\b\d{4,6}\b.*(?:valid|expires?)/i,
  ];
  
  // If message is very short and contains OTP indicators
  if (body.length < 100 && otpPatterns.some(p => p.test(body))) {
    return true;
  }
  
  // Check if it's primarily an OTP message (not a debit notification)
  const hasDebitKeywords = /debited|paid|transferred|payment|autopay|mandate/i.test(body);
  if (!hasDebitKeywords && otpPatterns.some(p => p.test(body))) {
    return true;
  }

  return false;
}

function extractAmount(body: string): number | null {
  // Common amount patterns in Indian bank SMS
  const patterns = [
    // "debited by 550.00" format (SBI and other banks)
    /debited\s+by\s+([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // Standard currency formats
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    // Generic debited/amount patterns
    /debited.*?([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /amount.*?([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        return amount;
      }
    }
  }

  return null;
}

function extractMerchantName(body: string): string | null {
  // Special handling for JioHotstar subscription messages
  if (/jiohotstar|jio.*hotstar/i.test(body)) {
    return 'JioHotstar';
  }
  
  // Special handling for Google Play subscriptions
  if (/google\s*play/i.test(body)) {
    return 'Google Play';
  }
  
  // Special handling for Google (generic)
  if (/\bgoogle\b/i.test(body) && !/google\s*play/i.test(body)) {
    return 'Google';
  }
  
  // Special handling for AWS
  if (/\baws\b|aws\s*india/i.test(body)) {
    return 'AWS India';
  }
  
  // Special handling for Spotify
  if (/\bspotify\b/i.test(body)) {
    return 'Spotify';
  }
  
  // Special handling for LIC
  if (/\blic\b/i.test(body) && !/policy|insurance/i.test(body)) {
    return 'LIC';
  }
  
  // Special handling for specific services (check before patterns)
  if (/indane\s*gas/i.test(body)) {
    return 'Indane Gas';
  }
  
  if (/act\s*fibernet/i.test(body)) {
    return 'ACT Fibernet';
  }
  
  if (/apple\s*music/i.test(body)) {
    return 'Apple Music';
  }
  
  if (/jio\s*fiber/i.test(body)) {
    return 'Jio Fiber';
  }
  
  if (/airtel\s*postpaid/i.test(body)) {
    return 'Airtel Postpaid';
  }
  
  // Common patterns for merchant names in UPI SMS
  const patterns = [
    // "trf to X Refno" pattern (SBI and other banks) - HIGHEST PRIORITY
    /trf\s+to\s+([A-Za-z0-9\s&.+-]+?)\s+(?:Refno|ref|upi)/i,
    // "towards X" pattern - improved to capture more variations
    /(?:towards|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:is|from|for|rs|inr|₹|\.|a\/c|has|refer))/i,
    // NACH debit pattern - extract from "trf to X Refno"
    /debit.*?by\s+nach.*?(?:trf to|to)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:Refno|ref|upi|\.))/i,
    // "to X monthly/yearly" pattern
    /(?:to)\s+([A-Za-z0-9\s&.+-]+?)\s+(?:monthly|yearly|quarterly|weekly)/i,
    // "for X" pattern - for autopay/debited messages
    /(?:debited\s+for|autopay\s+for|enabled\s+for|set\s+up\s+for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|has|bill|subscription|broadband|cylinder|monthly|\.))/i,
    // "on X" pattern - for mandate creation
    /(?:mandate|autopay).*?(?:on)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:for|from|starting))/i,
    // "Regards, X" pattern - for EMI reminders and bank messages
    /regards,?\s+([A-Za-z0-9\s&.+-]+?)(?:\s*$|\s*\.)/i,
    // "X bill" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+(?:bill|monthly\s+bill)\s+(?:Rs|INR|₹)/i,
    // "X EMI" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+(?:EMI|emi)\s+(?:of|Rs|INR|₹)/i,
    // "via standing instruction" pattern
    /(?:EMI|emi)\s+of\s+Rs[.\s]*\d+(?:,\d+)*(?:\.\d+)?\s+debited\s+via\s+standing\s+instruction/i,
    /(?:to|at|for|paid to|transferred to)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|via|ref|upi|using|a\/c|ac\/|from))/i,
    /(?:autopay|mandate).*?(?:to|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|for|from|rs|inr|₹))/i,
    /([A-Za-z0-9\s&.+-]+?)\s+(?:autopay|mandate)/i,
    /UPI.*?(?:to|at)\s+([A-Za-z0-9\s&.+-]+)/i,
    /automatic payment.*?for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:has|been))/i,
    /debited.*?via autopay.*?for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|via|ref|\.))/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const name = match[1]?.trim();
      if (!name) continue;
      
      // Clean up the merchant name
      const cleanName = name
        .replace(/\s+/g, ' ')
        .replace(/^(mr|ms|mrs|dr)\.?\s*/i, '')
        .trim();
      
      if (cleanName.length >= 2 && cleanName.length <= 50) {
        return cleanName;
      }
    }
  }

  // Fallback: Try to extract from common service names
  const fallbackPatterns = [
    /(?:Netflix|Spotify|Amazon|Hotstar|Disney|Youtube|Google|Apple|Prime|Swiggy|Zomato|Uber|Ola|LIC|Dropbox|ACT|Indane|Personal\s+Loan|AWS)/i,
  ];

  for (const pattern of fallbackPatterns) {
    const match = body.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}
