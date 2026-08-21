import type { RawSms } from '../types';
import { getKnownServiceNames, getKnownServiceBodyPatterns, getSpecialServiceMap } from './merchantPatterns';

/**
 * SMS Feature Extraction for Rule-Based ML Classification
 * Extracts meaningful features from SMS for decision tree processing
 */

export interface SmsFeatures {
  // Keyword features
  hasAutopayKeyword: boolean;
  hasMandateKeyword: boolean;
  hasSubscriptionKeyword: boolean;
  hasRecurringKeyword: boolean;
  hasEmiKeyword: boolean;
  hasStandingInstructionKeyword: boolean;
  hasNachKeyword: boolean;

  // Temporal features
  hasMonthlyKeyword: boolean;
  hasYearlyKeyword: boolean;
  hasQuarterlyKeyword: boolean;
  hasWeeklyKeyword: boolean;
  hasDurationDays: boolean;
  hasDueDateKeyword: boolean;
  hasScheduledKeyword: boolean;

  // Merchant features
  merchantIsAllCaps: boolean;
  merchantHasMultipleWords: boolean;
  merchantIsKnownService: boolean;
  merchantLooksLikePerson: boolean;

  // Amount features
  hasAmount: boolean;
  amountRange: 'micro' | 'small' | 'medium' | 'large' | 'very-large' | null;

  // Sender features
  senderIdType: 'bank-mandate' | 'bank-upi' | 'service' | 'unknown';

  // Transaction features
  hasReferenceNumber: boolean;
  hasUpiId: boolean;
  hasAccountNumber: boolean;

  // Message structure
  textLength: 'short' | 'medium' | 'long';
  hasSuccessIndicator: boolean;
  hasSetupIndicator: boolean;
  hasDebitIndicator: boolean;
}

export interface ClassificationResult {
  type: 'subscription' | 'autopay' | 'mandate' | 'emi' | 'p2p-transfer' | 'unknown';
  confidence: number;
  reason: string;
}

/**
 * Extract features from SMS
 */
export function extractFeatures(sms: RawSms): SmsFeatures {
  const { body, address } = sms;
  const lowerBody = body.toLowerCase();

  // Keyword features - improved patterns
  const hasAutopayKeyword = /autopay|auto-pay|auto pay|auto\s*debit|auto-debit|autodebit|automatic payment|aspresented.*autopay|upi\s*autopay|si\s*debit|nach\s*debit|bill\s*pay/i.test(body);
  const hasMandateKeyword = /mandate|e-mandate|emandate|e-nach|enach|si mandate|upi-mandate|ach\s*debit|umrn/i.test(body);
  const hasSubscriptionKeyword = /subscription|subscribe|renewal|renewed|renew/i.test(body);
  const hasRecurringKeyword = /recurring|recur/i.test(body);
  const hasEmiKeyword = /\bemi\b/i.test(body);
  const hasStandingInstructionKeyword = /standing instruction|\bsi\s+(?:debit|mandate|payment|execution)/i.test(body);
  const hasNachKeyword = /\bnach\b/i.test(body);

  // Temporal features
  const hasMonthlyKeyword = /monthly|per month|\/month/i.test(body);
  const hasYearlyKeyword = /yearly|annual|per year|\/year/i.test(body);
  const hasQuarterlyKeyword = /quarterly|per quarter/i.test(body);
  const hasWeeklyKeyword = /weekly|per week/i.test(body);
  const hasDurationDays = /\d+\s*days/i.test(body);
  const hasDueDateKeyword = /due\s+(?:date|on)|is\s+due|emi\s+is\s+due|payment\s+is\s+due|next\s+(?:payment|emi|bill)\s+(?:is\s+)?due|payment\s+due/i.test(body);
  const hasScheduledKeyword = /scheduled\s+on|scheduled\s+for|debit\s+of.*scheduled|debit\s+is\s+scheduled|upcoming\s+debit|will\s+be\s+debited|debit\s+will/i.test(body);

  // Extract merchant name for analysis
  const merchantName = extractMerchantForAnalysis(body);
  const merchantIsAllCaps = merchantName ? merchantName === merchantName.toUpperCase() && merchantName.length > 3 : false;
  const merchantHasMultipleWords = merchantName ? merchantName.split(/\s+/).length > 1 : false;
  const merchantIsKnownService = merchantName ? isKnownService(merchantName) : false;
  const merchantLooksLikePerson = merchantName ? looksLikePersonName(merchantName) : false;

  // Amount features
  const amount = extractAmountForAnalysis(body);
  const hasAmount = amount !== null;
  const amountRange = amount ? categorizeAmount(amount) : null;

  // Sender features
  const senderIdType = categorizeSenderId(address);

  // Transaction features
  const hasReferenceNumber = /ref(?:no|erence)?[:\s#]*[a-z0-9]{10,}/i.test(body);
  // Issue #3: Require valid UPI handle suffixes instead of any @string
  const hasUpiId = /[a-zA-Z0-9._-]+@(?:ybl|upi|paytm|okhdfcbank|okaxis|oksbi|apl|ibl|axl|sbi|icici|hdfcbank|kotak|indus|federal|rbl|boi|pnb|canarabank|unionbank|idbi|dcb|dbs|sc|hsbc|citi|bob|freecharge|okicici|okbizaxis)\b/i.test(body);
  const hasAccountNumber = /a\/c|account|ac\s+no/i.test(body);

  // Message structure
  const textLength = body.length < 100 ? 'short' : body.length < 250 ? 'medium' : 'long';
  const hasSuccessIndicator = /success|successfully|active|activated|enabled|setup|set up|created|congratulations|initiated/i.test(body);
  const hasSetupIndicator = /setup|set up|created|enabled|activated|congratulations|initiated/i.test(body);
  const hasDebitIndicator = /debit|debited|paid|payment|transferred|charged/i.test(body);

  return {
    hasAutopayKeyword,
    hasMandateKeyword,
    hasSubscriptionKeyword,
    hasRecurringKeyword,
    hasEmiKeyword,
    hasStandingInstructionKeyword,
    hasNachKeyword,
    hasMonthlyKeyword,
    hasYearlyKeyword,
    hasQuarterlyKeyword,
    hasWeeklyKeyword,
    hasDurationDays,
    hasDueDateKeyword,
    hasScheduledKeyword,
    merchantIsAllCaps,
    merchantHasMultipleWords,
    merchantIsKnownService,
    merchantLooksLikePerson,
    hasAmount,
    amountRange,
    senderIdType,
    hasReferenceNumber,
    hasUpiId,
    hasAccountNumber,
    textLength,
    hasSuccessIndicator,
    hasSetupIndicator,
    hasDebitIndicator,
  };
}

/**
 * Decision Tree Classifier
 * Uses extracted features to classify SMS type
 */
export function classifySms(features: SmsFeatures, body?: string): ClassificationResult {
  // Reject cancelled/revoked/stopped mandates/autopays
  if (body && /cancell(?:ed|ation)|revok(?:ed|ation)|stop(?:ped)/i.test(body)) {
    return {
      type: 'p2p-transfer', // Use p2p-transfer as standard rejection type
      confidence: 0.99,
      reason: 'Mandate or autopay was cancelled/revoked/stopped'
    };
  }

  // Rule 1: Strong mandate/autopay indicators
  if (features.hasMandateKeyword && features.hasSuccessIndicator && !features.merchantLooksLikePerson) {
    return {
      type: 'mandate',
      confidence: 0.95,
      reason: 'Mandate creation with success indicator'
    };
  }

  if (features.hasAutopayKeyword && features.hasSuccessIndicator && !features.merchantLooksLikePerson) {
    return {
      type: 'autopay',
      confidence: 0.95,
      reason: 'Autopay setup with success indicator'
    };
  }

  // Rule 2: Subscription indicators
  if (features.hasSubscriptionKeyword && (features.hasAmount || features.hasDurationDays)) {
    return {
      type: 'subscription',
      confidence: 0.90,
      reason: 'Subscription keyword with amount/duration'
    };
  }

  // Rule 2.5: Reject loan DISBURSEMENTS only (money credited TO you)
  // Issue #10: Don't reject EMI payment confirmations — those are legitimate recurring debits
  // Loan disbursement: when loan amount is credited to your account
  if (body && /loan.*(?:disburs|sanction|approv).*(?:credited|transferred|deposited)/i.test(body)) {
    return {
      type: 'p2p-transfer',
      confidence: 0.95,
      reason: 'Loan disbursement (not a subscription)'
    };
  }

  // Loan disbursement alternative patterns — only when money is CREDITED to you
  if (body && /(?:personal|home|car|education|business)?\s*loan.*(?:amount|of\s+rs)/i.test(body) && /credited|disbursed|deposited/i.test(body) && !/debited|debit/i.test(body)) {
    return {
      type: 'p2p-transfer',
      confidence: 0.95,
      reason: 'Loan disbursement (not a subscription)'
    };
  }

  // Rule 3: EMI detection (with or without amount if due date present)
  if (features.hasEmiKeyword && (features.hasAmount || features.hasDueDateKeyword)) {
    return {
      type: 'emi',
      confidence: features.hasAmount ? 0.90 : 0.85,
      reason: features.hasAmount ? 'EMI keyword with amount' : 'EMI due date reminder'
    };
  }

  // Rule 3.5: Scheduled payment reminders (UPI AutoPay, EMI, etc.)
  // These are crucial for detecting recurring payments before they happen
  if (features.hasScheduledKeyword && (features.hasAmount || features.hasDueDateKeyword)) {
    return {
      type: 'autopay',
      confidence: 0.90, // Increased confidence for scheduled payments
      reason: 'Scheduled payment reminder with due date/amount'
    };
  }

  // Rule 3.6: Due date reminders for payments
  // "Your next EMI is due on..." or "Payment due on..."
  if (features.hasDueDateKeyword && !features.merchantLooksLikePerson) {
    return {
      type: 'autopay',
      confidence: 0.85, // Increased confidence for due date reminders
      reason: 'Payment due date reminder'
    };
  }

  // Rule 3.7: "Next payment" or "upcoming payment" reminders
  // Even without explicit due date keyword, these indicate recurring payments
  if (body && /next\s+(?:payment|emi|bill|subscription|autopay|mandate)|upcoming\s+(?:payment|emi|bill|debit)/i.test(body)) {
    return {
      type: 'autopay',
      confidence: 0.83,
      reason: 'Next payment reminder'
    };
  }

  // Rule 3.8: Auto-debit patterns (common in Indian banking)
  if (body && /auto[\s-]*debit.*(?:rs\.?|inr|₹)|(?:rs\.?|inr|₹).*auto[\s-]*debit/i.test(body) && !features.merchantLooksLikePerson) {
    return {
      type: 'autopay',
      confidence: 0.90,
      reason: 'Auto-debit transaction pattern'
    };
  }

  // Rule 4: Standing instruction / NACH / Utility bills
  if ((features.hasStandingInstructionKeyword || features.hasNachKeyword || features.hasAutopayKeyword) && features.hasDebitIndicator) {
    return {
      type: 'autopay',
      confidence: 0.88,
      reason: 'Standing instruction, NACH, or autopay debit'
    };
  }

  // Rule 4.5: NACH or standing instruction with amount (even without explicit debit keyword)
  if ((features.hasNachKeyword || features.hasStandingInstructionKeyword) && features.hasAmount && !features.merchantLooksLikePerson) {
    return {
      type: 'autopay',
      confidence: 0.85,
      reason: 'NACH/SI with amount'
    };
  }

  // Rule 5: Recurring payment indicators
  if (features.hasRecurringKeyword && features.hasAmount && !features.merchantLooksLikePerson) {
    return {
      type: 'subscription',
      confidence: 0.85,
      reason: 'Recurring payment keyword'
    };
  }

  // Rule 6: Temporal indicators (monthly/yearly/etc)
  if ((features.hasMonthlyKeyword || features.hasYearlyKeyword || features.hasQuarterlyKeyword || features.hasWeeklyKeyword)
    && features.hasAmount && !features.merchantLooksLikePerson) {
    return {
      type: 'subscription',
      confidence: 0.85,
      reason: 'Temporal frequency indicator'
    };
  }

  // Rule 7: Known service + mandate/autopay keywords
  if (features.merchantIsKnownService && (features.hasMandateKeyword || features.hasAutopayKeyword)) {
    return {
      type: 'subscription',
      confidence: 0.85,
      reason: 'Known service with mandate/autopay'
    };
  }

  // Rule 8: Sender ID indicates mandate
  if (features.senderIdType === 'bank-mandate' && features.hasDebitIndicator) {
    return {
      type: 'autopay',
      confidence: 0.82,
      reason: 'Bank mandate sender ID'
    };
  }

  // Rule 8.5: "executed" or "processed" with autopay
  if ((features.hasAutopayKeyword || features.hasMandateKeyword) && body && /executed|processed/i.test(body)) {
    return {
      type: 'autopay',
      confidence: 0.85,
      reason: 'Autopay/mandate executed or processed'
    };
  }

  // Rule 9: Person-to-person transfer detection (REJECT)
  if (features.merchantLooksLikePerson && features.merchantIsAllCaps && !features.hasMandateKeyword && !features.hasAutopayKeyword) {
    return {
      type: 'p2p-transfer',
      confidence: 0.90,
      reason: 'Person name pattern detected'
    };
  }

  // Rule 10: Generic UPI transfer (REJECT)
  if (features.senderIdType === 'bank-upi' && !features.hasMandateKeyword && !features.hasAutopayKeyword
    && !features.hasSubscriptionKeyword && !features.merchantIsKnownService) {
    return {
      type: 'p2p-transfer',
      confidence: 0.75,
      reason: 'Generic UPI transfer'
    };
  }

  // Rule 11: Weak subscription signals
  if (features.merchantIsKnownService && features.hasAmount && features.hasDebitIndicator) {
    return {
      type: 'subscription',
      confidence: 0.70,
      reason: 'Known service with debit'
    };
  }

  // Rule 12: Catch-all for known services — even without autopay/mandate keywords,
  // if a known subscription service name appears and there's an amount, it's likely a subscription
  if (features.merchantIsKnownService && features.hasAmount) {
    return {
      type: 'subscription',
      confidence: 0.65,
      reason: 'Known service with amount (catch-all)'
    };
  }

  // Rule 13: Known service in SMS body without explicit merchant extraction
  // Check the raw body for known service names as a last resort
  if (body) {
    const knownInBody = isKnownServiceInBody(body);
    if (knownInBody && features.hasAmount) {
      return {
        type: 'subscription',
        confidence: 0.60,
        reason: `Known service detected in SMS body (catch-all)`,
      };
    }
  }

  // Default: Unknown
  return {
    type: 'unknown',
    confidence: 0.50,
    reason: 'No clear classification pattern'
  };
}

// Helper functions

/**
 * Check if the raw SMS body contains a known subscription service name.
 * Used as a catch-all when the classifier can't determine type from keywords alone.
 */
// Issue #6: Use single source of truth from merchantPatterns.ts
function isKnownServiceInBody(body: string): boolean {
  return getKnownServiceBodyPatterns().some(p => p.test(body));
}

function extractMerchantForAnalysis(body: string): string | null {
  const patterns = [
    /(?:towards|for|to|on)\s+([A-Z][A-Z\s]{2,30})(?:\s+(?:from|for|starting|frequency))/i,
    /(?:autopay|mandate).*?(?:towards|for|on)\s+([A-Z\s]+?)(?:\s+(?:for|from|starting))/i,
    /trf\s+to\s+([A-Z\s]+?)\s+(?:Refno|ref)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractAmountForAnalysis(body: string): number | null {
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    /debited\s+by\s+([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

function categorizeAmount(amount: number): 'micro' | 'small' | 'medium' | 'large' | 'very-large' {
  if (amount < 50) return 'micro';
  if (amount < 500) return 'small';
  if (amount < 2000) return 'medium';
  if (amount < 10000) return 'large';
  return 'very-large';
}

function categorizeSenderId(address: string): 'bank-mandate' | 'bank-upi' | 'service' | 'unknown' {
  // Issue #2: Fix sender ID regex — use word boundaries to prevent false matches
  // (e.g. 'man' was matching AMAZON, 'si' was matching MUSICIN)

  // Bank mandate/SI sender IDs — require full words
  if (/\bmandate\b|\bemandate\b|\bstanding\b|\bnach\b/i.test(address)) {
    return 'bank-mandate';
  }
  // "SI" only when preceded by a prefix separator (e.g., VM-SI, AX-SI)
  if (/[-.]si$/i.test(address) || /[-.]si[-]/i.test(address)) {
    return 'bank-mandate';
  }

  // Bank UPI sender IDs (common Indian bank sender patterns)
  if (/\bupi\b|vm-.*upi/i.test(address)) {
    return 'bank-upi';
  }

  // Common Indian bank sender IDs with various prefixes
  // Prefixes: VM-, AX-, JD-, AD-, DM-, BP-, TD-, JK-, CB-, HP-, BZ-, etc.
  if (/(?:vm|ax|jd|ad|dm|bp|td|jk|cb|hp|bz|md|bw|dd|mg|am|jm|tm|ai|bn|pb|qb)-?(?:hdfcbk|sbibnk|sbi|icicit|icici|axisbk|axis|kotakb|kotak|pnb|boibk|boi|canbnk|canara|uboi|unionbk|idbibk|idbi|fedbk|federal|yesbk|yes|indbk|indusind|rblbnk|rbl|dcbbk|dcb|barodbk|baroda|scbnk|sc|citi|hsbc|bob|ubi|dena|syndicate|vijaya|allahabad|andhra|corpbank|indian|obc|orient)/i.test(address)) {
    return 'bank-mandate';
  }

  // Numeric sender IDs (some banks use 6-digit numeric senders like 567678)
  if (/^\d{5,8}$/.test(address)) {
    return 'bank-mandate';
  }

  // Service sender IDs
  if (/paytm|google|amazon|netflix|spotify|phonepe|gpay|cred|swiggy|zomato|jio|airtel|flipkart/i.test(address)) {
    return 'service';
  }

  return 'unknown';
}

// Issue #6: Use single source of truth from merchantPatterns.ts
function isKnownService(merchantName: string): boolean {
  const lowerMerchant = merchantName.toLowerCase();

  // Special case: "Google Play" is a known service, but plain "Google" is not
  if (lowerMerchant === 'google play') {
    return true;
  }
  if (lowerMerchant === 'google') {
    return false;
  }

  const knownNames = getKnownServiceNames();
  return knownNames.some(service => lowerMerchant.includes(service));
}

function looksLikePersonName(merchantName: string): boolean {
  // Person names are typically:
  // 1. All caps with 2-3 words, OR mixed case with 2-3 capitalized words
  // 2. No special characters except spaces
  // 3. Each word is 3+ characters (but allow 1-2 char words like "K" for initials)

  // Check against known services FIRST - these are NOT person names
  if (isKnownService(merchantName)) {
    return false;
  }

  // Also check common all-caps service/company patterns
  const knownAllCapsServices = [
    'BESCOM', 'MSEB', 'BSES', 'CESC', 'TATA', 'HDFC', 'ICICI', 'SBI', 'AXIS',
    'KOTAK', 'PNB', 'BOI', 'CANARA', 'UNION', 'IDBI', 'FEDERAL', 'YES',
    'INDUSIND', 'RBL', 'DCB', 'BARODA', 'LIC', 'BSNL', 'MTNL',
    'NACH', 'NPCI', 'UPI', 'NEFT', 'RTGS', 'IMPS',
    'AWS', 'GCP', 'ACT', 'CRED', 'PAYTM', 'BHIM',
  ];

  const upperName = merchantName.toUpperCase();
  for (const service of knownAllCapsServices) {
    if (upperName.includes(service)) {
      return false;
    }
  }

  const words = merchantName.split(/\s+/);

  // 2-4 words is typical for person names
  if (words.length < 2 || words.length > 4) {
    return false;
  }

  // Should not contain numbers or special chars (except spaces and hyphens)
  if (/[0-9@#$%^&*()_+=\[\]{}|\\:;"'<>,.?\/]/.test(merchantName)) {
    return false;
  }

  // Check for person name patterns:
  // Pattern 1: ALL CAPS name (e.g., "RAHUL SHARMA") — most common in bank SMS
  if (merchantName === merchantName.toUpperCase()) {
    // Each word should be 2+ characters for all caps names
    const validWords = words.filter(w => w.length >= 2);
    if (validWords.length >= 2) {
      return true;
    }
  }

  // Pattern 2: Title Case name (e.g., "Rahul Sharma", "Priya K")
  // Check if each word starts with uppercase
  const isTitleCase = words.every(w => w.length > 0 && w[0] === w[0].toUpperCase());
  if (isTitleCase) {
    // Must have at least one word with 3+ characters
    const hasSubstantialWord = words.some(w => w.length >= 3);
    // Must not have any word that looks like a common service keyword
    // Issue #9: Expanded service words blocklist to prevent false positives
    const serviceWords = [
      'play', 'prime', 'music', 'fiber', 'plus', 'one', 'cloud', 'life', 'pay',
      'loan', 'card', 'gas', 'power', 'bill', 'mobile', 'net',
      'credits', 'balance', 'direct', 'time', 'view', 'finance', 'capital',
      'bank', 'insurance', 'mutual', 'fund', 'money', 'cash', 'digital',
      'express', 'services', 'solutions', 'tech', 'telecom', 'broadband',
    ];
    const hasServiceWord = words.some(w => serviceWords.includes(w.toLowerCase()));
    
    if (hasSubstantialWord && !hasServiceWord) {
      return true;
    }
  }

  return false;
}
