/**
 * Enhanced merchant detection patterns — SINGLE SOURCE OF TRUTH
 * All other files should import from here instead of maintaining their own lists.
 * Supports more services and better accuracy.
 */

export interface MerchantPattern {
  name: string;
  patterns: RegExp[];
  category: 'subscription' | 'utility' | 'telecom' | 'insurance' | 'loan' | 'investment' | 'other';
  isSubscription: boolean;
}

export const MERCHANT_PATTERNS: MerchantPattern[] = [
  // ═════════════════════════════════════════════════════════════════════
  // 📱 CONSUMER APP SUBSCRIPTIONS (isSubscription: true)
  // ═════════════════════════════════════════════════════════════════════

  // Video Streaming & OTT
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
    name: 'Apple One',
    patterns: [/apple\s*one/i],
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
  {
    name: 'Gaana',
    patterns: [/gaana\s*plus|\bgaana\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Canva',
    patterns: [/\bcanva\b|\bcanva\s*pty\s*ltd\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Wynk Music',
    patterns: [/\bwynk\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'JioSaavn',
    patterns: [/jio\s*saavn/i],
    category: 'subscription',
    isSubscription: true,
  },
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
    name: 'JioCinema',
    patterns: [/jio\s*cinema/i],
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
    name: 'Alt Balaji',
    patterns: [/alt\s*balaji/i],
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
    name: 'Sun NXT',
    patterns: [/sun\s*nxt/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Aha',
    patterns: [/\baha\s*(?:video|ott)?\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Crunchyroll',
    patterns: [/crunchyroll/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Lionsgate Play',
    patterns: [/lionsgate/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Discovery+',
    patterns: [/discovery\s*\+|discovery\s*plus/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Kuku FM',
    patterns: [/kuku\s*fm/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Pocket FM',
    patterns: [/pocket\s*fm/i],
    category: 'subscription',
    isSubscription: true,
  },

  // Cloud Storage, AI & Software Apps
  {
    name: 'ChatGPT',
    patterns: [/chatgpt|openai/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Claude',
    patterns: [/\bclaude\b|anthropic/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Midjourney',
    patterns: [/midjourney/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Perplexity',
    patterns: [/perplexity/i],
    category: 'subscription',
    isSubscription: true,
  },
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
  {
    name: 'Grammarly',
    patterns: [/grammarly/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'LinkedIn Premium',
    patterns: [/linkedin/i],
    category: 'subscription',
    isSubscription: true,
  },

  // News, Reading & Audiobooks
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
  {
    name: 'The Ken',
    patterns: [/the\s*ken\b/i],
    category: 'subscription',
    isSubscription: true,
  },

  // Fitness, Health & Lifestyle
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
  {
    name: 'Strava',
    patterns: [/\bstrava\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Duolingo',
    patterns: [/duolingo/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Headspace',
    patterns: [/headspace/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Calm',
    patterns: [/\bcalm\s*(?:app|subscription)?\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Tinder',
    patterns: [/\btinder\b/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Bumble',
    patterns: [/\bbumble\b/i],
    category: 'subscription',
    isSubscription: true,
  },

  // Food & Delivery App Memberships
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
  {
    name: 'Zepto Pass',
    patterns: [/zepto\s*pass/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Times Prime',
    patterns: [/times\s*prime/i],
    category: 'subscription',
    isSubscription: true,
  },

  // Gaming Subscriptions
  {
    name: 'PlayStation Plus',
    patterns: [/playstation|psn\s*plus|ps\s*plus/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Xbox Game Pass',
    patterns: [/xbox|game\s*pass/i],
    category: 'subscription',
    isSubscription: true,
  },
  {
    name: 'Discord Nitro',
    patterns: [/discord\s*nitro|discord/i],
    category: 'subscription',
    isSubscription: true,
  },

  // ═════════════════════════════════════════════════════════════════════
  // 🔄 LOANS / EMIs / NBFCs / AUTOPAY (isSubscription: false, category: 'loan')
  // ═════════════════════════════════════════════════════════════════════
  {
    name: 'Moneyview',
    patterns: [/money\s*view|moneyview/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'CreditSea',
    patterns: [/credit\s*sea|creditsea/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Branch',
    patterns: [/\bbranch\b/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Navi',
    patterns: [/\bnavi\b/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'KreditBee',
    patterns: [/kredit\s*bee|kreditbee|krazybee/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'True Credits',
    patterns: [/true\s*credits|true\s*balance/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Kissht',
    patterns: [/\bkissht\b|onemi/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Ring',
    patterns: [/ring\s*pay|ideafoster|\bring\b.*(?:pay|finance|credit)/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Paysense',
    patterns: [/paysense/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Fibe',
    patterns: [/\bfibe\b|early\s*salary/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'mPokket',
    patterns: [/mpokket|m-pokket/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'CASHe',
    patterns: [/\bcashe\b/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Stashfin',
    patterns: [/stashfin/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Pocketly',
    patterns: [/pocketly/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'PayMe India',
    patterns: [/payme\s*india|payme/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Slice',
    patterns: [/\bslice\b.*(?:pay|card|account|loan|credit)|sliceit/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Uni Cards',
    patterns: [/\buni\b.*(?:card|cards|pay|credit)/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Bajaj Finserv',
    patterns: [/bajaj\s*finserv|bajaj\s*finance|bajaj/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Tata Capital',
    patterns: [/tata\s*capital/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Home Credit',
    patterns: [/home\s*credit/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'L&T Finance',
    patterns: [/l&t\s*finance|ltfin/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Pocket Mitra',
    patterns: [/pocket\s*mitra|pocketmitra/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'CreditSea',
    patterns: [/creditsea|credit\s*sea/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'TrustPaisa',
    patterns: [/trustpaisa|trust\s*paisa/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'RupeeRedee',
    patterns: [/rupeeredee|rupee\s*redee/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'FatakPay',
    patterns: [/fatakpay|fatakpaydigitalprivatelimited/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Suryoday Small Finance Bank',
    patterns: [/suryoday/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Paytm Postpaid',
    patterns: [/paytm\s*postpaid/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'FlexiLoans',
    patterns: [/flexiloans|flexi\s*loans/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Chinmay Finlease',
    patterns: [/chinmay/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Chhotaria Securities',
    patterns: [/chhotaria\s*securi/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Command Code',
    patterns: [/command\s*code/i],
    category: 'other',
    isSubscription: false,
  },
  {
    name: 'Sonu Marketing',
    patterns: [/sonu\s*marketing/i],
    category: 'other',
    isSubscription: false,
  },
  {
    name: 'Star Health Insurance',
    patterns: [/star\s*health/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'Indian Railway',
    patterns: [/indian\s*railway|rwallet/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'IR-CRIS',
    patterns: [/ir-cris|ir\s*cris/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'Garuda Filling Station',
    patterns: [/garuda\s*filling/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'SVS Online Services',
    patterns: [/svs\s*online/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'Muthoot Finance',
    patterns: [/muthoot/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Manappuram',
    patterns: [/manappuram/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Piramal Finance',
    patterns: [/piramal/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Aditya Birla Finance',
    patterns: [/aditya\s*birla\s*capital|abfl/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Cholamandalam',
    patterns: [/chola|cholamandalam/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Shriram Finance',
    patterns: [/shriram/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Hero Fincorp',
    patterns: [/hero\s*fincorp/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'TVS Credit',
    patterns: [/tvs\s*credit/i],
    category: 'loan',
    isSubscription: false,
  },
  {
    name: 'Dhani',
    patterns: [/\bdhani\b/i],
    category: 'loan',
    isSubscription: false,
  },
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

  // ═════════════════════════════════════════════════════════════════════
  // ⚡ UTILITIES & BILLS (isSubscription: false, category: 'utility')
  // ═════════════════════════════════════════════════════════════════════
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
    name: 'Adani Electricity',
    patterns: [/adani\s*(?:electricity|power|gas)/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'Indane Gas',
    patterns: [/indane\s*gas|indane/i],
    category: 'utility',
    isSubscription: false,
  },
  {
    name: 'Mahanagar Gas',
    patterns: [/mahanagar\s*gas|mgl/i],
    category: 'utility',
    isSubscription: false,
  },

  // ═════════════════════════════════════════════════════════════════════
  // 📶 TELECOM & BROADBAND (isSubscription: false, category: 'telecom')
  // ═════════════════════════════════════════════════════════════════════
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
  {
    name: 'Tata Play',
    patterns: [/tata\s*play|tata\s*sky/i],
    category: 'telecom',
    isSubscription: false,
  },

  // ═════════════════════════════════════════════════════════════════════
  // 🛡️ INSURANCE (isSubscription: false, category: 'insurance')
  // ═════════════════════════════════════════════════════════════════════
  {
    name: 'LIC',
    patterns: [/\blic\b.*(?:insurance|premium|policy)/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'HDFC Life',
    patterns: [/hdfc\s*life|hdfc\s*ergo/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'ICICI Prudential',
    patterns: [/icici\s*prudential|icici\s*pru|icici\s*lombard/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'SBI Life',
    patterns: [/sbi\s*life/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'Max Life',
    patterns: [/max\s*life/i],
    category: 'insurance',
    isSubscription: false,
  },
  {
    name: 'Star Health',
    patterns: [/star\s*health/i],
    category: 'insurance',
    isSubscription: false,
  },

  // ═════════════════════════════════════════════════════════════════════
  // 📈 INVESTMENTS & SIPS (isSubscription: false, category: 'investment')
  // ═════════════════════════════════════════════════════════════════════
  {
    name: 'Zerodha',
    patterns: [/\bzerodha\b/i],
    category: 'investment',
    isSubscription: false,
  },
  {
    name: 'Groww',
    patterns: [/\bgroww\b/i],
    category: 'investment',
    isSubscription: false,
  },
  {
    name: 'Upstox',
    patterns: [/\bupstox\b/i],
    category: 'investment',
    isSubscription: false,
  },
  {
    name: 'Mutual Fund SIP',
    patterns: [/mutual\s*fund|sip\s*(?:debit|payment|mandate)/i],
    category: 'investment',
    isSubscription: false,
  },

  // ═════════════════════════════════════════════════════════════════════
  // 🏢 CLOUD / BUSINESS (isSubscription: false, category: 'other')
  // ═════════════════════════════════════════════════════════════════════
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
  if (!text) return null;
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
 * Check if merchant is a known digital app subscription service (strictly consumer apps)
 */
export function isKnownSubscriptionService(merchantName: string, smsBody?: string): boolean {
  if (!merchantName) return false;
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

// ─── Derived helpers ─────────────────────────────────────────────────────────

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

let _knownNamesCache: string[] | null = null;

export function getKnownServiceNames(): string[] {
  if (_knownNamesCache) return _knownNamesCache;

  const names = new Set<string>();
  for (const mp of MERCHANT_PATTERNS) {
    names.add(mp.name.toLowerCase());
    for (const word of mp.name.toLowerCase().split(/\s+/)) {
      if (word.length >= 3) names.add(word);
    }
  }
  _knownNamesCache = Array.from(names);
  return _knownNamesCache;
}

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
