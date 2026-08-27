import type { RawSms, PassbookTransaction, TransactionType } from '../types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Known Bank / Financial Senders Mapping
 */
const BANK_SENDER_PATTERNS: Record<string, string> = {
  // Public Sector Banks (India)
  SBIN: 'State Bank of India',
  SBI: 'State Bank of India',
  SBIUPI: 'State Bank of India',
  SBIINB: 'State Bank of India',
  SBICRD: 'SBI Card',
  PNB: 'Punjab National Bank',
  BOB: 'Bank of Baroda',
  BARODA: 'Bank of Baroda',
  CANARA: 'Canara Bank',
  CANBNK: 'Canara Bank',
  UNION: 'Union Bank of India',
  UBIN: 'Union Bank of India',
  BOI: 'Bank of India',
  BKID: 'Bank of India',
  CENTRAL: 'Central Bank of India',
  CBIN: 'Central Bank of India',
  IOB: 'Indian Overseas Bank',
  INDIANB: 'Indian Bank',
  MAHABANK: 'Bank of Maharashtra',
  BOM: 'Bank of Maharashtra',
  UCO: 'UCO Bank',
  PSB: 'Punjab & Sind Bank',

  // Private Sector Banks (India)
  HDFC: 'HDFC Bank',
  HDFCBK: 'HDFC Bank',
  ICICI: 'ICICI Bank',
  ICICIB: 'ICICI Bank',
  AXIS: 'Axis Bank',
  AXISBK: 'Axis Bank',
  UTIB: 'Axis Bank',
  KOTAK: 'Kotak Bank',
  KOTAKB: 'Kotak Bank',
  INDUS: 'IndusInd Bank',
  INDUSB: 'IndusInd Bank',
  YESB: 'Yes Bank',
  YESBNK: 'Yes Bank',
  IDFC: 'IDFC FIRST Bank',
  IDFCFB: 'IDFC FIRST Bank',
  FEDERAL: 'Federal Bank',
  FEDBNK: 'Federal Bank',
  RBL: 'RBL Bank',
  RBLBNK: 'RBL Bank',
  BANDHAN: 'Bandhan Bank',
  BNDHAN: 'Bandhan Bank',
  SIB: 'South Indian Bank',
  CUB: 'City Union Bank',
  KVB: 'Karur Vysya Bank',
  KARN: 'Karnataka Bank',
  JKBANK: 'Jammu & Kashmir Bank',

  // Small Finance & Payments Banks (India)
  AUBANK: 'AU Small Finance Bank',
  AUBL: 'AU Small Finance Bank',
  EQUITAS: 'Equitas Small Finance Bank',
  EQSFB: 'Equitas Small Finance Bank',
  UJJIVAN: 'Ujjivan Small Finance Bank',
  JANA: 'Jana Small Finance Bank',
  ESAF: 'ESAF Small Finance Bank',
  SURYODAY: 'Suryoday Small Finance Bank',
  SURSFB: 'Suryoday Small Finance Bank',
  PAYTM: 'Paytm Payments Bank',
  AIRTEL: 'Airtel Payments Bank',
  FINO: 'Fino Payments Bank',
  IPPB: 'India Post Payments Bank',
  JIO: 'Jio Payments Bank',

  // United States & Global Banks
  CHASE: 'Chase',
  JPMORGAN: 'JPMorgan Chase',
  BOFA: 'Bank of America',
  BANKOFAMERICA: 'Bank of America',
  WELLSFARGO: 'Wells Fargo',
  WFARGO: 'Wells Fargo',
  CAPITALONE: 'Capital One',
  CITI: 'Citibank',
  CITIBANK: 'Citibank',
  USBANK: 'US Bank',
  PNC: 'PNC Bank',
  DISCOVER: 'Discover',
  AMEX: 'American Express',
  CHIME: 'Chime',
  VENMO: 'Venmo',
  ZELLE: 'Zelle',
  PAYPAL: 'PayPal',
  CASHAPP: 'Cash App',
  APPLEPAY: 'Apple Pay',

  // United Kingdom & Europe
  BARCLAYS: 'Barclays',
  HSBC: 'HSBC',
  LLOYDS: 'Lloyds Bank',
  NATWEST: 'NatWest',
  SANTANDER: 'Santander',
  MONZO: 'Monzo',
  REVOLUT: 'Revolut',
  STARLING: 'Starling Bank',
  SCB: 'Standard Chartered',
  STANCHAR: 'Standard Chartered',
  DEUTSCHE: 'Deutsche Bank',
  BNP: 'BNP Paribas',
  N26: 'N26',
  ING: 'ING Bank',

  // UAE & Middle East
  ENBD: 'Emirates NBD',
  EMIRATESNBD: 'Emirates NBD',
  ADCB: 'Abu Dhabi Commercial Bank',
  FAB: 'First Abu Dhabi Bank',
  DIB: 'Dubai Islamic Bank',
  MASHREQ: 'Mashreq Bank',
  ALRAJHI: 'Al Rajhi Bank',
  SNB: 'Saudi National Bank',

  // Singapore & Southeast Asia
  DBS: 'DBS Bank',
  POSB: 'POSB Bank',
  OCBC: 'OCBC Bank',
  UOB: 'UOB',
  GRABPAY: 'GrabPay',

  // Canada
  RBC: 'RBC Royal Bank',
  ROYALBANK: 'RBC Royal Bank',
  TDBANK: 'TD Bank',
  SCOTIA: 'Scotiabank',
  BMO: 'Bank of Montreal',
  CIBC: 'CIBC',

  // Australia & New Zealand
  COMMBANK: 'Commonwealth Bank',
  CBA: 'Commonwealth Bank',
  ANZ: 'ANZ Bank',
  WESTPAC: 'Westpac',
  NAB: 'National Australia Bank',

  // Neobanks, Fintechs & NBFCs (India)
  JUPITER: 'Jupiter Money',
  FI: 'Fi Money',
  CRED: 'CRED',
  SLICE: 'Slice',
  ONECARD: 'OneCard',
  MUTHOOT: 'Muthoot Finance',
  MANAPPURAM: 'Manappuram Finance',
  TRUECR: 'True Credits',
  TRUECREDITS: 'True Credits',
  TRUEBALANCE: 'True Balance',
  NAVI: 'Navi',
  KREDITBEE: 'KreditBee',
  MONEYVIEW: 'Moneyview',
  BRANCH: 'Branch',
  BAJAJ: 'Bajaj Finserv',
  TATACAP: 'Tata Capital',
};

/**
 * Known merchants mapping
 */
const KNOWN_MERCHANTS: { pattern: RegExp; name: string }[] = [
  // Global & Indian Food & Dining
  { pattern: /\bswiggy\b/i, name: 'Swiggy' },
  { pattern: /\bzomato\b/i, name: 'Zomato' },
  { pattern: /\bstarbucks\b/i, name: 'Starbucks' },
  { pattern: /\bmcdonald/i, name: "McDonald's" },
  { pattern: /\bkfc\b/i, name: 'KFC' },
  { pattern: /\bdominos?\b/i, name: "Domino's" },
  { pattern: /\bburger\s*king\b/i, name: 'Burger King' },
  { pattern: /\bsubway\b/i, name: 'Subway' },
  { pattern: /\bchipotle\b/i, name: 'Chipotle' },
  { pattern: /\btim\s*hortons\b/i, name: 'Tim Hortons' },
  { pattern: /\bcosta\s*coffee\b/i, name: 'Costa Coffee' },
  { pattern: /\bpizza\s*hut\b/i, name: 'Pizza Hut' },

  // Global & Indian Shopping & E-commerce
  { pattern: /\bamazon\b/i, name: 'Amazon' },
  { pattern: /\bwalmart\b/i, name: 'Walmart' },
  { pattern: /\btarget\b/i, name: 'Target' },
  { pattern: /\bbest\s*buy\b/i, name: 'Best Buy' },
  { pattern: /\bcostco\b/i, name: 'Costco' },
  { pattern: /\bcarrefour\b/i, name: 'Carrefour' },
  { pattern: /\btesco\b/i, name: 'Tesco' },
  { pattern: /\bsainsbury/i, name: "Sainsbury's" },
  { pattern: /\baldi\b/i, name: 'ALDI' },
  { pattern: /\blidl\b/i, name: 'Lidl' },
  { pattern: /\bcoles\b/i, name: 'Coles' },
  { pattern: /\bwoolworths\b/i, name: 'Woolworths' },
  { pattern: /\bzara\b/i, name: 'Zara' },
  { pattern: /\bh&m\b|\bhm\b(?!\s*bank)/i, name: 'H&M' },
  { pattern: /\bapple\b(?!\s*music)/i, name: 'Apple' },
  { pattern: /\bebay\b/i, name: 'eBay' },
  { pattern: /\baliexpress\b/i, name: 'AliExpress' },
  { pattern: /\bflipkart\b/i, name: 'Flipkart' },
  { pattern: /\bmyntra\b/i, name: 'Myntra' },
  { pattern: /\bajio\b/i, name: 'AJIO' },
  { pattern: /\bmeesho\b/i, name: 'Meesho' },
  { pattern: /\bnykaa\b/i, name: 'Nykaa' },
  { pattern: /\bbigbasket\b/i, name: 'BigBasket' },
  { pattern: /\bblinkit\b/i, name: 'Blinkit' },
  { pattern: /\bzepto\b/i, name: 'Zepto' },
  { pattern: /\binstamart\b/i, name: 'Swiggy Instamart' },
  { pattern: /\bjiomart\b/i, name: 'JioMart' },
  { pattern: /\bdmart\b/i, name: 'DMart' },
  { pattern: /\bcroma\b/i, name: 'Croma' },
  { pattern: /\breliance\s*digital\b/i, name: 'Reliance Digital' },

  // Global & Indian Travel & Transport
  { pattern: /\buber\b/i, name: 'Uber' },
  { pattern: /\blyft\b/i, name: 'Lyft' },
  { pattern: /\bgrab\b/i, name: 'Grab' },
  { pattern: /\bbolt\b/i, name: 'Bolt' },
  { pattern: /\bairbnb\b/i, name: 'Airbnb' },
  { pattern: /\bbooking\.com\b|\bbooking\b/i, name: 'Booking.com' },
  { pattern: /\bexpedia\b/i, name: 'Expedia' },
  { pattern: /\bola\b(?!\s*(?:money|financial))/i, name: 'Ola' },
  { pattern: /\brapido\b/i, name: 'Rapido' },
  { pattern: /\birctc\b/i, name: 'IRCTC' },
  { pattern: /\bredbus\b/i, name: 'RedBus' },
  { pattern: /\bmake\s*my\s*trip\b/i, name: 'MakeMyTrip' },
  { pattern: /\bgoibibo\b/i, name: 'Goibibo' },
  { pattern: /\bcleartrip\b/i, name: 'Cleartrip' },
  { pattern: /\bindigo\b/i, name: 'IndiGo Airlines' },
  { pattern: /\bfastag\b/i, name: 'FASTag Toll' },

  // Entertainment & Streaming
  { pattern: /\bnetflix\b/i, name: 'Netflix' },
  { pattern: /\bspotify\b/i, name: 'Spotify' },
  { pattern: /\bhotstar\b/i, name: 'Disney+ Hotstar' },
  { pattern: /\bdisney\b|\bdisney\+/i, name: 'Disney+' },
  { pattern: /\bhulu\b/i, name: 'Hulu' },
  { pattern: /\bhbo\b|\bhbo\s*max\b/i, name: 'HBO Max' },
  { pattern: /\bparamount\b/i, name: 'Paramount+' },
  { pattern: /\bjiohotstar\b/i, name: 'JioHotstar' },
  { pattern: /\bjiocinema\b/i, name: 'JioCinema' },
  { pattern: /\bamazon\s*prime\b/i, name: 'Amazon Prime' },
  { pattern: /\byoutube\s*premium\b/i, name: 'YouTube Premium' },
  { pattern: /\byoutube\b/i, name: 'YouTube' },
  { pattern: /\bapple\s*music\b/i, name: 'Apple Music' },
  { pattern: /\bbookmyshow\b/i, name: 'BookMyShow' },
  { pattern: /\bsony\s*liv\b/i, name: 'SonyLIV' },
  { pattern: /\bzee5\b/i, name: 'ZEE5' },
  { pattern: /\bplaystation\b|\bpsn\b/i, name: 'PlayStation' },
  { pattern: /\bxbox\b|\bmicrosoft\b/i, name: 'Microsoft' },
  { pattern: /\bopenai\b|\bchatgpt\b/i, name: 'OpenAI ChatGPT' },
  { pattern: /\badobe\b/i, name: 'Adobe' },

  // Bills, Telecom & Utilities
  { pattern: /\bjio\s*(?:recharge|prepaid|postpaid|fiber)?\b/i, name: 'Jio' },
  { pattern: /\bairtel\s*(?:recharge|prepaid|postpaid|fiber)?\b/i, name: 'Airtel' },
  { pattern: /\bvi\s*recharge\b|\bvodafone\s*idea\b/i, name: 'Vi (Vodafone Idea)' },
  { pattern: /\bbsnl\b/i, name: 'BSNL' },
  { pattern: /\bbescom\b/i, name: 'BESCOM' },
  { pattern: /\btata\s*power\b/i, name: 'Tata Power' },
  { pattern: /\bact\s*fibernet\b/i, name: 'ACT Fibernet' },
  { pattern: /\bverizon\b/i, name: 'Verizon' },
  { pattern: /\bat&t\b|\batt\b/i, name: 'AT&T' },
  { pattern: /\bt-mobile\b|\btmobile\b/i, name: 'T-Mobile' },
  { pattern: /\be&|\betisalat\b/i, name: 'e& (Etisalat)' },
  { pattern: /\bdu\b(?:\s*telecom)?/i, name: 'du Telecom' },
  { pattern: /\bsingtel\b/i, name: 'Singtel' },
  { pattern: /\btelstra\b/i, name: 'Telstra' },
  { pattern: /\brogers\b/i, name: 'Rogers' },

  // Lending, Fintech & Loan Apps
  { pattern: /\btrue\s*credits\b|\btrue\s*balance\b/i, name: 'True Credits' },
  { pattern: /\bmuthoot\s*finance\b|\bmuthoot\b/i, name: 'Muthoot Finance' },
  { pattern: /\bpaytm\s*postpaid\b/i, name: 'Paytm Postpaid' },
  { pattern: /\bpaytm\b(?!\s*(?:bank|payment\s*bank))/i, name: 'Paytm' },
  { pattern: /\bphonepe\b/i, name: 'PhonePe' },
  { pattern: /\bgoogle\s*pay\b|\bgpay\b/i, name: 'Google Pay' },
  { pattern: /\bcred\b/i, name: 'CRED' },
  { pattern: /\bmoneyview\b|\bmoney\s*view\b/i, name: 'Moneyview' },
  { pattern: /\bcreditsea\b|\bcredit\s*sea\b/i, name: 'CreditSea' },
  { pattern: /\bbranch\b/i, name: 'Branch' },
  { pattern: /\bnavi\b/i, name: 'Navi' },
  { pattern: /\bkreditbee\b/i, name: 'KreditBee' },
  { pattern: /\bbajaj\s*finserv\b|\bbajaj\s*finance\b/i, name: 'Bajaj Finserv' },
  { pattern: /\btata\s*capital\b/i, name: 'Tata Capital' },
  { pattern: /\bzerodha\b/i, name: 'Zerodha' },
  { pattern: /\bgroww\b/i, name: 'Groww' },
  { pattern: /\bupstox\b/i, name: 'Upstox' },
];

/**
 * Check if the sender or message looks like a financial transaction.
 * Accommodates all Indian & international bank formats, short-codes, and explicit transaction SMS.
 */
function isFinancialSender(address: string, body: string): boolean {
  if (!address && !body) return false;
  const upper = (address || '').toUpperCase().replace(/\s/g, '');

  // 1. Check known financial keywords in body
  if (/(?:debited|credited|transferred|withdrawn|deposited|loan\s*emi|credit\s*for\s*upi|reversal|processed\s*against|a\/c\s+[x\d]+|upi\s*ref|avl\s*bal|direct\s*deposit|zelle|venmo|cash\s*app|paypal|spent|purchase\s+at|authorized)/i.test(body)) {
    return true;
  }

  // 2. Short-code senders (Indian 2-letter prefix or US/UK 4-8 digit shortcodes)
  if (/^[A-Z]{2}-[A-Z0-9]{3,10}$/.test(upper)) return true;
  if (/^\d{4,8}$/.test(upper)) return true;
  if (/^[A-Z0-9]{4,12}$/.test(upper)) return true;

  // 3. Known bank/financial sender keywords
  for (const key of Object.keys(BANK_SENDER_PATTERNS)) {
    if (upper.includes(key)) return true;
  }

  return true;
}

/**
 * Filter out OTP, promotional, loan inquiries, overdue notices, and other non-transactional messages.
 */
export function isNonTransactional(body: string): boolean {
  // ── GUARD 1: OTP and verification messages → REJECT ───────────────
  if (/\b(?:otp|one\s*time\s*password)\b/i.test(body)) return true;
  if (/\b(?:verification\s*code|auth\s*code|security\s*code|login\s*code|access\s*code)\b/i.test(body)) return true;
  if (/\b(?:your\s+code\s+is|use\s+\d{4,6}\s+to\s+verify|enter\s+\d{4,6})\b/i.test(body)) return true;
  if (/\d{4,8}\s+is\s+your\s+(?:otp|code|password)/i.test(body)) return true;

  // ── GUARD 2: Overdue notices, payment demands & due reminders → REJECT ──
  if (/\b(?:is\s+(?:now\s+)?\d+\s*days?\s*overdue|overdue|payment\s+is\s+overdue|amount\s+is\s+overdue)\b/i.test(body)) return true;
  if (/\b(?:request\s+you\s+to\s+make\s+the\s+payment|request\s+you\s+to\s+pay|kindly\s+make\s+the\s+payment|kindly\s+pay|pay\s+now\s+to\s+avoid|pay\s+immediately)\b/i.test(body)) return true;
  if (/\b(?:reminder\s+to\s+pay|payment\s+reminder|due\s+date\s+is|is\s+due\s+on|total\s+amount\s+due|minimum\s+amount\s+due|outstanding\s+amount|outstanding\s+balance|bill\s+(?:of|amount).*?is\s+due)\b/i.test(body) &&
      !/\b(?:debited|auto[- ]?debit(?:ed)?|paid\s+via|transferred|charged)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 3: Loan Applications, Inquiries & Lead Generation → REJECT ─
  if (/\b(?:thanks\s+for\s+applying|thank\s+you\s+for\s+applying|loan\s+request.*?(?:is\s+)?received|application.*?(?:is\s+)?received|loan\s+application|in-principle\s+approval|eligible\s+for\s+loan|pre-approved\s+loan|apply\s+for\s+loan|check\s+your\s+loan\s+eligibility)\b/i.test(body) &&
      !/\b(?:disbursed\s+to|credited\s+to\s+your\s+bank|transferred\s+to\s+your\s+a\/c)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 4: Balance inquiries without transaction → REJECT ────────
  if (/\b(?:balance\s+(?:is|in|as\s+on)|bal(?:ance)?[:\s]+(?:rs\.?|inr|₹|\$|€|£|aed|sar|sgd|aud|cad))\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent|transferred|withdrawn|refund|has\s+credit|direct\s+deposit)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 5: Security / Card blocked / Login alerts → REJECT ───────
  if (/\b(?:card\s+(?:blocked|locked|suspended|deactivated|activated)|pin\s+(?:changed|reset|generated|set)|password\s+(?:changed|reset|updated))\b/i.test(body)) {
    return true;
  }
  if (/\b(?:logged\s+in|new\s+login|login\s+(?:from|detected|attempt)|signed\s+in)\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 6: Promotional / offer messages → REJECT ─────────────────
  if (/\b(?:congratulations|exclusive\s*offer|pre-approved|apply\s*now|get\s*up\s*to|discount\s*coupon|flat\s*\d+%\s*off|limited\s*(?:time|period)\s*offer|win\s+a\s+chance|claim\s+your)\b/i.test(body) &&
      !/\b(?:debited|credited|spent|transferred|paid|refund|processed\s+against)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 7: Delivery / shipping notifications → REJECT ────────────
  if (/\b(?:shipped|dispatched|out\s+for\s+delivery|delivered|your\s+order|track\s+your\s+package)\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent|refund)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 8: Failed / declined transactions → REJECT ───────────────
  if (/\b(?:failed|declined|unsuccessful|could\s+not\s+be\s+processed|transaction\s+failed|payment\s+failed|txn\s+failed)\b/i.test(body) &&
      !/\b(?:debited|credited|reversed|refund)\b/i.test(body)) {
    return true;
  }

  return false;
}

/**
 * Extract currency symbol or code from SMS body.
 * Supports: $, €, £, ₹, ¥, AED, SAR, QAR, OMR, KWD, BHD, SGD, AUD, CAD, NZD, CHF, JPY, CNY, MYR, THB, PHP, IDR, ZAR, etc.
 */
function extractCurrency(body: string): string {
  const symbolMatch = body.match(/(?:(\$|€|£|₹|¥)|(?:usd|eur|gbp|aed|sar|qar|omr|kwd|bhd|sgd|aud|cad|nzd|chf|jpy|cny|myr|thb|php|idr|zar|inr|rs\.?))\s*[\d,]+(?:\.\d{1,2})?/i);
  if (symbolMatch) {
    const raw = symbolMatch[0].trim().toLowerCase();
    if (raw.startsWith('$') || raw.startsWith('usd')) return '$';
    if (raw.startsWith('€') || raw.startsWith('eur')) return '€';
    if (raw.startsWith('£') || raw.startsWith('gbp')) return '£';
    if (raw.startsWith('¥') || raw.startsWith('jpy') || raw.startsWith('cny')) return '¥';
    if (raw.startsWith('aed')) return 'AED';
    if (raw.startsWith('sar')) return 'SAR';
    if (raw.startsWith('qar')) return 'QAR';
    if (raw.startsWith('omr')) return 'OMR';
    if (raw.startsWith('kwd')) return 'KWD';
    if (raw.startsWith('bhd')) return 'BHD';
    if (raw.startsWith('sgd')) return 'SGD';
    if (raw.startsWith('aud')) return 'AUD';
    if (raw.startsWith('cad')) return 'CAD';
    if (raw.startsWith('nzd')) return 'NZD';
    if (raw.startsWith('chf')) return 'CHF';
    if (raw.startsWith('myr')) return 'MYR';
    if (raw.startsWith('thb')) return 'THB';
    if (raw.startsWith('php')) return 'PHP';
    if (raw.startsWith('idr')) return 'IDR';
    if (raw.startsWith('zar')) return 'ZAR';
    if (raw.startsWith('₹') || raw.startsWith('inr') || raw.startsWith('rs')) return '₹';
  }

  // Check currency suffix: "75.20 CAD" or "50.00 USD"
  const suffixMatch = body.match(/[\d,]+(?:\.\d{1,2})?\s*(?:(\$|€|£|₹|¥)|(usd|eur|gbp|aed|sar|qar|omr|kwd|bhd|sgd|aud|cad|nzd|chf|jpy|cny|myr|thb|php|idr|zar|inr|rs\.?))\b/i);
  if (suffixMatch) {
    const code = (suffixMatch[1] || suffixMatch[2] || '').toLowerCase();
    if (code === '$' || code === 'usd') return '$';
    if (code === '€' || code === 'eur') return '€';
    if (code === '£' || code === 'gbp') return '£';
    if (code === '¥' || code === 'jpy' || code === 'cny') return '¥';
    if (code === 'aed') return 'AED';
    if (code === 'sar') return 'SAR';
    if (code === 'sgd') return 'SGD';
    if (code === 'aud') return 'AUD';
    if (code === 'cad') return 'CAD';
    if (code === 'nzd') return 'NZD';
    if (code === 'chf') return 'CHF';
    if (code === '₹' || code === 'inr' || code.startsWith('rs')) return '₹';
  }

  return '₹';
}

/**
 * Extract transaction amount using context-aware priority ranking across Indian and International SMS formats.
 */
function extractAmount(body: string): number | null {
  // ── Step 1: Strip known non-amount number contexts ─────────────────
  let cleanedBody = body
    .replace(/\b(?:otp|one\s*time\s*password|verification\s*code|auth\s*code|security\s*code|login\s*code|code)\s*(?:is|:)?\s*\d{4,8}/gi, ' ')
    .replace(/\d{4,8}\s+is\s+your\s+(?:otp|code|password)/gi, ' ')
    .replace(/(?:a\/c|account|acct|card|checking|savings)\s*(?:no\.?|number|#)?\s*:?\s*(?:[xX*]+\s*)?\d{3,16}/gi, ' ')
    .replace(/(?:ending\s+(?:in|with)?\s+)\d{3,5}/gi, ' ')
    .replace(/(?:[xX]{1,}|[*]{1,})\s*\d{3,6}/g, ' ')
    .replace(/(?:avail(?:able)?\s*bal(?:ance)?|bal(?:ance)?|clear\s*bal(?:ance)?|avail\s*limit)\s*(?:is|:)?\s*(?:rs\.?|inr|₹|\$|€|£|aed|sar|sgd|aud|cad)?\s*[\d,]+(?:\.\d{1,2})?/gi, ' ')
    .replace(/(?:rs\.?|inr|₹|\$|€|£|aed|sar|sgd|aud|cad)\s*[\d,]+(?:\.\d{1,2})?\s*(?:avail(?:able)?\s*bal(?:ance)?)/gi, ' ')
    .replace(/(?:upi\s*ref|rrn|utr|txn\s*id|trxn\s*id|ref\s*no|reference\s*(?:no|id)|txn\s*ref|refno)[:\s#]*[a-zA-Z0-9]{8,22}/gi, ' ')
    .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, ' ')
    .replace(/\b1800\d{6,8}\b/g, ' ');

  const curr = '(?:rs\\.?|inr|₹|\\$|€|£|¥|aed|sar|qar|omr|kwd|bhd|sgd|aud|cad|nzd|chf|jpy|cny|myr|thb|php|idr|zar)';

  // ── Step 2: Context-aware amount extraction ────────────────────────
  const amountPatterns = [
    // 1. "debited by 100.00" / "spent $45.80" / "paid £24.99" / "sent $120.00" / "authorized $50" / "used for Rs.599"
    new RegExp(`(?:debited|credited|spent|paid|sent|withdrawn|received|transferred|charged|deducted|authorized|used\\s+for)\\s+(?:for|by|with|of|for\\s+${curr})?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 2. "purchase of $45.80" / "transaction of Rs 100.00" / "payment of £24.99" / "Txn of Rs.450"
    new RegExp(`(?:transaction|txn|purchase|payment|debit|credit|direct\\s+deposit)\\s+(?:of|for|on)\\s+${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 3. Cheque amounts: "Cheque No 000123 for Rs 5,000.00", "Cheque of Rs.15,000.00"
    new RegExp(`(?:cheque|chq)\\s*(?:no\\.?)?\\s*[\\w-]*\\s*(?:of|for|amount)?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 4. SIP & Mutual Fund amounts: "SIP of Rs. 2,500.00", "Mutual fund order of Rs.5,000.00"
    new RegExp(`(?:sip\\s+(?:installment\\s+)?(?:of|for)|mutual\\s*fund\\s*(?:order\\s+)?(?:of|for))\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 5. Wallet Top-up & Added Money: "Rs.500 added to your Paytm Wallet", "Rs.1,000 loaded to your card"
    new RegExp(`(?:added|loaded)\\s+(?:to\\s+[^\\s]+\\s+)?${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),
    new RegExp(`${curr}\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:added\\s+to|loaded\\s+to)`, 'i'),

    // 6. "loan EMI Rs. 1619" / "EMI Rs 1619"
    new RegExp(`(?:loan\\s*emi|emi)\\s+(?:of|is)?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 7. "credit for UPI/REVERSAL/... of Rs 1.00"
    new RegExp(`(?:credit|debit)\\s+for\\s+.*?\\s+of\\s+${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 8. "Rs 179880 processed" / "$500 processed" / "has been processed for"
    new RegExp(`${curr}\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:has\\s+been\\s+)?(?:processed|executed)`, 'i'),

    // 9. Amount in explicit named context ("Amount: $500", "Amt: Rs.500")
    new RegExp(`(?:amount|amt|txn\\s*amt|txn\\s*amount)\\.?\\s*(?:is|:)?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 10. Amount before "has been" / "is" / "was" + verb ("$45.80 was used", "£150 was credited")
    new RegExp(`${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:has\\s+been|is|was)\\s+(?:debited|credited|paid|transferred|withdrawn|deposited|charged|sent|received|approved|spent|used|presented|cleared)`, 'i'),

    // 11. Standard Currency + number ("$45.80", "€89.00", "AED 350.00", "SGD 18.50", "Rs. 1,499.00")
    new RegExp(`${curr}\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 12. Number with Currency suffix ("75.20 CAD", "55.00 AUD", "500 INR")
    new RegExp(`([\\d,]+(?:\\.\\d{1,2})?)\\s*${curr}\\b`, 'i'),
  ];

  for (const pattern of amountPatterns) {
    const match = cleanedBody.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
      // Validate: must be >= 0.1 and < 10 crore
      if (!isNaN(cleanNum) && cleanNum >= 0.1 && cleanNum < 100000000) {
        return cleanNum;
      }
    }
  }

  return null;
}

/**
 * Determine Debit vs Credit across Indian and International SMS.
 */
function determineTransactionType(body: string): TransactionType | null {
  const creditRegexes = [
    /\bcredited\b/i,
    /\bdeposited\b/i,
    /\brefund(?:ed)?\b/i,
    /\bcashback\b/i,
    /\bsalary\b/i,
    /\brevers(?:ed|al)\b/i,
    /\bloan\s*disburs/i,
    /\bamount\s*credited\b/i,
    /\bmoney\s*received\b/i,
    /\binterest\s*credit/i,
    /\bhas\s+credit\s+for\b/i,
    /\bwill\s+be\s+credited\b/i,
    /\bcredit\s+for\s+upi/i,
    /\bdirect\s+deposit\b/i,
    /\bpayroll\b/i,
    /\bach\s+credit\b/i,
    /\bzelle\s+from\b/i,
    /\bvenmo\s+from\b/i,
    /\bcash\s*app\s+from\b/i,
    /\bwire\s+from\b/i,
    /\badded\s+to\s+(?:your\s+)?(?:[\w\s]+\s+)?wallet\b/i,
    /\bloaded\s+to\s+(?:your\s+)?card\b/i,
    /\bmoney\s+added\b/i,
    /\bcheque\s+.*(?:cleared|credited|deposited)\b/i,
    /\bcleared\s+and\s+credited\b/i,
  ];

  const debitRegexes = [
    /\bdebited\b/i,
    /\bdebit\b/i,
    /\bspent\b/i,
    /\bpaid\b/i,
    /\bsent\b/i,
    /\bwithdrawn\b/i,
    /\bpurchase[ds]?\b/i,
    /\btransferred\b/i,
    /\bcharged\b/i,
    /\bpayment\s+(?:of|for|to|made)\b/i,
    /\bused\s+at\b/i,
    /\bused\s+for\b/i,
    /\bauthorized\b/i,
    /\bauthorization\b/i,
    /\bloan\s*emi\b/i,
    /\bemi\b/i,
    /\bauto[\s-]*debit\b/i,
    /\bnach\b/i,
    /\bstanding\s*instruction\b/i,
    /\bbill\s*(?:paid|payment|pay)\b/i,
    /\btrf\s+to\b/i,
    /\btransaction\s+of\s+.*?\s+approved\b/i,
    /\bsuccessfully\s+approved\b/i,
    /\bzelle\s+to\b/i,
    /\bvenmo\s+to\b/i,
    /\bcash\s*app\s+to\b/i,
    /\bapple\s*pay\b/i,
    /\bgoogle\s*pay\b/i,
    /\btxn\s+(?:of\s+[^\s]+\s+)?on\s+card\b/i,
    /\bspent\s+.*via\s+card\b/i,
    /\bcard\s+ending\s+\d+\s+used\b/i,
    /\bcheque\s+.*(?:presented|debited|paid|against)\b/i,
    /\bcheque\s+no\b/i,
    /\bsip\s+(?:installment\s+)?(?:of\s+[^\s]+\s+)?(?:has\s+been\s+)?processed\b/i,
    /\bmutual\s*fund\s*(?:order\s+)?(?:of\s+[^\s]+\s+)?executed\b/i,
    /\bexecuted\s+towards\b/i,
  ];

  const hasCredit = creditRegexes.some(rx => rx.test(body));
  const hasDebit = debitRegexes.some(rx => rx.test(body));

  if (hasCredit && !hasDebit) return 'credit';
  if (hasDebit && !hasCredit) return 'debit';

  if (hasCredit && hasDebit) {
    if (/refund|cashback|salary|reversal|disburs|credited\s+to|has\s+credit|will\s+be\s+credited|credit\s+for\s+upi|direct\s+deposit|cleared\s+and\s+credited/i.test(body)) return 'credit';
    if (/debited|spent|paid\s+to|transferred\s+to|trf\s+to|emi|loan\s*emi|approved|authorized|used\s+at|used\s+for|presented\s+against/i.test(body)) return 'debit';
  }

  // Check "received" context
  if (/\bloan\s*emi.*received/i.test(body)) return 'debit';
  if (/\breceived\s+from/i.test(body)) return 'credit';
  if (/\breceived\b/i.test(body)) return 'credit';

  // Fallbacks
  if (/a\/?c\s*(?:has\s*been\s*)?(?:debited|debit)/i.test(body)) return 'debit';
  if (/a\/?c\s*(?:has\s*been\s*)?(?:credited|credit|has\s+credit)/i.test(body)) return 'credit';

  return null;
}

/**
 * Extract Bank Name from sender ID or body
 */
function extractBankName(address: string, body: string): string | undefined {
  const text = ((address || '') + ' ' + (body || '')).toUpperCase();
  
  // Check explicit lender/SFB names first
  if (/SURYODAY/i.test(text)) return 'Suryoday Small Finance Bank';
  if (/MUTHOOT/i.test(text)) return 'Muthoot Finance';
  if (/TRUE\s*CREDITS/i.test(text)) return 'True Credits';
  if (/SBI/i.test(text)) return 'State Bank of India';

  for (const [key, name] of Object.entries(BANK_SENDER_PATTERNS)) {
    if (text.includes(key)) {
      return name;
    }
  }

  return undefined;
}

/**
 * Extract masked Account or Card number (e.g. XX2572)
 */
function extractAccountNumber(body: string): string | undefined {
  const cleaned = body
    .replace(/\b(?:otp|code|pin)\s*(?:is|:)?\s*\d{4,8}/gi, '')
    .replace(/\d{4,8}\s+is\s+your\s+(?:otp|code|pin)/gi, '')
    .replace(/\b1800\d{6,8}\b/g, '');

  const patterns = [
    // "A/C X2572" / "A/C XXXXX822572" / "A/c XXXX1240"
    /(?:a\/c|account|acct|card)\s*(?:no\.?|number|#)?:?\s*(?:[xX*]+\s*)?([\d]{3,8})/i,
    /(?:[xX]{1,}|[*]{1,})\s*([\d]{3,8})/,
    /ending\s+(?:in|with)\s+(\d{3,5})/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return `XX${match[1]}`;
    }
  }

  return undefined;
}

/**
 * Extract Reference Number / UTR / UPI Ref ID
 */
function extractReferenceNumber(body: string): string | undefined {
  const patterns = [
    // "Refno 622507833427" / "trxn ID 507197956" / "ref no.622517474073" / "UPI/REVERSAL/707504892076"
    /(?:upi\/(?:reversal|p2p|cr|dr|p2m)\/|rrn|utr|txn\s*id|trxn\s*id|ref\s*no|reference\s*no|reference\s*id|txn\s*ref|refno)[:\s#/]*([a-zA-Z0-9]{8,22})/i,
    /via\s+ref\s*(?:no\.?)?[:\s#]*([a-zA-Z0-9]{8,22})/i,
    /\bref\s*[:\s#]*([a-zA-Z0-9]{8,22})/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract Closing / Available Balance if present in SMS
 */
function extractBalance(body: string): number | undefined {
  const patterns = [
    /(?:avail(?:able)?\s*bal(?:ance)?|bal(?:ance)?|clear\s*bal(?:ance)?)\s*(?:is|:)?\s*(?:rs\.?|inr|₹|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:avail(?:able)?\s*bal(?:ance)?|bal(?:ance)?)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val)) {
        return val;
      }
    }
  }

  return undefined;
}

/**
 * Extract UPI VPA handle
 */
function extractUpiVpa(body: string): string | undefined {
  const match = body.match(/\b([a-zA-Z0-9._-]+@(?:ybl|upi|paytm|okhdfcbank|okaxis|oksbi|apl|ibl|axl|sbi|icici|hdfcbank|kotak|indus|federal|rbl|boi|pnb|canarabank|unionbank|idbi|dcb|dbs|sc|hsbc|citi|bob|freecharge|okicici|okbizaxis|axisbank|idfcbank|yesbk|jupiteraxis|dlb|tapicici))\b/i);
  return match ? match[1] : undefined;
}

function matchKnownMerchant(text: string): string | undefined {
  for (const { pattern, name } of KNOWN_MERCHANTS) {
    if (pattern.test(text)) {
      return name;
    }
  }
  return undefined;
}

function cleanMerchantName(raw: string): string {
  let cleaned = raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:vpa|upi|user|merchant|account|a\/c|mr|mrs|ms|dr)\.?\s+/i, '')
    .replace(/[\/\\]/g, ' ')
    .replace(/\s*\/-?\s*$/, '')
    .replace(/\s*\.?\s*$/, '')
    .replace(/\s*Refno.*$/i, '')
    .replace(/\s*UMN:.*$/i, '')
    .replace(/\s*Refer\s.*$/i, '')
    .replace(/\s*Regards.*$/i, '')
    .replace(/\s*If not you.*$/i, '')
    .replace(/\s*If not u.*$/i, '')
    .replace(/\s*kindly.*$/i, '')
    .replace(/\s*Download.*$/i, '')
    .replace(/\s*Avl\s+Bal.*$/i, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\s*(?:a\/c|ac|acct)[\s:]*(?:xx+\d+|\d{4,})/i, '')
    .replace(/\s*(?:dt|date)[\s.:]*\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4}/i, '')
    .replace(/\s*(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d+)?/i, '')
    .replace(/\s*xx+\d+/i, '')
    .replace(/\s*w\.?e\.?f\.?\s*/i, '')
    .replace(/\s*on\s+\d{1,2}[\/\-.][A-Za-z\d]+/i, '')
    .trim();

  if (cleaned.length > 0 && cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned.replace(/\b\w/g, c => c.toUpperCase());
  }

  return cleaned;
}

function vpaToDisplayName(vpa: string): string {
  const username = vpa.split('@')[0];
  const known = matchKnownMerchant(username);
  if (known) return known;

  return username
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Extract clean Merchant, Recipient, or Sender name.
 */
function extractMerchantOrParty(body: string, type: TransactionType): string {
  // 1. Check known merchants first
  const knownMatch = matchKnownMerchant(body);
  if (knownMatch) return knownMatch;

  // 2. Reversal context
  if (/reversal/i.test(body)) {
    return 'UPI Reversal';
  }

  // 3. Cheque context: "Cheque No 000123"
  const chequeMatch = body.match(/(?:cheque|chq)\s*(?:no\.?)?\s*([a-zA-Z0-9]{4,12})/i);
  if (chequeMatch && chequeMatch[1]) {
    return `Cheque No ${chequeMatch[1]}`;
  }

  // 4. SIP & Mutual Fund context: "SIP of Rs. 2,500 for Nippon India Growth Fund"
  const sipMatch = body.match(/(?:sip\s+(?:installment\s+)?(?:of\s+[^\s]+\s+)?(?:has\s+been\s+)?processed\s+for|mutual\s*fund\s*(?:order\s+)?(?:of\s+[^\s]+\s+)?executed\s+towards)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|\.|,)|$)/i);
  if (sipMatch && sipMatch[1]) {
    const cleaned = cleanMerchantName(sipMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // 5. Wallet Top-up: "added to your Paytm Wallet" / "loaded to your Sodexo Card"
  const walletMatch = body.match(/(?:added\s+to\s+(?:your\s+)?|loaded\s+to\s+(?:your\s+)?)([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:from|on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i);
  if (walletMatch && walletMatch[1]) {
    const cleaned = cleanMerchantName(walletMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // 6. "trf to SVS ONLINE SERIV Refno" / "trf to Jio Recharge"
  const trfMatch = body.match(/trf\s+to\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:Refno|ref|Ref|UPI|upi|\.|,|$))/i);
  if (trfMatch && trfMatch[1]) {
    const cleaned = cleanMerchantName(trfMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // 7. UPI-specific patterns (UPI/P2P/XXXX/MERCHANT)
  const upiMerchant = extractUpiMerchant(body);
  if (upiMerchant) {
    const known = matchKnownMerchant(upiMerchant);
    if (known) return known;
    const cleaned = cleanMerchantName(upiMerchant);
    if (cleaned.length >= 2 && !isNoiseWord(cleaned)) {
      return cleaned.length > 30 ? cleaned.substring(0, 30) : cleaned;
    }
  }

  // 8. Contextual regex patterns
  const debitPatterns = [
    // POS: "used for Rs.599.00 at AMAZON", "spent Rs.1299 at ZARA via Card"
    /(?:used\s+for\s+[^\s]+\s+at|spent\s+[^\s]+\s+at|purchase\s+at|spent\s+at|used\s+at|txn\s+at|authorized\s+at)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|with|\.|,)|$)/i,
    // "paid to Swiggy", "sent to John Doe with Zelle", "transferred to Alice"
    /(?:paid\s+to|sent\s+to|transferred\s+to|transfer\s+to)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:with\s+zelle|with\s+venmo|via|on|ref|using|avail|bal|a\/c|from|UPI|upi|Ref|for|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
    // "payment of £24.99 was made to NETFLIX"
    /(?:payment\s+(?:of\s+[^\s]+\s+)?(?:was\s+)?made\s+to)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i,
    // "debited for Netflix" / "paid for subscription"
    /(?:debited\s+for|paid\s+for|charged\s+for|billed\s+for)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|subscription|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
    // "debited at X", "charged at X", "used at X"
    /(?:debited|charged|used)\s+(?:(?:rs\.?|\$|€|£|aed|sgd)\s*[\d,]+(?:\.\d{1,2})?\s+)?at\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|\.|,)|$)/i,
    // "towards Netflix" / "for HDFC Ergo"
    /(?:towards|for)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|is|has|Rs|INR|₹|\$|€|£|per|monthly|subscription|\.|,)|$)/i,
    // "EMI of Rs.X for Home Loan" / "autopay for Netflix"
    /(?:emi|autopay|mandate|auto-debit|nach)\s+(?:of\s+[^\s]+\s+)?(?:for|to|towards)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|from|has|is|a\/c|\.|,)|$)/i,
    /\bto\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:with\s+zelle|with\s+venmo|via|Ref|ref|UPI|upi|on\s+\d|\.|,)|$)/i,
    /info\s*:\s*([A-Za-z0-9\s._&'-]{2,35}?)(?=\s*(?:\.|$|Ref|ref|avail|bal|,|;))/i,
    /\bby\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:via|on\s+\d|ref|Ref|\.|,)|$)/i,
    /(?:neft|imps|rtgs)\s+(?:to|trf\s+to)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:ref|Ref|on|\.|,|a\/c)|$)/i,
  ];

  const creditPatterns = [
    // "direct deposit of $3,250.00 from GOOGLE LLC"
    /(?:direct\s+deposit\s+(?:of\s+[^\s]+\s+)?from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:was|is|on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i,
    // "received £150.00 from Alice Smith", "transferred from John"
    /(?:received\s+(?:[^\s]+\s+)?from|transferred\s+from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|to|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
    // "credited by Amazon" / "refund from Flipkart"
    /(?:credited\s+by|refund\s+from|refund\s+by|cashback\s+from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i,
    // "salary from TCS"
    /(?:salary\s+from|salary\s+credited\s+by)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|\.|,)|$)/i,
    // NEFT/IMPS/RTGS from SENDER
    /(?:neft|imps|rtgs)\s+(?:from|cr\s+from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:ref|Ref|on|\.|,|a\/c)|$)/i,
    // "from X" as broad fallback for credits
    /\bfrom\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|to|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
  ];

  const patterns = type === 'credit' ? [...creditPatterns, ...debitPatterns] : [...debitPatterns, ...creditPatterns];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const candidate = cleanMerchantName(match[1]);
      if (candidate.length >= 2 && !isNoiseWord(candidate)) {
        const known = matchKnownMerchant(candidate);
        return known || (candidate.length > 30 ? candidate.substring(0, 30) : candidate);
      }
    }
  }

  // 9. Brand / Lender signature at end of SMS (e.g. "...successfully.True Credits", "...ref no.622517474073. Muthoot Finance")
  const endBrandMatch = body.match(/(?:[-.]\s*|successfully\.)\s*([A-Za-z0-9\s&]{3,25})\s*$/i);
  if (endBrandMatch && endBrandMatch[1]) {
    const candidate = endBrandMatch[1].trim();
    if (!/^(?:SBI|HDFC|ICICI|AXIS|KOTAK|PNB|BOB|YES|BANK)$/i.test(candidate)) {
      return candidate;
    }
  }

  // 10. UPI VPA
  const vpa = extractUpiVpa(body);
  if (vpa) {
    return vpaToDisplayName(vpa);
  }

  // 11. Fallback
  if (type === 'credit') {
    if (/salary/i.test(body)) return 'Salary Deposit';
    if (/refund/i.test(body)) return 'Refund';
    if (/cashback/i.test(body)) return 'Cashback Reward';
    if (/reversal/i.test(body)) return 'Payment Reversal';
    if (/loan\s*disburs/i.test(body)) return 'Loan Disbursement';
    if (/interest/i.test(body)) return 'Interest Credit';
    return 'Incoming Transfer';
  }

  if (/atm|cash\s*withdrawal/i.test(body)) return 'ATM Withdrawal';
  if (/emi|loan/i.test(body)) return 'EMI Payment';
  if (/bill|utility|electricity|water|gas/i.test(body)) return 'Bill Payment';
  if (/insurance|premium/i.test(body)) return 'Insurance Premium';
  if (/rent|maintenance|society/i.test(body)) return 'Rent Payment';
  if (/mutual\s*fund|sip/i.test(body)) return 'Investment';
  if (/nach|auto.?debit|standing\s*instruction/i.test(body)) return 'Auto-Debit Payment';
  return 'UPI Payment';
}

function extractUpiMerchant(body: string): string | null {
  const upiSlashMatch = body.match(/UPI\/(?:P2P|CR|DR|P2M)\s*\/\s*\d+\s*\/\s*([A-Za-z0-9\s._&'-]+?)(?=\s*(?:\/|$|\.|,|Ref|ref|UPI|on\s+\d))/i);
  if (upiSlashMatch && upiSlashMatch[1]) {
    const name = upiSlashMatch[1].trim();
    if (name.length >= 2) return name;
  }

  const parenMatch = body.match(/(?:to|from)\s+(?:VPA\s+)?[a-zA-Z0-9._-]+@[a-zA-Z0-9]+\s*\(([^)]{2,35})\)/i);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim();
  }

  return null;
}

function isNoiseWord(name: string): boolean {
  return /^(?:the|your|bank|account|rs|inr|balance|successful|ref|you|and|for|from|with|has|been|upi|neft|imps|rtgs|nach|via|payment|transaction|txn|amt|amount)$/i.test(name);
}

/**
 * Deduce Category from SMS content
 */
function deduceCategory(body: string, merchant: string, type: TransactionType): string {
  const lower = (body + ' ' + merchant).toLowerCase();

  if (type === 'credit') {
    if (lower.includes('salary')) return 'Salary';
    if (lower.includes('cashback') || lower.includes('reward')) return 'Rewards';
    if (lower.includes('refund') || lower.includes('reversal')) return 'Refund';
    if (lower.includes('interest')) return 'Income';
    if (lower.includes('loan') || lower.includes('disburs') || lower.includes('muthoot')) return 'Income';
    if (lower.includes('wallet') || lower.includes('added')) return 'Wallet Top-up';
    return 'Income';
  }

  // Investment (SIP, Mutual Funds, Stocks)
  if (/mutual\s*fund|sip|investment|growth\s*fund|zerodha|groww|upstox|coinswitch|lic/i.test(lower)) return 'Investment';

  // Cheque
  if (/cheque|chq/i.test(lower)) return 'Cheque Transfer';

  // EMI & Loans
  if (/\bemi\b|loan|true\s*credits|moneyview|creditsea|branch|bajaj/i.test(lower)) return 'EMI & Loans';

  // Insurance
  if (/insurance|premium|policy/i.test(lower)) return 'Insurance';

  // Bills & Utilities & Recharge
  if (/recharge|jio|airtel|vi|bescom|electricity|power|water|gas|broadband|wifi|dth/i.test(lower)) return 'Bills & Utilities';

  if (/swiggy|zomato|mcdonald|kfc|starbucks|burger|pizza|restaurant|cafe|food|dining|eats|dominos?|subway|chipotle|tim\s*hortons/i.test(lower)) return 'Food & Dining';
  if (/amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|store|mall|retail|mart|bazaar|croma|reliance\s*digital|bigbasket|blinkit|zepto|instamart|dmart|walmart|target|costco|zara|h&m/i.test(lower)) return 'Shopping';
  if (/uber|ola|rapido|metro|irctc|redbus|flight|indigo|train|toll|fastag|petrol|fuel|makemytrip|goibibo|cleartrip|lyft|grab|bolt/i.test(lower)) return 'Travel & Fuel';
  if (/netflix|spotify|hotstar|prime|youtube|apple|google|playstore|movie|bookmyshow|sonyliv|zee5|jiocinema|disney|hulu|hbo|paramount|playstation|xbox/i.test(lower)) return 'Entertainment';
  if (/pharmacy|apollo|medplus|1mg|hospital|clinic|doctor|health|pharmeasy|practo/i.test(lower)) return 'Health & Medical';
  if (/rent|maintenance|society/i.test(lower)) return 'Housing & Rent';
  if (/atm|cash\s*withdrawal/i.test(lower)) return 'ATM Withdrawal';

  return 'General Expense';
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Diagnostic reasons for dropped/rejected SMS messages
 */
export type RejectionReason =
  | 'OUTSIDE_30_DAYS'
  | 'NON_FINANCIAL_SENDER'
  | 'NON_TRANSACTIONAL_NOISE'
  | 'NO_TRANSACTION_TYPE'
  | 'NO_AMOUNT_EXTRACTED';

export interface ParseDiagnostics {
  transaction: PassbookTransaction | null;
  rejectionReason?: RejectionReason;
  details?: {
    matchedSender?: boolean;
    extractedType?: TransactionType | null;
    extractedAmount?: number | null;
    currency?: string;
  };
}

/**
 * Parse an SMS with structured diagnostics and rejection tracking
 */
export function parsePassbookSmsWithDiagnostics(sms: RawSms): ParseDiagnostics {
  const { body, date, address } = sms;

  // 1. Check 30-Day Rolling Window constraint
  const now = Date.now();
  if (date < now - THIRTY_DAYS_MS) {
    return { transaction: null, rejectionReason: 'OUTSIDE_30_DAYS' };
  }

  // 2. Sender / Body financial validation
  if (!isFinancialSender(address, body)) {
    console.log(`[Passbook Diagnostics] Dropped (non-financial sender/format): "${address}" -> "${body.substring(0, 60)}..."`);
    return { transaction: null, rejectionReason: 'NON_FINANCIAL_SENDER' };
  }

  // 3. Reject non-transactional / OTP / marketing noise
  if (isNonTransactional(body)) {
    console.log(`[Passbook Diagnostics] Dropped (noise/reminder/inquiry): "${body.substring(0, 60)}..."`);
    return { transaction: null, rejectionReason: 'NON_TRANSACTIONAL_NOISE' };
  }

  // 4. Extract Amount
  const amount = extractAmount(body);
  if (!amount) {
    console.warn(`[Passbook Diagnostics] DROPPED (Valid sender, but NO AMOUNT extracted): sender="${address}", body="${body}"`);
    return { transaction: null, rejectionReason: 'NO_AMOUNT_EXTRACTED', details: { matchedSender: true } };
  }

  // 5. Extract Transaction Type (Debit vs Credit)
  const type = determineTransactionType(body);
  if (!type) {
    console.warn(`[Passbook Diagnostics] DROPPED (Amount ₹${amount} found, but NO TYPE (debit/credit) extracted): sender="${address}", body="${body}"`);
    return { transaction: null, rejectionReason: 'NO_TRANSACTION_TYPE', details: { matchedSender: true, extractedAmount: amount } };
  }

  // 6. Extract metadata
  const currency = extractCurrency(body);
  const bankName = extractBankName(address, body);
  const accountNumber = extractAccountNumber(body);
  const referenceNumber = extractReferenceNumber(body);
  const balance = extractBalance(body);
  const merchantName = extractMerchantOrParty(body, type);
  const category = deduceCategory(body, merchantName, type);

  // Generate deterministic ID
  const merchantHash = simpleHash(merchantName + type);
  const id = referenceNumber
    ? `pb-${referenceNumber}`
    : `pb-${date}-${amount}-${merchantHash}`;

  const transaction: PassbookTransaction = {
    id,
    type,
    amount,
    currency,
    date,
    merchantName,
    accountNumber,
    bankName,
    referenceNumber,
    balance,
    category,
    rawSms: body,
  };

  return {
    transaction,
    details: {
      matchedSender: true,
      extractedType: type,
      extractedAmount: amount,
      currency,
    },
  };
}

/**
 * Parse an SMS into a PassbookTransaction
 */
export function parsePassbookSms(sms: RawSms): PassbookTransaction | null {
  const result = parsePassbookSmsWithDiagnostics(sms);
  return result.transaction;
}

/**
 * Parse a batch of SMS messages, filtering strictly to the last 30 days and sorting by date descending
 */
export function parsePassbookBatch(smsList: RawSms[]): PassbookTransaction[] {
  const parsedMap = new Map<string, PassbookTransaction>();

  for (const sms of smsList) {
    const tx = parsePassbookSms(sms);
    if (tx) {
      const key = tx.referenceNumber ? `ref-${tx.referenceNumber}` : `${tx.type}-${tx.amount}-${Math.floor(tx.date / 60000)}`;
      if (!parsedMap.has(key)) {
        parsedMap.set(key, tx);
      }
    }
  }

  return Array.from(parsedMap.values()).sort((a, b) => b.date - a.date);
}

/**
 * Clean up / Prune transactions older than 30 days
 */
export function pruneOlderThan30Days(transactions: PassbookTransaction[]): PassbookTransaction[] {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return transactions.filter(t => t.date >= cutoff);
}
