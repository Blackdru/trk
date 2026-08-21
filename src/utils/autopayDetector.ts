import type { ParsedTransaction, AutopayTransaction, AutopayStatus } from '../types';
import { findMerchantPattern } from './merchantPatterns';

/**
 * Extract all autopay/mandate transactions from parsed SMS
 * These are automatic payments that may or may not be subscriptions
 */
export function extractAutopayTransactions(transactions: ParsedTransaction[]): AutopayTransaction[] {
  const autopayTxns: AutopayTransaction[] = [];

  for (const txn of transactions) {
    // Only process Autopay and Mandate transactions
    if (txn.paymentType === 'Autopay' || txn.paymentType === 'Mandate') {
      const category = categorizeAutopay(txn);
      const status = determineStatus(txn);

      autopayTxns.push({
        id: txn.id,
        merchantName: txn.merchantName,
        amount: txn.amount,
        date: txn.date,
        paymentType: txn.paymentType,
        status,
        rawSms: txn.rawSms || '',
        category,
      });

      console.log(`[AutopayDetector] Found ${txn.paymentType}: ${txn.merchantName} - ₹${txn.amount} (${category})`);
    }
  }

  console.log(`[AutopayDetector] Extracted ${autopayTxns.length} autopay transactions`);
  return autopayTxns;
}

/**
 * Filter autopay transactions to exclude app subscriptions
 * App subscriptions should only appear in the Subscriptions tab
 */
export function filterNonSubscriptionAutopay(transactions: AutopayTransaction[]): AutopayTransaction[] {
  return transactions.filter(txn => txn.category !== 'subscription');
}

/**
 * Categorize autopay transaction based on merchant name and SMS content
 */
function categorizeAutopay(transaction: ParsedTransaction): string {
  const merchantLower = transaction.merchantName.toLowerCase();
  const bodyLower = transaction.rawSms?.toLowerCase() || '';

  // Check defined merchant patterns first (single source of truth for categories like telecom, utility, loan, subscription)
  const pattern = findMerchantPattern(transaction.merchantName) || (transaction.rawSms ? findMerchantPattern(transaction.rawSms) : null);
  if (pattern) {
    // Exception: plain Google in mandate/autopay context
    if (merchantLower === 'google' || (merchantLower.includes('google') && !merchantLower.includes('play'))) {
      if (transaction.paymentType === 'Autopay' || transaction.paymentType === 'Mandate') {
        return 'subscription';
      }
    }
    return pattern.category;
  }

  // Special case: Google Play is a subscription, but plain "Google" is not (unless in mandate context)
  if (merchantLower.includes('google play') || bodyLower.includes('google play')) {
    return 'subscription';
  }
  
  // If it's just "Google" (not Google Play), treat as subscription if it's a mandate/autopay
  // because Google mandates are typically for Google Play/One subscriptions
  if (merchantLower === 'google' || (merchantLower.includes('google') && !merchantLower.includes('play'))) {
    if (transaction.paymentType === 'Autopay' || transaction.paymentType === 'Mandate') {
      return 'subscription';
    }
    return 'other';
  }

  // Loans (EMI) - check FIRST to catch True Credits, Moneyview, L&T Finance, etc.
  // IMPORTANT: Use word-boundary matching to avoid 'emi' matching inside 'premium'
  const loanKeywordPatterns = [
    /\bloan\b/i, /\bemi\b/i, /\bhome\s+loan\b/i, /\bcar\s+loan\b/i,
    /\bpersonal\s+loan\b/i, /\bcredit\s+card\b/i,
    /\btrue\s+credits\b/i, /\btrue\s+balance\b/i, /\bmoneyview\b/i,
    /\bmoney\s+view\b/i, /\bbajaj\s+finserv\b/i, /\btata\s+capital\b/i,
    /\bfullerton\b/i, /\blending\b/i, /\bfintech\b/i, /\bl&t\s*finance\b/i, /\bltfin\b/i,
  ];
  
  // Check merchant name first (more reliable)
  for (const pattern of loanKeywordPatterns) {
    if (pattern.test(merchantLower)) {
      return 'loan';
    }
  }
  // Then check body, but only with word-boundary patterns to avoid false positives
  for (const pattern of loanKeywordPatterns) {
    if (pattern.test(bodyLower)) {
      return 'loan';
    }
  }

  // Subscription services (streaming, cloud storage, software, etc.)
  // CHECK THIS BEFORE INSURANCE to avoid false positives with "premium" keyword
  const subscriptionKeywords = [
    // Streaming services
    'netflix', 'spotify', 'amazon prime', 'prime video', 'hotstar', 'disney',
    'youtube premium', 'youtube music', 'youtube', 'apple music', 'apple tv', 'apple one',
    'zee5', 'sonyliv', 'voot', 'mx player', 'eros now', 'alt balaji',
    'jio cinema', 'jio saavn', 'gaana', 'wynk', 'jiohotstar', 'jio hotstar',
    'story tv', 'colors', 'star plus', 'sun nxt', 'hoichoi',
    
    // Cloud & Software (consumer-focused only)
    'google one', 'google workspace', 'icloud', 'dropbox', 'onedrive',
    'microsoft 365', 'office 365', 'adobe', 'canva', 'notion',
    
    // Gaming & Entertainment
    'playstation', 'xbox', 'nintendo', 'steam', 'epic games',
    
    // News & Magazines
    'kindle unlimited', 'audible', 'scribd', 'medium',
    
    // Fitness & Health
    'cult.fit', 'healthifyme', 'fitpass',
    
    // App stores
    'app store', 'play store',
    
    // General keywords
    'subscription', 'membership'
  ];
  
  for (const keyword of subscriptionKeywords) {
    if (merchantLower.includes(keyword) || bodyLower.includes(keyword)) {
      return 'subscription';
    }
  }

  // Insurance (check AFTER subscriptions to avoid false positives)
  const insuranceKeywords = [
    'insurance', 'lic', 'hdfc life', 'icici prudential',
    'max life', 'sbi life', 'bajaj allianz', 'policy', 'premium'
  ];
  
  for (const keyword of insuranceKeywords) {
    if (merchantLower.includes(keyword) || bodyLower.includes(keyword)) {
      return 'insurance';
    }
  }

  // Utilities (electricity, water, gas, internet)
  const utilityKeywords = [
    'electricity', 'power', 'bescom', 'mseb', 'tata power',
    'water', 'gas', 'lpg', 'indane', 'bharat gas',
    'internet', 'broadband', 'wifi', 'jio fiber', 'airtel fiber',
    'bsnl', 'act fibernet'
  ];
  
  for (const keyword of utilityKeywords) {
    if (merchantLower.includes(keyword) || bodyLower.includes(keyword)) {
      return 'utility';
    }
  }

  // Telecom
  const telecomKeywords = [
    'jio', 'airtel', 'vodafone', 'vi', 'bsnl',
    'mobile', 'recharge', 'postpaid'
  ];
  
  for (const keyword of telecomKeywords) {
    if (merchantLower.includes(keyword) || bodyLower.includes(keyword)) {
      return 'telecom';
    }
  }

  // Investment/SIP
  const investmentKeywords = [
    'sip', 'mutual fund', 'zerodha', 'groww', 'upstox',
    'investment', 'systematic'
  ];
  
  for (const keyword of investmentKeywords) {
    if (merchantLower.includes(keyword) || bodyLower.includes(keyword)) {
      return 'investment';
    }
  }

  // Business/Cloud Services (AWS, Azure, etc.)
  const businessKeywords = [
    'aws', 'azure', 'google cloud', 'digitalocean', 'heroku',
    'cloudflare', 'vercel', 'netlify'
  ];
  
  for (const keyword of businessKeywords) {
    if (merchantLower.includes(keyword) || bodyLower.includes(keyword)) {
      return 'other';
    }
  }

  return 'other';
}

/**
 * Determine if autopay is active, inactive, or unknown
 */
function determineStatus(transaction: ParsedTransaction): AutopayStatus {
  const bodyLower = transaction.rawSms?.toLowerCase() || '';

  // Check for failure keywords
  const failureKeywords = [
    'failed', 'declined', 'rejected', 'insufficient',
    'cancelled', 'stopped', 'deactivated', 'disabled'
  ];

  for (const keyword of failureKeywords) {
    if (bodyLower.includes(keyword)) {
      return 'inactive';
    }
  }

  // Check for success keywords
  const successKeywords = [
    'executed', 'successful', 'completed', 'debited',
    'paid', 'processed', 'created', 'setup', 'set up',
    'activated', 'enabled', 'registered', 'mandate'
  ];

  for (const keyword of successKeywords) {
    if (bodyLower.includes(keyword)) {
      return 'active';
    }
  }

  return 'unknown';
}

/**
 * Group autopay transactions by merchant
 */
export function groupAutopayByMerchant(transactions: AutopayTransaction[]): Record<string, AutopayTransaction[]> {
  const grouped: Record<string, AutopayTransaction[]> = {};

  for (const txn of transactions) {
    const key = txn.merchantName.toLowerCase().trim();
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(txn);
  }

  return grouped;
}

/**
 * Get autopay statistics
 */
export interface AutopayStats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
  totalAmount: number;
  lastMonth: number;
}

export function getAutopayStats(transactions: AutopayTransaction[]): AutopayStats {
  const now = Date.now();
  const lastMonthStart = now - (30 * 24 * 60 * 60 * 1000);

  const stats: AutopayStats = {
    total: transactions.length,
    active: transactions.filter(t => t.status === 'active').length,
    byCategory: {},
    totalAmount: 0,
    lastMonth: 0,
  };

  for (const txn of transactions) {
    // Count by category
    const category = txn.category || 'other';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    // Total amount
    stats.totalAmount += txn.amount;

    // Last month count
    if (txn.date >= lastMonthStart) {
      stats.lastMonth++;
    }
  }

  return stats;
}

/**
 * Get category icon name
 */
export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    subscription: 'play-circle',
    utility: 'zap',
    insurance: 'shield',
    loan: 'credit-card',
    telecom: 'phone',
    investment: 'trending-up',
    other: 'dollar-sign',
  };

  return iconMap[category] || 'dollar-sign';
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    subscription: '#6366D6',
    utility: '#E08A1E',
    insurance: '#4F7FE8',
    loan: '#E5484D',
    telecom: '#0E9AA7',
    investment: '#10A37A',
    other: '#6B7280',
  };

  return colorMap[category] || '#6B7280';
}
