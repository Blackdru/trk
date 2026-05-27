import type { RawSms } from '../types';

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
  const hasAutopayKeyword = /autopay|auto-pay|auto pay|automatic payment|aspresented.*autopay/i.test(body);
  const hasMandateKeyword = /mandate|e-mandate|emandate|si mandate|upi-mandate/i.test(body);
  const hasSubscriptionKeyword = /subscription|subscribe/i.test(body);
  const hasRecurringKeyword = /recurring|recur/i.test(body);
  const hasEmiKeyword = /\bemi\b/i.test(body);
  const hasStandingInstructionKeyword = /standing instruction|si\b/i.test(body);
  const hasNachKeyword = /\bnach\b/i.test(body);
  
  // Temporal features
  const hasMonthlyKeyword = /monthly|per month|\/month/i.test(body);
  const hasYearlyKeyword = /yearly|annual|per year|\/year/i.test(body);
  const hasQuarterlyKeyword = /quarterly|per quarter/i.test(body);
  const hasWeeklyKeyword = /weekly|per week/i.test(body);
  const hasDurationDays = /\d+\s*days/i.test(body);
  const hasDueDateKeyword = /due\s+(?:date|on)|is\s+due|emi\s+is\s+due|payment\s+is\s+due|next\s+(?:payment|emi|bill)\s+(?:is\s+)?due/i.test(body);
  const hasScheduledKeyword = /scheduled\s+on|scheduled\s+for|debit\s+of.*scheduled|debit\s+is\s+scheduled/i.test(body);
  
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
  const hasUpiId = /@[a-z]+/i.test(body);
  const hasAccountNumber = /a\/c|account|ac\s+no/i.test(body);
  
  // Message structure
  const textLength = body.length < 100 ? 'short' : body.length < 250 ? 'medium' : 'long';
  const hasSuccessIndicator = /success|successfully|active|activated|enabled|setup|set up|created|congratulations/i.test(body);
  const hasSetupIndicator = /setup|set up|created|enabled|activated|congratulations/i.test(body);
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
  
  // Rule 2.5: Reject loan-related transactions (EMI payments and disbursements)
  // EMI payment confirmations: lenders confirming they received payment
  if (features.hasEmiKeyword && body && /(?:emi|loan).*(?:received|paid|credited|successful)/i.test(body)) {
    return {
      type: 'p2p-transfer',
      confidence: 0.95,
      reason: 'Loan EMI payment confirmation (not a subscription)'
    };
  }
  
  // Loan disbursement: when loan amount is credited to your account
  if (body && /loan.*(?:disburs|credit|sanction|approv).*(?:credited|transferred|deposited)/i.test(body)) {
    return {
      type: 'p2p-transfer',
      confidence: 0.95,
      reason: 'Loan disbursement (not a subscription)'
    };
  }
  
  // Loan disbursement alternative patterns
  if (body && /(?:personal|home|car|education|business)?\s*loan.*(?:amount|of\s+rs)/i.test(body) && /credited|disbursed|transferred|deposited/i.test(body)) {
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
  if (body && /next\s+(?:payment|emi|bill|subscription|autopay|mandate)/i.test(body)) {
    return {
      type: 'autopay',
      confidence: 0.83,
      reason: 'Next payment reminder'
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
  if ((features.hasAutopayKeyword || features.hasMandateKeyword) && /executed|processed/i.test(body)) {
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
  
  // Default: Unknown
  return {
    type: 'unknown',
    confidence: 0.50,
    reason: 'No clear classification pattern'
  };
}

// Helper functions

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
  const lowerAddress = address.toLowerCase();
  
  // Bank mandate/SI sender IDs
  if (/man|mandate|si|standing/i.test(address)) {
    return 'bank-mandate';
  }
  
  // Bank UPI sender IDs
  if (/upi|vm-.*upi/i.test(address)) {
    return 'bank-upi';
  }
  
  // Service sender IDs
  if (/paytm|google|amazon|netflix|spotify/i.test(address)) {
    return 'service';
  }
  
  return 'unknown';
}

function isKnownService(merchantName: string): boolean {
  const knownServices = [
    // Streaming & Entertainment
    'netflix', 'spotify', 'amazon', 'prime', 'hotstar', 'disney',
    'youtube', 'apple', 'jiohotstar', 'jio hotstar',
    'zee5', 'sonyliv', 'voot', 'mx player', 'eros now',
    'story tv', 'colors', 'star plus', 'sun nxt', 'hoichoi',
    
    // Cloud & Software (consumer-focused only)
    'microsoft', 'adobe', 'dropbox', 'github',
    'google play', 'play store', 'app store',
    
    // Food & Transport
    'swiggy', 'zomato', 'uber', 'ola', 'rapido',
    
    // Telecom & Internet
    'jio', 'airtel', 'vodafone', 'bsnl', 'act', 'vi',
    
    // Financial
    'lic', 'hdfc', 'icici', 'sbi', 'axis', 'kotak',
    'paytm', 'phonepe', 'gpay',
    
    // Utilities
    'indane', 'bharat gas', 'hp gas', 'bescom', 'mseb'
  ];
  
  const lowerMerchant = merchantName.toLowerCase();
  
  // Special case: "Google Play" is a known service, but plain "Google" is not
  if (lowerMerchant === 'google play') {
    return true;
  }
  
  if (lowerMerchant === 'google') {
    return false;
  }
  
  return knownServices.some(service => lowerMerchant.includes(service));
}

function looksLikePersonName(merchantName: string): boolean {
  // Person names are typically:
  // 1. All caps with 2-3 words
  // 2. No special characters except spaces
  // 3. Each word is 3+ characters
  
  if (merchantName !== merchantName.toUpperCase()) {
    return false;
  }
  
  const words = merchantName.split(/\s+/);
  
  // 2-4 words is typical for person names
  if (words.length < 2 || words.length > 4) {
    return false;
  }
  
  // Each word should be 3+ characters
  if (words.some(word => word.length < 3)) {
    return false;
  }
  
  // Should not contain numbers or special chars (except spaces)
  if (/[0-9@#$%^&*()_+=\[\]{}|\\:;"'<>,.?\/]/.test(merchantName)) {
    return false;
  }
  
  return true;
}
