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
  const classification = classifySms(features, body);
  
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
  if (classification.confidence < 0.65 && classification.type !== 'subscription' && classification.type !== 'autopay' && classification.type !== 'mandate' && classification.type !== 'emi') {
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
    // "Rs 3,275.00" or "Rs.3,275.00" or "Rs. 3,275.00"
    /(?:rs\.?\s*|inr\s*|₹\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "3,275.00 Rs" or "3275 INR"
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    // "debited by 550.00" format
    /debited\s+by\s+([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "debited with Rs.119/-"
    /debited\s+with\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*\/-?/i,
    // "of Rs.15000" or "of INR 15000"
    /of\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "Rs 399 autopay" or "Rs.399 autopay"
    /(?:rs\.?\s*|inr\s*|₹\s*)([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:autopay|mandate|debited|for|to|set)/i,
    // "EMI of Rs.12000"
    /emi\s+of\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "payment of Rs.1800"
    /payment\s+of\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "premium Rs.7500"
    /premium\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "bill Rs.699"
    /bill\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "autopay of Rs.5000.00"
    /autopay\s+of\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // Generic debited/amount patterns
    /debited.*?([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /amount.*?([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0 && amount < 10000000) {
        return amount;
      }
    }
  }

  return null;
}

function extractMerchantName(body: string): string | null {
  // Special handling for specific services (check before patterns)
  const specialServices = [
    { pattern: /jiohotstar|jio.*hotstar/i, name: 'JioHotstar' },
    { pattern: /google\s*play/i, name: 'Google Play' },
    { pattern: /google\s*one/i, name: 'Google One' },
    { pattern: /youtube\s*premium/i, name: 'YouTube Premium' },
    { pattern: /youtube\s*music/i, name: 'YouTube Music' },
    { pattern: /amazon\s*prime|prime\s*video/i, name: 'Amazon Prime' },
    { pattern: /disney.*hotstar|hotstar.*disney|disney\+|disney\s+hotstar/i, name: 'Disney+ Hotstar' },
    { pattern: /apple\s*music/i, name: 'Apple Music' },
    { pattern: /apple\s*tv/i, name: 'Apple TV+' },
    { pattern: /microsoft\s*365|office\s*365/i, name: 'Microsoft 365' },
    { pattern: /adobe\s*creative\s*cloud|adobe/i, name: 'Adobe Creative Cloud' },
    { pattern: /\bspotify\b/i, name: 'Spotify' },
    { pattern: /spotify\s*premium/i, name: 'Spotify' },
    { pattern: /\bnetflix\b/i, name: 'Netflix' },
    { pattern: /netflix\s*subscription/i, name: 'Netflix' },
    { pattern: /sony\s*liv|sonyliv/i, name: 'SonyLIV' },
    { pattern: /\bzee\s*5|zee5\b/i, name: 'Zee5' },
    { pattern: /\bvoot\b/i, name: 'Voot' },
    { pattern: /mx\s*player/i, name: 'MX Player' },
    { pattern: /gaana\s*plus|gaana/i, name: 'Gaana' },
    { pattern: /cult\.?fit|cultfit/i, name: 'Cult.fit' },
    { pattern: /swiggy\s*one/i, name: 'Swiggy One' },
    { pattern: /zomato\s*gold/i, name: 'Zomato Gold' },
    { pattern: /indane\s*gas|indane/i, name: 'Indane Gas' },
    { pattern: /act\s*fibernet|act\s*fiber/i, name: 'ACT Fibernet' },
    { pattern: /jio\s*fiber/i, name: 'Jio Fiber' },
    { pattern: /airtel\s*fiber/i, name: 'Airtel Fiber' },
    { pattern: /airtel\s*postpaid/i, name: 'Airtel Postpaid' },
    { pattern: /vodafone\s*idea|vi\s*postpaid/i, name: 'Vodafone Idea' },
    { pattern: /\bbescom\b/i, name: 'BESCOM' },
    { pattern: /bescom\s*electricity/i, name: 'BESCOM' },
    { pattern: /tata\s*power/i, name: 'Tata Power' },
    { pattern: /hdfc\s*life/i, name: 'HDFC Life' },
    { pattern: /icici\s*prudential/i, name: 'ICICI Prudential' },
    { pattern: /max\s*bupa/i, name: 'Max Bupa' },
    { pattern: /home\s*loan\s*emi/i, name: 'Home Loan' },
    { pattern: /car\s*loan\s*emi/i, name: 'Car Loan' },
    { pattern: /personal\s*loan\s*emi/i, name: 'Personal Loan' },
    { pattern: /credit\s*card\s*autopay/i, name: 'Credit Card' },
    { pattern: /\blic\b.*(?:insurance|premium|policy)/i, name: 'LIC' },
    { pattern: /\baws\b|aws\s*india/i, name: 'AWS India' },
    { pattern: /google\s*cloud|gcp/i, name: 'Google Cloud' },
  ];
  
  for (const service of specialServices) {
    if (service.pattern.test(body)) {
      return service.name;
    }
  }
  
  // Handle plain "Google" (not Google Play/One/Cloud)
  if (/\bgoogle\b/i.test(body) && !/google\s*(?:play|one|cloud)/i.test(body)) {
    return 'Google';
  }
  
  // Common patterns for merchant names in UPI SMS
  const patterns = [
    // "Your X autopay of" pattern - HIGHEST PRIORITY
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+(?:of|mandate\s+for)/i,
    // "created for X from" pattern - HIGH PRIORITY for mandate creation
    /(?:created|registered|set up|setup|approved)\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+(?:from|per|monthly|yearly|subscription)/i,
    // "created for X from" pattern
    /(?:created|registered)\s+for\s+([A-Za-z0-9\s&.+-]+?)\s+from/i,
    // "CREATED FOR RS.X TOWARDS X" pattern (uppercase)
    /created\s+for\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+towards\s+([A-Za-z0-9\s&.+-]+?)(?:\s+from)/i,
    // "set for X. A/c" pattern
    /set\s+for\s+([A-Za-z0-9\s&.+-]+?)\.?\s+A\/c/i,
    // "set up for Rs.X to X" pattern
    /set\s+up\s+for\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+to\s+([A-Za-z0-9\s&.+-]+?)\s+(?:monthly|yearly)/i,
    // "trf to X Refno" pattern (SBI and other banks)
    /trf\s+to\s+([A-Za-z0-9\s&.+-]+?)\s+(?:Refno|ref|upi)/i,
    // "towards X" pattern - improved to capture more variations
    /(?:towards|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:is|from|for|per|rs|inr|₹|\.|a\/c|has|refer|valid|monthly|subscription))/i,
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
    // "X subscription renewed" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+subscription\s+(?:renewed|active|via)/i,
    // "X subscription renewed via autopay" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+subscription\s+renewed\s+via/i,
    // "for X starting" pattern
    /for\s+([A-Za-z0-9\s&.+-]+?)\s+starting/i,
    // "Your X autopay of" pattern - MUST BE BEFORE generic patterns
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+(?:of|mandate)/i,
    // "X autopay mandate for Rs" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+mandate\s+for/i,
    // "Your X EMI" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+emi/i,
    // "X EMI of" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+emi\s+of/i,
    // "X EMI mandate" pattern
    /([A-Za-z0-9\s&.+-]+?)\s+emi\s+mandate/i,
    // "debited for X" pattern - for autopay/debited messages
    /(?:debited|paid|processed)\s+for\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:on|via|from|policy|consumer|connection|loan|card|mobile|emi|bill|subscription|\.))/i,
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
    // "Your X autopay of" pattern
    /your\s+([A-Za-z0-9\s&.+-]+?)\s+autopay\s+of/i,
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
    // Generic patterns (lower priority)
    /(?:autopay|mandate).*?(?:to|for)\s+([A-Za-z0-9\s&.+-]+?)(?:\s+(?:of|for|from|rs|inr|₹))/i,
    /([A-Za-z0-9\s&.+-]+?)\s+(?:autopay|mandate)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const name = match[1]?.trim();
      if (!name) continue;
      
      // Clean up the merchant name
      let cleanName = name
        .replace(/\s+/g, ' ')
        .replace(/^(mr|ms|mrs|dr)\.?\s*/i, '')
        .replace(/\s*\/-?\s*$/, '') // Remove trailing /-
        .replace(/\s*\.\s*$/, '') // Remove trailing period
        .trim();
      
      // Skip if it's just numbers or too short
      if (/^\d+$/.test(cleanName) || cleanName.length < 2) {
        continue;
      }
      
      if (cleanName.length >= 2 && cleanName.length <= 60) {
        return cleanName;
      }
    }
  }

  return null;
}
