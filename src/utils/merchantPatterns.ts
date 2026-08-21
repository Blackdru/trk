/**
 * Enhanced merchant detection patterns — SINGLE SOURCE OF TRUTH
 * All other files should import from here instead of maintaining their own lists.
 * Supports more services and better accuracy.
 */

export interface MerchantPattern {
  name: string;
  patterns: RegExp[];
  category: 'subscription' | 'utility' | 'telecom' | 'insurance' | 'loan' | 'other';
  isSubscription: boolean;
}

export const MERCHANT_PATTERNS: MerchantPattern[] = [
  // Streaming Services
  {
    name: 'Netflix',
    patterns: [/\bnetflix\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Spotify',
    patterns: [/\bspotify\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Amazon Prime',
    patterns: [/amazon\s*prime|prime\s*video/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Disney+ Hotstar',
    patterns: [/disney.*hotstar|hotstar.*disney|disney\+|hotstar/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'JioHotstar',
    patterns: [/jio.*hotstar|jiohotstar/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'YouTube Premium',
    patterns: [/youtube\s*premium|youtube\s*music/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Apple Music',
    patterns: [/apple\s*music/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Apple TV+',
    patterns: [/apple\s*tv/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Google Play',
    patterns: [/google\s*play/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Google One',
    patterns: [/google\s*one/i],
    category: 'subscription',
    isSubscription: true,
  },
  // Music
  {
    name: 'Gaana',
    patterns: [/gaana\s*plus|\bgaana\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Wynk Music',
    patterns: [/\bwynk\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  
  // Indian OTT Platforms
  {
    name: 'Zee5',
    patterns: [/\bzee\s*5|zee5\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'SonyLIV',
    patterns: [/sony\s*liv|sonyliv/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Voot',
    patterns: [/\bvoot\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'MX Player',
    patterns: [/mx\s*player/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Eros Now',
    patterns: [/eros\s*now/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Story TV',
    patterns: [/story\s*tv/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Colors',
    patterns: [/\bcolors\b.*(?:tv|channel|subscription)/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Star Plus',
    patterns: [/star\s*plus/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Sun NXT',
    patterns: [/sun\s*nxt/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Hoichoi',
    patterns: [/hoichoi/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Alt Balaji',
    patterns: [/alt\s*balaji/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'JioCinema',
    patterns: [/jio\s*cinema/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'JioSaavn',
    patterns: [/jio\s*saavn/i],
    category: 'subscription',
    isSubscription: true,
  },
  
  // Cloud Storage & Software
  {
    name: 'Dropbox',
    patterns: [/\bdropbox\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Microsoft 365',
    patterns: [/microsoft\s*365|office\s*365/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Adobe Creative Cloud',
    patterns: [/adobe/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Canva Pro',
    patterns: [/\bcanva\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'GitHub',
    patterns: [/\bgithub\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Notion',
    patterns: [/\bnotion\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'iCloud',
    patterns: [/\bicloud\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  
  // News & Reading
  {
    name: 'Kindle Unlimited',
    patterns: [/kindle\s*unlimited/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Audible',
    patterns: [/\baudible\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Scribd',
    patterns: [/\bscribd\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Medium',
    patterns: [/\bmedium\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  
  // Fitness & Health
  {
    name: 'Cult.fit',
    patterns: [/cult\.?fit|cultfit/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'HealthifyMe',
    patterns: [/healthify\s*me|healthifyme/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'FitPass',
    patterns: [/\bfitpass\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  
  // Food & Transport
  {
    name: 'Swiggy One',
    patterns: [/swiggy\s*one/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Zomato Gold',
    patterns: [/zomato\s*gold/i],
    category: 'subscription',
    isSubscription: true,
  },
  
  // Utilities (NOT subscriptions)
  {
    name: 'BESCOM',
    patterns: [/\bbescom\b/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'Tata Power',
    patterns: [/tata\s*power/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'Indane Gas',
    patterns: [/indane\s*gas|indane/i],
    category: 'utility',
    isSubscription: false,
  },
  
  // Telecom (NOT subscriptions)
  {
    name: 'Jio Fiber',
    patterns: [/jio\s*fiber/i],
    category: 'telecom',
    isSubscription: false,
  },
  {
    name: 'Airtel Fiber',
    patterns: [/airtel\s*fiber/i],
    category: 'telecom',
    isSubscription: false,
  },
  {
    name: 'ACT Fibernet',
    patterns: [/act\s*fibernet|act\s*fiber/i],
    category: 'telecom',
    isSubscription: false,
  },
  {
    name: 'Airtel Postpaid',
    patterns: [/airtel\s*postpaid/i],
    category: 'telecom',
    isSubscription: false,
  },
  {
    name: 'Vodafone Idea',
    patterns: [/vodafone\s*idea|vi\s*postpaid/i],
    category: 'telecom',
    isSubscription: false,
  },
  
  // Insurance (NOT subscriptions)
  {
    name: 'LIC',
    patterns: [/\blic\b.*(?:insurance|premium|policy)/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'HDFC Life',
    patterns: [/hdfc\s*life/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'ICICI Prudential',
    patterns: [/icici\s*prudential/i],
    category: 'insurance',
    isSubscription: false,
  },
  
  // Loans (NOT subscriptions)
  {
    name: 'Home Loan',
    patterns: [/home\s*loan/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Car Loan',
    patterns: [/car\s*loan|vehicle\s*loan/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Personal Loan',
    patterns: [/personal\s*loan/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Credit Card',
    patterns: [/credit\s*card/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'L&T Finance',
    patterns: [/l&t\s*finance|ltfin/i],
    category: 'loan',
    isSubscription: false,
  },
  
  // Business Services (NOT subscriptions for consumer app)
  {
    name: 'AWS India',
    patterns: [/\baws\b|aws\s*india|amazon\s*web\s*services/i],
    category: 'other',
    isSubscription: false,
  },
  {
    name: 'Google Cloud',
    patterns: [/google\s*cloud|gcp/i],
    category: 'other',
    isSubscription: false,
  },
];

/**
 * Find matching merchant pattern
 */
export function findMerchantPattern(text: string): MerchantPattern | null {
  for (const pattern of MERCHANT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(text)) {
        return pattern;
      }
    }
  }
  
  return null;
}

/**
 * Check if merchant is a known subscription service
 */
export function isKnownSubscriptionService(merchantName: string, smsBody?: string): boolean {
  const pattern = findMerchantPattern(merchantName);
  
  if (pattern) {
    return pattern.isSubscription;
  }
  
  // Also check SMS body if provided
  if (smsBody) {
    const bodyPattern = findMerchantPattern(smsBody);
    if (bodyPattern) {
      return bodyPattern.isSubscription;
    }
  }
  
  return false;
}

/**
 * Get standardized merchant name
 */
export function getStandardizedMerchantName(merchantName: string, smsBody?: string): string {
  const pattern = findMerchantPattern(merchantName) || (smsBody ? findMerchantPattern(smsBody) : null);
  
  return pattern ? pattern.name : merchantName;
}

// ─── Derived helpers (single source of truth for all other files) ────────────

/**
 * Build a special-services map for smsParser's extractMerchantName.
 * Returns an array of { pattern, name } derived from MERCHANT_PATTERNS.
 */
let _specialServiceCache: Array<{ pattern: RegExp; name: string }> | null = null;

export function getSpecialServiceMap(): Array<{ pattern: RegExp; name: string }> {
  if (_specialServiceCache) return _specialServiceCache;

  _specialServiceCache = [];
  for (const mp of MERCHANT_PATTERNS) {
    for (const regex of mp.patterns) {
      _specialServiceCache.push({ pattern: regex, name: mp.name });
    }
  }
  return _specialServiceCache;
}

/**
 * Build the set of lowercase service names for smsClassifier's isKnownService.
 * Includes component words (e.g. "amazon" from "Amazon Prime") for substring matching.
 */
let _knownNamesCache: string[] | null = null;

export function getKnownServiceNames(): string[] {
  if (_knownNamesCache) return _knownNamesCache;

  const names = new Set<string>();
  for (const mp of MERCHANT_PATTERNS) {
    names.add(mp.name.toLowerCase());
    // Add individual lowercase words ≥3 chars for substring matching
    for (const word of mp.name.toLowerCase().split(/\s+/)) {
      if (word.length >= 3) names.add(word);
    }
  }
  _knownNamesCache = Array.from(names);
  return _knownNamesCache;
}

/**
 * Build regex list for isKnownServiceInBody (smsClassifier catch-all).
 * Derived from subscription-type MERCHANT_PATTERNS only.
 */
let _bodyPatternsCache: RegExp[] | null = null;

export function getKnownServiceBodyPatterns(): RegExp[] {
  if (_bodyPatternsCache) return _bodyPatternsCache;

  _bodyPatternsCache = [];
  for (const mp of MERCHANT_PATTERNS) {
    if (mp.isSubscription) {
      for (const regex of mp.patterns) {
        _bodyPatternsCache.push(regex);
      }
    }
  }
  return _bodyPatternsCache;
}
