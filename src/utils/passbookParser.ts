import type { RawSms, PassbookTransaction, TransactionType } from '../types';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Known Bank / Financial Senders Mapping (All Indian Banks, SFBs, Payments Banks & Global Banks)
 */
const BANK_SENDER_PATTERNS: Record<string, string> = {
  // Public Sector Banks (India)
  SBIN: 'State Bank of India',
  SBI: 'State Bank of India',
  SBIUPI: 'State Bank of India',
  SBIINB: 'State Bank of India',
  SBICRD: 'SBI Card',
  SBIPAY: 'State Bank of India',
  PNB: 'Punjab National Bank',
  PUNB: 'Punjab National Bank',
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
  IOBA: 'Indian Overseas Bank',
  INDIANB: 'Indian Bank',
  IDIB: 'Indian Bank',
  MAHABANK: 'Bank of Maharashtra',
  BOM: 'Bank of Maharashtra',
  MAHB: 'Bank of Maharashtra',
  UCO: 'UCO Bank',
  UCBA: 'UCO Bank',
  PSB: 'Punjab & Sind Bank',
  PSIB: 'Punjab & Sind Bank',

  // Private Sector Banks (India)
  HDFC: 'HDFC Bank',
  HDFCBK: 'HDFC Bank',
  ICICI: 'ICICI Bank',
  ICICIB: 'ICICI Bank',
  AXIS: 'Axis Bank',
  AXISBK: 'Axis Bank',
  UTIB: 'Axis Bank',
  KOTAK: 'Kotak Mahindra Bank',
  KOTAKB: 'Kotak Mahindra Bank',
  KKBK: 'Kotak Mahindra Bank',
  INDUS: 'IndusInd Bank',
  INDUSB: 'IndusInd Bank',
  INDB: 'IndusInd Bank',
  YESB: 'Yes Bank',
  YESBNK: 'Yes Bank',
  IDFC: 'IDFC FIRST Bank',
  IDFCFB: 'IDFC FIRST Bank',
  FEDERAL: 'Federal Bank',
  FEDBNK: 'Federal Bank',
  FDRL: 'Federal Bank',
  RBL: 'RBL Bank',
  RBLBNK: 'RBL Bank',
  RATN: 'RBL Bank',
  BANDHAN: 'Bandhan Bank',
  BNDHAN: 'Bandhan Bank',
  BDBL: 'Bandhan Bank',
  SIB: 'South Indian Bank',
  SIBL: 'South Indian Bank',
  CUB: 'City Union Bank',
  CIUB: 'City Union Bank',
  KVB: 'Karur Vysya Bank',
  KVBL: 'Karur Vysya Bank',
  KARN: 'Karnataka Bank',
  KARB: 'Karnataka Bank',
  JKBANK: 'Jammu & Kashmir Bank',
  JAKA: 'Jammu & Kashmir Bank',
  TMB: 'Tamilnad Mercantile Bank',
  CSB: 'CSB Bank',
  DCB: 'DCB Bank',
  DCBL: 'DCB Bank',
  IDBI: 'IDBI Bank',
  IBKL: 'IDBI Bank',

  // Small Finance & Payments Banks (India)
  AUBANK: 'AU Small Finance Bank',
  AUBL: 'AU Small Finance Bank',
  EQUITAS: 'Equitas Small Finance Bank',
  EQSFB: 'Equitas Small Finance Bank',
  ESFB: 'Equitas Small Finance Bank',
  UJJIVAN: 'Ujjivan Small Finance Bank',
  USFB: 'Ujjivan Small Finance Bank',
  JANA: 'Jana Small Finance Bank',
  JSFB: 'Jana Small Finance Bank',
  ESAF: 'ESAF Small Finance Bank',
  SURYODAY: 'Suryoday Small Finance Bank',
  SURSFB: 'Suryoday Small Finance Bank',
  UTKARSH: 'Utkarsh Small Finance Bank',
  FINCARE: 'Fincare Small Finance Bank',
  CAPITALSFB: 'Capital Small Finance Bank',
  SHIVALIK: 'Shivalik Small Finance Bank',
  UNITY: 'Unity Small Finance Bank',
  PAYTM: 'Paytm Payments Bank',
  PYTM: 'Paytm Payments Bank',
  AIRTEL: 'Airtel Payments Bank',
  AIRTELP: 'Airtel Payments Bank',
  FINO: 'Fino Payments Bank',
  IPPB: 'India Post Payments Bank',
  POSTBNK: 'India Post Payments Bank',
  JIO: 'Jio Payments Bank',
  NSDL: 'NSDL Payments Bank',

  // Fintechs, Wallets, NBFCs & Lenders (India)
  JUPITER: 'Jupiter Money',
  FIMONEY: 'Fi Money',
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
  MONVEW: 'Moneyview',
  BRANCH: 'Branch International',
  BRNCHI: 'Branch International',
  POCKETMITRA: 'Pocket Mitra',
  CREDITSEA: 'CreditSea',
  TRUSTPAISA: 'TrustPaisa',
  RUPEEREDEE: 'RupeeRedee',
  FATAKPAY: 'FatakPay',
  FLEXILOANS: 'FlexiLoans',
  CHINMAY: 'Chinmay Finlease',
  BAJAJ: 'Bajaj Finserv',
  TATACAP: 'Tata Capital',
  RWALLET: 'IRCTC RWallet',
  IRCTC: 'IRCTC',
  STARHEALTH: 'Star Health Insurance',
  CASHFREE: 'Cashfree',

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
  { pattern: /\bindian\s*railway\b/i, name: 'Indian Railway' },
  { pattern: /\bir-cris\b|\bircris\b/i, name: 'IR-CRIS' },
  { pattern: /\brwallet\b/i, name: 'RWallet' },
  { pattern: /\bredbus\b/i, name: 'RedBus' },
  { pattern: /\bmake\s*my\s*trip\b/i, name: 'MakeMyTrip' },
  { pattern: /\bgoibibo\b/i, name: 'Goibibo' },
  { pattern: /\bcleartrip\b/i, name: 'Cleartrip' },
  { pattern: /\bindigo\b/i, name: 'IndiGo Airlines' },
  { pattern: /\bfastag\b/i, name: 'FASTag Toll' },

  // Entertainment & Streaming & Subscriptions
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
  { pattern: /\bdiscovery\s*\+|discovery\s*plus/i, name: 'Discovery+' },
  { pattern: /\btimes\s*prime/i, name: 'Times Prime' },
  { pattern: /\bgaana\s*plus|\bgaana\b/i, name: 'Gaana' },
  { pattern: /\baudible\b/i, name: 'Audible' },
  { pattern: /\bplaystation\b|\bpsn\b/i, name: 'PlayStation' },
  { pattern: /\bxbox\b|\bmicrosoft\b/i, name: 'Microsoft' },
  { pattern: /\bopenai\b|\bchatgpt\b/i, name: 'OpenAI ChatGPT' },
  { pattern: /\badobe\b/i, name: 'Adobe' },
  { pattern: /\bcanva\b|\bcanva\s*pty\s*ltd\b/i, name: 'Canva' },
  { pattern: /\bcoursera\b/i, name: 'Coursera' },
  { pattern: /\btruecaller\b/i, name: 'Truecaller' },
  { pattern: /\bcult\.?fit|\bcult\s*pass|\bcult\s*fit/i, name: 'Cult.fit' },
  { pattern: /\blenskart\b/i, name: 'Lenskart' },
  { pattern: /\bswiggy\s*one/i, name: 'Swiggy One' },
  { pattern: /\bzomato\s*gold/i, name: 'Zomato Gold' },

  // Bills, Telecom & Utilities
  { pattern: /\bjio\s*(?:recharge|prepaid|postpaid|fiber)?\b/i, name: 'Jio' },
  { pattern: /\bairtel\s*(?:recharge|prepaid|postpaid|fiber|mobile)?\b/i, name: 'Airtel' },
  { pattern: /\bvi\s*recharge\b|\bvodafone\s*idea\b/i, name: 'Vi (Vodafone Idea)' },
  { pattern: /\bbsnl\b/i, name: 'BSNL' },
  { pattern: /\bbescom\b/i, name: 'BESCOM' },
  { pattern: /\btata\s*power\b/i, name: 'Tata Power' },
  { pattern: /\bact\s*(?:fibernet|broadband)\b|\bbroadband\s*bill/i, name: 'ACT Fibernet' },
  { pattern: /\btata\s*play|\btata\s*sky/i, name: 'Tata Play' },
  { pattern: /\bdecathlon\b/i, name: 'Decathlon' },
  { pattern: /\bchai\s*point\b/i, name: 'Chai Point' },
  { pattern: /\bcafe\s*coffee\s*day|\bccd\b/i, name: 'Cafe Coffee Day' },
  { pattern: /\bmother\s*dairy\b/i, name: 'Mother Dairy' },
  { pattern: /\bnature'?s\s*basket\b/i, name: "Nature's Basket" },
  { pattern: /\bbarbeque\s*nation\b/i, name: 'Barbeque Nation' },
  { pattern: /\burban\s*company\b/i, name: 'Urban Company' },
  { pattern: /\bdunzo\b/i, name: 'Dunzo' },
  { pattern: /\bapollo\s*pharmacy|\bapollo\b/i, name: 'Apollo Pharmacy' },
  { pattern: /\bmedplus\b/i, name: 'Medplus' },
  { pattern: /\bhpcl\b/i, name: 'HPCL' },
  { pattern: /\biocl\b/i, name: 'IOCL' },
  { pattern: /\bgaruda\s*filling\b/i, name: 'Garuda Filling Station' },
  { pattern: /\bsvs\s*online\b/i, name: 'SVS Online Services' },

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
  { pattern: /\btrustpaisa\b|\btrust\s*paisa\b/i, name: 'TrustPaisa' },
  { pattern: /\brupeeredee\b|\brupee\s*redee\b/i, name: 'RupeeRedee' },
  { pattern: /\bpocket\s*mitra\b|\bpocketmitra\b/i, name: 'Pocket Mitra' },
  { pattern: /\bfatakpay\b|\bfatakpaydigitalprivatelimited\b/i, name: 'FatakPay' },
  { pattern: /\bbranch\s*(?:intl|international|app|personal\s*loan)?\b/i, name: 'Branch International' },
  { pattern: /\bnavi\b/i, name: 'Navi' },
  { pattern: /\bkreditbee\b/i, name: 'KreditBee' },
  { pattern: /\bbajaj\s*finserv\b|\bbajaj\s*finance\b/i, name: 'Bajaj Finserv' },
  { pattern: /\btata\s*capital\b/i, name: 'Tata Capital' },
  { pattern: /\bzerodha\b/i, name: 'Zerodha' },
  { pattern: /\bgroww\b/i, name: 'Groww' },
  { pattern: /\bupstox\b/i, name: 'Upstox' },
  { pattern: /\bchhotaria\s*securi/i, name: 'Chhotaria Securities' },
  { pattern: /\bsonu\s*marketing/i, name: 'Sonu Marketing' },
  { pattern: /\bcommand\s*code/i, name: 'Command Code' },
  { pattern: /\bstar\s*health/i, name: 'Star Health Insurance' },
];

/**
 * Check if the sender or message looks like a financial transaction.
 * Accommodates all Indian & international bank formats, short-codes, and explicit transaction SMS.
 */
function isFinancialSender(address: string, body: string): boolean {
  if (!address && !body) return false;
  const upper = (address || '').toUpperCase().replace(/\s/g, '');

  // 1. Check known financial keywords in body
  if (/(?:debited|credited|transferred|withdrawn|deposited|loan\s*emi|credit\s*for\s*upi|reversal|processed\s*against|a\/c\s+[x\d]+|upi\s*ref|avl\s*bal|direct\s*deposit|zelle|venmo|cash\s*app|paypal|spent|purchase\s+at|authorized|rwallet|recharge|payment\s+of|transaction\s+of|approved|receipt\s+of|received\s+rs)/i.test(body)) {
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
 * Filter out pure OTP, non-transactional marketing spam, loan approval marketing, etc.
 */
export function isNonTransactional(body: string): boolean {
  // If message is purely mandate/autopay setup confirmation (not an actual debit), reject for passbook
  if (/\b(?:automatic\s+payment\s+of\s+.*?\s+has\s+been\s+setup|upi-mandate\s+for\s+.*?\s+is\s+successfully\s+created|subscription\s+request\s+for\s+.*?\s+is\s+successful|recurring\s+payment\s+request\s+with\s+.*?\s+has\s+been\s+initiated)\b/i.test(body) &&
      !/\b(?:debited\s+towards|debited\s+for|debited\s+from|debited\s+by|has\s+been\s+debited|payment\s+of\s+inr\s+[\d.]+\s+for\s+order)\b/i.test(body)) {
    return true;
  }

  // If message contains explicit debit / credit confirmations, NEVER filter it out
  if (/\b(?:debited\s+by|debited\s+from|debited\s+with|has\s+been\s+debited|credited\s+with|credited\s+to|credited\s+into|amount\s+will\s+be\s+credited|has\s+credit\s+for|reversal\s+of\s+txn|repayment\s+of\s+rs|repaying\s+rs|loan\s+emi\s+rs.*?received|receipt\s+of\s+rs.*?gratefully|we\s+have\s+received\s+rs.*?for\s+your\s+policy|recharge\s+of\s+inr.*?successful|payment\s+of\s+inr.*?successful|transaction\s+of\s+rs.*?successfully\s+approved)\b/i.test(body)) {
    return false;
  }

  // ── GUARD 0: Pre-Debit Alerts & Upcoming Auto-debit Alerts (without actual debit) → REJECT ──
  if (/\b(?:pre[- ]?debit(?:\s*alert)?|pre[- ]?notification|reminder\s+for\s+upcoming)\b/i.test(body)) {
    return true;
  }
  if (/\b(?:is\s+scheduled(?:\s+(?:from|for|on|to))?|scheduled\s+(?:for\s+debit|to\s+be\s+debited|on|for)|scheduled\s+debit)\b/i.test(body) &&
      !/\b(?:has\s+been\s+debited|was\s+debited|successfully\s+debited|debited\s+by|debited\s+from)\b/i.test(body)) {
    return true;
  }
  if (/\b(?:will\s+be\s+(?:auto[- ]?)?debited|will\s+be\s+deducted|will\s+be\s+charged|will\s+be\s+processed\s+on|to\s+be\s+debited\s+on|set\s+for\s+auto[- ]?debit\s+on)\b/i.test(body) &&
      !/\b(?:has\s+been\s+debited|was\s+debited|debited\s+from|debited\s+by)\b/i.test(body)) {
    return true;
  }
  if (/\b(?:mandate\s+created|mandate\s+registered|e-mandate\s+created|e-mandate\s+registered|mandate\s+set\s*up|autopay\s+set\s*up|autopay\s+registered|si\s+registered)\b/i.test(body) &&
      !/\b(?:debited\s+towards|debited\s+for|debited\s+from|debited\s+by|has\s+been\s+debited)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 1: OTP, 2FA, PINs, Passwords & Verification Messages → REJECT ──
  if (/\b(?:otp\s+is\s+\d{4,8}|your\s+otp\s+is|is\s+your\s+otp|one\s*time\s*password|verification\s*code\s*is|login\s*code\s*is|auth\s*code\s*is|tpin|m-pin)\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent|approved)\b/i.test(body)) {
    return true;
  }
  if (/\b(?:never\s+share\s+your\s+otp|do\s+not\s+share\s+your\s+otp|valid\s+for\s+\d+\s*min)\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent|approved|recharge)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 2: Loan Offers, Pre-Approved Loans, Inquiries & Lead Gen → REJECT ──
  if (/\b(?:pre[- ]?approved\s+(?:loan|offer|limit|credit|card|personal\s+loan)|pre[- ]?qualified|loan\s+offer|personal\s+loan\s+offer|instant\s+loan\s+offer|business\s+loan\s+application.*?approved\s+for|mudra\s+business\s+loan|cgtmse\s+business\s+loan|now\s+available\.\s+check\s+status)\b/i.test(body) &&
      !/\b(?:disbursed\s+to|credited\s+to\s+your|transferred\s+to\s+your|we\s+have\s+sent\s+rs)\b/i.test(body)) {
    return true;
  }
  if (/\b(?:eligible\s+for\s+(?:a\s+)?(?:personal\s+)?loan|check\s+(?:your\s+)?loan\s+eligibility|get\s+loan\s+up\s+to|avail\s+(?:instant\s+)?loan|apply\s+for\s+(?:a\s+)?loan|check\s+your\s+credit\s+score|cibil\s+score|crif\s+credit\s+report|ckyclr\s+record|ckycrr\s+record)\b/i.test(body) &&
      !/\b(?:disbursed\s+to|credited\s+to\s+your\s+(?:bank\s+)?a\/c|transferred\s+to\s+your\s+a\/c|debited|spent)\b/i.test(body)) {
    return true;
  }
  if (/\b(?:thanks\s+for\s+applying|thank\s+you\s+for\s+applying|loan\s+request.*?(?:is\s+)?received|application.*?(?:is\s+)?received|loan\s+application|in-principle\s+approval)\b/i.test(body) &&
      !/\b(?:disbursed\s+to|credited\s+to\s+your\s+(?:bank\s+)?a\/c|we\s+have\s+sent\s+rs)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 3: Credit Card Offers & Limit Increase Offers → REJECT ──
  if (/\b(?:lifetime\s+free\s+credit\s+card|pre[- ]?approved\s+credit\s+card|apply\s+for\s+credit\s+card|upgrade\s+your\s+card\s+limit|credit\s+limit\s+increase\s+offer)\b/i.test(body) &&
      !/\b(?:debited|spent|paid|charged|approved)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 4: Promotional, Marketing, Data Consumed Alerts & Spam → REJECT ──
  if (/\b(?:data\s+is\s+consumed|high\s+speed\s+data\s+is\s+consumed|pack\s+expiring|pack\s+on.*?has\s+expired|recharge\s+today\s+to\s+continue|cooling\s+period|beneficiary.*?activated|beneficiary\s+addition|opt\s+out\s+sms|claim\s+your\s+healthcare\s+benefits|claim\s+request\s+from.*?intimation|permitted\s+.*?to\s+collect|consented\s+to\s+share\s+account\s+data|calls\s+from.*?are\s+made\s+only|caseid.*?resolved|case\s+-\s+\d+\s+created|debit\s+card\s+will\s+be\s+discontinued|unrestricted\s+banking)\b/i.test(body) &&
      !/\b(?:debited|credited|spent|transferred|paid|refund|processed\s+against|we\s+have\s+received\s+rs|receipt\s+of\s+rs|recharge\s+of\s+inr.*?successful)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 5: Overdue Notices without Debit Confirmation → REJECT ──
  if (/\b(?:is\s+(?:now\s+)?\d+\s*days?\s*overdue|today\s+is\s+the\s+last\s+day\s+to\s+make\s+your\s+payment|tomorrow\s+is\s+the\s+last\s+day\s+to\s+clear|payment\s+is\s+due\s+\*tomorrow\*|loan\s+emi\s+is\s+one\s+day\s+of\s+delayed|next\s+payment\s+is\s+due\s+on)\b/i.test(body) &&
      !/\b(?:debited|credited|paid\s+via|transferred|charged|spent|settled|all\s+your\s+installments\s+have\s+been\s+paid)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 6: Balance Inquiries without Transaction → REJECT ────────
  if (/\b(?:balance\s+(?:is|in|as\s+on)|bal(?:ance)?[:\s]+(?:rs\.?|inr|₹|\$|€|£|aed|sar|sgd|aud|cad))\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent|transferred|withdrawn|refund|has\s+credit|direct\s+deposit|sent|received|auto[- ]?debit|deposit|charged|deducted|recharge\s+of|transaction\s+of|approved)\b/i.test(body)) {
    return true;
  }

  // ── GUARD 7: Security, Consent & AA Consent → REJECT ───────
  if (/\b(?:you\s+have\s+permitted|you\s+consented\s+to\s+share|consent\s+through\s+the\s+link|revoked?\s+the\s+consent)\b/i.test(body) &&
      !/\b(?:debited|credited|paid|spent)\b/i.test(body)) {
    return true;
  }

  return false;
}

/**
 * Extract currency symbol or code from SMS body.
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
    if (raw.startsWith('sgd')) return 'SGD';
    if (raw.startsWith('aud')) return 'AUD';
    if (raw.startsWith('cad')) return 'CAD';
    if (raw.startsWith('₹') || raw.startsWith('inr') || raw.startsWith('rs')) return '₹';
  }

  const suffixMatch = body.match(/[\d,]+(?:\.\d{1,2})?\s*(?:(\$|€|£|₹|¥)|(usd|eur|gbp|aed|sar|qar|omr|kwd|bhd|sgd|aud|cad|nzd|chf|jpy|cny|myr|thb|php|idr|zar|inr|rs\.?))\b/i);
  if (suffixMatch) {
    const code = (suffixMatch[1] || suffixMatch[2] || '').toLowerCase();
    if (code === '$' || code === 'usd') return '$';
    if (code === '€' || code === 'eur') return '€';
    if (code === '£' || code === 'gbp') return '£';
    if (code === '₹' || code === 'inr' || code.startsWith('rs')) return '₹';
  }

  return '₹';
}

/**
 * Extract transaction date from SMS text across all Indian bank formats.
 * Falls back to the provided fallback timestamp if no inline date is matched.
 */
export function extractDateFromSms(body: string, fallbackTimestamp: number): number {
  const monthMap: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // 1. "on date 17Aug26", "on 17Aug26", "11Jul26", "27Jun26", "24Jun26", "13Aug26", "21Jul26", "12Jul26", "26Jul26"
  const dmyAlphaMatch = body.match(/\b(?:on\s+date\s+|on\s+)?(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})\b/i);
  if (dmyAlphaMatch) {
    const day = parseInt(dmyAlphaMatch[1], 10);
    const mStr = dmyAlphaMatch[2].toLowerCase();
    let year = parseInt(dmyAlphaMatch[3], 10);
    if (year < 100) year += 2000;
    if (monthMap[mStr] !== undefined && day >= 1 && day <= 31) {
      const dt = new Date(year, monthMap[mStr], day, 12, 0, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  // 2. "Jul 10 2026 11:02AM", "Jul  7 2026 10:30AM"
  const mdyTimeMatch = body.match(/\b([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i);
  if (mdyTimeMatch) {
    const mStr = mdyTimeMatch[1].toLowerCase();
    const day = parseInt(mdyTimeMatch[2], 10);
    const year = parseInt(mdyTimeMatch[3], 10);
    let hours = parseInt(mdyTimeMatch[4], 10);
    const minutes = parseInt(mdyTimeMatch[5], 10);
    const ampm = (mdyTimeMatch[6] || '').toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    if (monthMap[mStr] !== undefined && day >= 1 && day <= 31) {
      const dt = new Date(year, monthMap[mStr], day, hours, minutes, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  // 3. "27-08-26", "02-08-2026 22:49", "02-07-2026 16:22", "29-Jul-2026", "29-Jun-2026", "28-Jun-26", "dt. 29-Jul-2026"
  const dmyHyphenMatch = body.match(/\b(?:dt\.?\s*|on\s+)?(\d{1,2})-([A-Za-z]{3}|\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?\b/i);
  if (dmyHyphenMatch) {
    const day = parseInt(dmyHyphenMatch[1], 10);
    const mStr = dmyHyphenMatch[2].toLowerCase();
    let year = parseInt(dmyHyphenMatch[3], 10);
    if (year < 100) year += 2000;
    const hours = dmyHyphenMatch[4] ? parseInt(dmyHyphenMatch[4], 10) : 12;
    const minutes = dmyHyphenMatch[5] ? parseInt(dmyHyphenMatch[5], 10) : 0;
    const month = monthMap[mStr] !== undefined ? monthMap[mStr] : parseInt(mStr, 10) - 1;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day, hours, minutes, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  // 4. "06/08/26", "28/07/26", "13/08/2026", "10/07/2026", "03/07/2026", "17/06/2026", "22/07/2026", "26/07/2026"
  const dmySlashMatch = body.match(/\b(?:on\s+)?(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i);
  if (dmySlashMatch) {
    const day = parseInt(dmySlashMatch[1], 10);
    const month = parseInt(dmySlashMatch[2], 10) - 1;
    let year = parseInt(dmySlashMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  // 5. ISO format: "2026-08-25", "2026-07-14 18:09:07"
  const isoMatch = body.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\b/i);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 12;
    const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dt = new Date(year, month, day, hours, minutes, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  // 6. "25 Aug 2026", "14 Aug 2026", "05 September 2026", "05 July 2026"
  const dmyNamedSpaceMatch = body.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/i);
  if (dmyNamedSpaceMatch) {
    const day = parseInt(dmyNamedSpaceMatch[1], 10);
    const mStr = dmyNamedSpaceMatch[2].substring(0, 3).toLowerCase();
    const year = parseInt(dmyNamedSpaceMatch[3], 10);
    if (monthMap[mStr] !== undefined && day >= 1 && day <= 31) {
      const dt = new Date(year, monthMap[mStr], day, 12, 0, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  return fallbackTimestamp || Date.now();
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
    .replace(/(?:[xX]{1,}|[*]{1,})\s*\d{3,8}/g, ' ')
    .replace(/(?:avail(?:able)?\s*bal(?:ance)?|bal(?:ance)?|clear\s*bal(?:ance)?|avail\s*limit)\s*(?:is|:)?\s*(?:rs\.?|inr|₹|\$|€|£|aed|sar|sgd|aud|cad)?\s*[\d,]+(?:\.\d{1,2})?/gi, ' ')
    .replace(/(?:rs\.?|inr|₹|\$|€|£|aed|sar|sgd|aud|cad)\s*[\d,]+(?:\.\d{1,2})?\s*(?:avail(?:able)?\s*bal(?:ance)?)/gi, ' ')
    .replace(/(?:upi\s*ref|rrn|utr|txn\s*id|trxn\s*id|ref\s*no|reference\s*(?:no|id)|txn\s*ref|refno|rt\s*no|gl\s*no)[:\s#.]*[a-zA-Z0-9/_]{8,35}/gi, ' ')
    .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, ' ')
    .replace(/\b1800\d{6,8}\b/g, ' ')
    .replace(/\b(?:9008915353|1800-420-1199|18004252255|1800111109|18001234|9071300112|8031290850|7984479612|18002667711|8688968075|9133263911)\b/g, ' ');

  const curr = '(?:rs\\.?|inr|₹|\\$|€|£|¥|aed|sar|qar|omr|kwd|bhd|sgd|aud|cad|nzd|chf|jpy|cny|myr|thb|php|idr|zar)';

  // ── Step 2: Context-aware amount extraction ────────────────────────
  const amountPatterns = [
    // 1. "debited by 80.00", "debited by Rs 353.00", "credited with Rs20.00", "credited with 20.00", "spent $45.80"
    new RegExp(`(?:debited|credited|spent|paid|sent|withdrawn|received|transferred|charged|deducted|authorized|used\\s+for)\\s+(?:for|by|with|of|to)?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 2. "Rs.1657.70 debited from", "Rs.1700.00 credited to", "Amount 2550.00 credited"
    new RegExp(`(?:amount\\s+)?${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:debited|credited|transferred|withdrawn|deposited|charged|spent|used)`, 'i'),

    // 3. "repaying Rs. 1935.00", "repayment of Rs 1033.72", "sent Rs. 5,540"
    new RegExp(`(?:repaying|repayment\\s+of|sent)\\s+${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 4. "purchase of $45.80" / "transaction of Rs 100.00" / "payment of £24.99" / "Recharge of INR 379.00"
    new RegExp(`(?:transaction|txn|purchase|payment|debit|credit|direct\\s+deposit|recharge|receipt)\\s+(?:of|for|on)?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 5. "loan EMI Rs. 1619", "EMI Rs 1619", "loan EMI of Rs. 1619"
    new RegExp(`(?:loan\\s*emi|emi)\\s+(?:of|is)?\\s*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 6. "credit for UPI/REVERSAL/... of Rs 1.00"
    new RegExp(`(?:credit|debit)\\s+for\\s+.*?\\s+of\\s+${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 7. "Rs 179880 processed", "Rs.180000.00/-from"
    new RegExp(`${curr}\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:\\/-\\s*from|\\s+(?:has\\s+been\\s+)?(?:processed|executed))`, 'i'),

    // 8. "Amount: $500", "Amt: Rs.500", "amounting to Rs. 7800.00", "Total Premium: Rs.5,107/-"
    new RegExp(`(?:amount|amt|txn\\s*amt|txn\\s*amount|amounting\\s+to|total\\s*premium)[:\\s.]*${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 9. Amount before "has been" / "is" / "was" + verb ("$45.80 was used", "£150 was credited")
    new RegExp(`${curr}?\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:has\\s+been|is|was)\\s+(?:debited|credited|paid|transferred|withdrawn|deposited|charged|sent|received|approved|spent|used|cleared)`, 'i'),

    // 10. Standard Currency + number ("$45.80", "€89.00", "AED 350.00", "SGD 18.50", "Rs. 1,499.00", "INR 4366.0")
    new RegExp(`${curr}\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'),

    // 11. Number with Currency suffix ("75.20 CAD", "55.00 AUD", "500 INR")
    new RegExp(`([\\d,]+(?:\\.\\d{1,2})?)\\s*${curr}\\b`, 'i'),
  ];

  for (const pattern of amountPatterns) {
    const match = cleanedBody.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
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
    /\bcredited\s+with\b/i,
    /\bcredited\s+to\b/i,
    /\bcredited\s+into\b/i,
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
    /\bwe\s+have\s+sent\s+(?:rs\.?|inr|₹)?\s*[\d,]+\s+to\s+your\s+account\b/i,
    /\bcleared\s+and\s+credited\b/i,
    /\bamount\s+[\d.]+\s+credited\s+into\s+your\s+bank\s+account\b/i,
  ];

  const debitRegexes = [
    /\bdebited\b/i,
    /\bdebited\s+by\b/i,
    /\bdebited\s+from\b/i,
    /\bdebited\s+with\b/i,
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
    /\bloan\s*emi\b/i,
    /\bemi\b/i,
    /\bauto[\s-]*debit\b/i,
    /\bnach\b/i,
    /\bstanding\s*instruction\b/i,
    /\bbill\s*(?:paid|payment|pay)\b/i,
    /\btrf\s+to\b/i,
    /\btransfer\s+to\b/i,
    /\btransaction\s+of\s+.*?\s+approved\b/i,
    /\bsuccessfully\s+approved\b/i,
    /\bzelle\s+to\b/i,
    /\bvenmo\s+to\b/i,
    /\bcash\s*app\s+to\b/i,
    /\bapple\s*pay\b/i,
    /\bgoogle\s*pay\b/i,
    /\brecharge\s+of\s+.*?\s+is\s+successful\b/i,
    /\border\s+.*?\s+at\s+.*?\s+is\s+successful\b/i,
    /\brepaying\s+rs\b/i,
    /\brepayment\s+of\s+rs\b/i,
    /\breceipt\s+of\s+rs\b/i,
    /\breceived\s+rs\b.*?\bfor\s+your\s+policy\b/i,
  ];

  const hasCredit = creditRegexes.some(rx => rx.test(body));
  const hasDebit = debitRegexes.some(rx => rx.test(body));

  if (hasCredit && !hasDebit) return 'credit';
  if (hasDebit && !hasCredit) return 'debit';

  if (hasCredit && hasDebit) {
    if (/refund|cashback|salary|reversal|disburs|credited\s+to|has\s+credit|will\s+be\s+credited|credit\s+for\s+upi|direct\s+deposit|sent\s+rs.*?to\s+your\s+account|credited\s+into/i.test(body)) return 'credit';
    if (/debited|spent|paid\s+to|transferred\s+to|trf\s+to|emi|loan\s*emi|approved|authorized|used\s+at|used\s+for|repaying|repayment|recharge\s+of/i.test(body)) return 'debit';
  }

  if (/\bloan\s*emi.*received/i.test(body)) return 'debit';
  if (/\breceived\s+rs.*?policy/i.test(body)) return 'debit';
  if (/\breceipt\s+of\s+rs/i.test(body)) return 'debit';
  if (/\breceived\s+from/i.test(body)) return 'credit';
  if (/\breceived\b/i.test(body)) return 'credit';

  if (/a\/?c\s*(?:has\s*been\s*)?(?:debited|debit)/i.test(body)) return 'debit';
  if (/a\/?c\s*(?:has\s*been\s*)?(?:credited|credit|has\s+credit)/i.test(body)) return 'credit';

  return null;
}

/**
 * Extract Bank Name from sender ID or body
 */
function extractBankName(address: string, body: string): string | undefined {
  const addressUpper = (address || '').toUpperCase().trim();
  const sortedEntries = Object.entries(BANK_SENDER_PATTERNS).sort((a, b) => b[0].length - a[0].length);

  for (const [key, name] of sortedEntries) {
    const rx = new RegExp(`(?:^|[\\s_-]|\\b)${key}(?:$|[\\s_-]|\\b)`, 'i');
    if (rx.test(addressUpper)) return name;
  }

  const prefixMatch = body.match(/^([A-Za-z\s&]+):/);
  if (prefixMatch) {
    const prefixUpper = prefixMatch[1].toUpperCase();
    for (const [key, name] of sortedEntries) {
      const rx = new RegExp(`\\b${key}\\b`, 'i');
      if (rx.test(prefixUpper)) return name;
    }
  }

  const bodyUpper = body.toUpperCase();
  if (/\bSURYODAY\b/i.test(bodyUpper)) return 'Suryoday Small Finance Bank';
  if (/\bMUTHOOT\b/i.test(bodyUpper)) return 'Muthoot Finance';
  if (/\bTRUE\s*CREDITS\b/i.test(bodyUpper)) return 'True Credits';
  if (/\bSBI\b|\bSTATE\s*BANK\b/i.test(bodyUpper)) return 'State Bank of India';
  if (/\bFEDERAL\s*BANK\b/i.test(bodyUpper)) return 'Federal Bank';
  if (/\bHDFC\b/i.test(bodyUpper)) return 'HDFC Bank';
  if (/\bICICI\b/i.test(bodyUpper)) return 'ICICI Bank';
  if (/\bAXIS\b/i.test(bodyUpper)) return 'Axis Bank';
  if (/\bKOTAK\b/i.test(bodyUpper)) return 'Kotak Mahindra Bank';
  if (/\bPNB\b/i.test(bodyUpper)) return 'Punjab National Bank';
  if (/\bBANK\s*OF\s*BARODA\b|\bBOB\b/i.test(bodyUpper)) return 'Bank of Baroda';
  if (/\bCANARA\b/i.test(bodyUpper)) return 'Canara Bank';
  if (/\bUNION\s*BANK\b/i.test(bodyUpper)) return 'Union Bank of India';
  if (/\bIDFC\b/i.test(bodyUpper)) return 'IDFC FIRST Bank';
  if (/\bRWALLET\b/i.test(bodyUpper)) return 'IRCTC RWallet';

  for (const [key, name] of sortedEntries) {
    const rx = new RegExp(`\\b${key}\\b`, 'i');
    if (rx.test(body)) {
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
    /(?:card|debit\s*card|credit\s*card)\s*ending\s*(?:in|with)?\s*(\d{3,5})/i,
    /(?:card|debit\s*card|credit\s*card)\s*(?:no\.?|number|#)?\s*:?\s*(?:[xX*]+\s*)?(\d{3,6})/i,
    /(?:a\/c|account|acct)\s*(?:no\.?|number|#)?\s*:?\s*(?:[xX*]+\s*)?(\d{3,8})/i,
    /(?:[xX]{1,}|[*]{1,})\s*(\d{3,8})/,
    /ending\s+(?:in|with)?\s*(\d{3,5})/i,
    /\b(RWallet)\b/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      if (match[1].toLowerCase() === 'rwallet') return 'RWallet';
      return `XX${match[1]}`;
    }
  }

  return undefined;
}

/**
 * Extract Reference Number / UTR / UPI Ref ID / Transaction ID
 */
function extractReferenceNumber(body: string): string | undefined {
  const patterns = [
    /(?:upi\/(?:reversal|p2p|cr|dr|p2m)\/|rrn|utr|txn\s*id|trxn\s*id|transaction\s*id|transaction\s*ref|ref\s*no|reference\s*no|reference\s*id|txn\s*ref|refno|rt\s*no)[:\s#/]*([a-zA-Z0-9/_]{6,35})/i,
    /via\s+ref\s*(?:no\.?)?[:\s#]*([a-zA-Z0-9]{8,22})/i,
    /\bref\s*[:\s#]*([a-zA-Z0-9]{8,22})/i,
    /\bGL\s*no\.?\s*([A-Za-z0-9/]+)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
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
    .replace(/^nach[- ]+/i, '')
    .replace(/^si[- ]+/i, '')
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
    .replace(/\s*will\s+happen.*$/i, '')
    .replace(/\s*will\s+be.*$/i, '')
    .replace(/\s*is\s+scheduled.*$/i, '')
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

  // 3. "trf to X Refno" / "transfer to X" (All Indian UPI Debit SMS format)
  const trfMatch = body.match(/(?:trf|transfer)\s+to\s+([A-Za-z0-9\s._&'-]{2,40}?)(?=\s+(?:Refno|ref|Ref|UPI|upi|on\s+date|on\s+\d|\.|,|$))/i);
  if (trfMatch && trfMatch[1]) {
    const candidate = cleanMerchantName(trfMatch[1]);
    if (candidate.length >= 2 && !isNoiseWord(candidate)) {
      const known = matchKnownMerchant(candidate);
      return known || candidate;
    }
  }

  // 4. Order at MERCHANT / Payment for order ... at MERCHANT
  const orderMatch = body.match(/order\s+.*?\s+at\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:is\s+successful|has\s+been|on|via|ref|\.|,|$))/i);
  if (orderMatch && orderMatch[1]) {
    const candidate = cleanMerchantName(orderMatch[1]);
    if (candidate.length >= 2) return candidate;
  }

  // 5. Policy payments: "for your policy - Star Health" / "Receipt of Rs ... dt ... -Star Health"
  const policyMatch = body.match(/(?:for\s+your\s+policy|always\s+at\s+your\s+service)\s*[-:]?\s*([A-Za-z0-9\s._&'-]{2,35}?)(?:\.|$)/i);
  if (policyMatch && policyMatch[1]) {
    const candidate = cleanMerchantName(policyMatch[1]);
    if (candidate.length >= 2 && !isNoiseWord(candidate)) return candidate;
  }

  // 6. Mobile Recharge: "for your Airtel Mobile" / "for your Jio Mobile"
  const rechargeMatch = body.match(/for\s+your\s+([A-Za-z0-9\s._&'-]{2,25}?\s+(?:Mobile|Number|Recharge))/i);
  if (rechargeMatch && rechargeMatch[1]) {
    const candidate = cleanMerchantName(rechargeMatch[1]);
    if (candidate.length >= 2) return candidate;
  }

  // 7. Wallet transactions: "debited from your RWallet Account" / "credited to your RWallet Account"
  const walletSenderMatch = body.match(/from\s+your\s+([A-Za-z0-9\s._&'-]{2,25}?\s+Account)\s+on.*?[-.]\s*([A-Za-z0-9\s._&'-]{2,30}?)(?:\.|$)/i);
  if (walletSenderMatch && walletSenderMatch[2]) {
    const candidate = cleanMerchantName(walletSenderMatch[2]);
    if (candidate.length >= 2) return candidate;
  }
  const walletCreditMatch = body.match(/credited\s+to\s+your\s+([A-Za-z0-9\s._&'-]{2,25}?\s+Account)\s+on.*?[-.]\s*(?:Now\s+the\s+Available\s+Balance\s+is\s+[\d.]+\.\s*)?([A-Za-z0-9\s._&'-]{2,30}?)(?:\.|$)/i);
  if (walletCreditMatch && walletCreditMatch[2]) {
    const candidate = cleanMerchantName(walletCreditMatch[2]);
    if (candidate.length >= 2) return candidate;
  }

  // 8. Loan repayments: "repaying Rs. ... - Pocket Mitra Team"
  const repayMatch = body.match(/repaying\s+.*?[-–]\s*([A-Za-z0-9\s._&'-]{2,35}?)(?:\.|$)/i);
  if (repayMatch && repayMatch[1]) {
    const candidate = cleanMerchantName(repayMatch[1]);
    if (candidate.length >= 2 && !isNoiseWord(candidate)) return candidate;
  }

  // 9. Loan processed: "processed against GL no ... Muthoot Finance"
  const processedAgainstMatch = body.match(/processed\s+against\s+.*?[-.]\s*([A-Za-z0-9\s._&'-]{2,35}?)(?:\.|$)/i);
  if (processedAgainstMatch && processedAgainstMatch[1]) {
    const candidate = cleanMerchantName(processedAgainstMatch[1]);
    if (candidate.length >= 2 && !isNoiseWord(candidate)) return candidate;
  }

  // 10. Check UPI VPA handle in body
  const vpa = extractUpiVpa(body);
  if (vpa) {
    return vpaToDisplayName(vpa);
  }

  // 11. NACH context: "towards NACH-NIPPON INDIA MF"
  const nachMatch = body.match(/(?:towards|for)\s+NACH-([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|\.|,)|$)/i);
  if (nachMatch && nachMatch[1]) {
    const cleaned = cleanMerchantName(nachMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // 12. UPI slash match (UPI/P2P/XXXX/MERCHANT)
  const upiMerchant = extractUpiMerchant(body);
  if (upiMerchant) {
    const known = matchKnownMerchant(upiMerchant);
    if (known) return known;
    const cleaned = cleanMerchantName(upiMerchant);
    if (cleaned.length >= 2 && !isNoiseWord(cleaned)) {
      return cleaned.length > 30 ? cleaned.substring(0, 30) : cleaned;
    }
  }

  // 13. Contextual debit / credit regexes
  const debitPatterns = [
    /(?:used\s+for\s+[^\s]+\s+at|spent\s+[^\s]+\s+at|purchase\s+at|spent\s+at|used\s+at|txn\s+at|authorized\s+at)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|with|\.|,)|$)/i,
    /(?:paid\s+to|sent\s+to|transferred\s+to|transfer\s+to)\s+([A-Za-z0-9\s._&'@-]{2,35}?)(?=\s+(?:with\s+zelle|with\s+venmo|via|on|ref|using|avail|bal|a\/c|from|UPI|upi|Ref|for|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
    /(?:payment\s+(?:of\s+[^\s]+\s+)?(?:was\s+)?made\s+to)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i,
    /(?:debited\s+for|paid\s+for|charged\s+for|billed\s+for)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|subscription|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
    /(?:debited|charged|used)\s+(?:(?:rs\.?|\$|€|£|aed|sgd)\s*[\d,]+(?:\.\d{1,2})?\s+)?at\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|\.|,)|$)/i,
    /(?:towards|for)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|from|is|has|Rs|INR|₹|\$|€|£|per|monthly|subscription|\.|,)|$)/i,
    /\bto\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:with\s+zelle|with\s+venmo|via|Ref|ref|UPI|upi|on\s+\d|\.|,)|$)/i,
  ];

  const creditPatterns = [
    /(?:direct\s+deposit\s+(?:of\s+[^\s]+\s+)?from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:was|is|on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i,
    /(?:received\s+(?:[^\s]+\s+)?from|transferred\s+from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|to|Rs|INR|₹|\$|€|£|\.|,)|$)/i,
    /(?:credited\s+by|refund\s+from|refund\s+by|cashback\s+from)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|using|avail|bal|a\/c|\.|,)|$)/i,
    /(?:salary\s+from|salary\s+credited\s+by)\s+([A-Za-z0-9\s._&'-]{2,35}?)(?=\s+(?:on|via|ref|\.|,)|$)/i,
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

  // Fallbacks
  if (type === 'credit') {
    if (/salary/i.test(body)) return 'Salary Deposit';
    if (/refund/i.test(body)) return 'Refund';
    if (/cashback/i.test(body)) return 'Cashback Reward';
    if (/reversal/i.test(body)) return 'Payment Reversal';
    if (/loan\s*disburs|credited\s+into\s+your\s+bank/i.test(body)) return 'Loan Disbursement';
    if (/interest/i.test(body)) return 'Interest Credit';
    return 'Incoming Transfer';
  }

  if (/atm|cash\s*withdrawal/i.test(body)) return 'ATM Withdrawal';
  if (/emi|loan/i.test(body)) return 'EMI Payment';
  if (/bill|utility|electricity|water|gas/i.test(body)) return 'Bill Payment';
  if (/insurance|policy|premium/i.test(body)) return 'Insurance Premium';
  if (/recharge|airtel|jio|vi\b/i.test(body)) return 'Mobile Recharge';
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
  return /^(?:the|your|bank|account|rs|inr|balance|successful|ref|you|and|for|from|with|has|been|upi|neft|imps|rtgs|nach|via|payment|transaction|txn|amt|amount|order)$/i.test(name);
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
    if (lower.includes('loan') || lower.includes('disburs') || lower.includes('muthoot') || lower.includes('rupeeredee') || lower.includes('branch')) return 'Income';
    if (lower.includes('wallet') || lower.includes('added')) return 'Wallet Top-up';
    return 'Income';
  }

  // Investment (SIP, Mutual Funds, Stocks)
  if (/mutual\s*fund|\bsip\b|investment|growth\s*fund|zerodha|groww|upstox|coinswitch|\bamc\b/i.test(lower)) return 'Investment';

  // Cheque
  if (/cheque|chq/i.test(lower)) return 'Cheque Transfer';

  // EMI & Loans
  if (/\bemi\b|\bloan\b|true\s*credits|moneyview|creditsea|\bbranch\b|bajaj|hero\s*fincorp|tata\s*capital|home\s*credit|pocket\s*mitra|trustpaisa|rupeeredee|fatakpay|credit\s*line|paytm\s*postpaid/i.test(lower)) return 'EMI & Loans';

  // Insurance
  if (/insurance|premium|policy|lic\b|hdfc\s*ergo|prudential|sbi\s*life|hdfc\s*life|star\s*health/i.test(lower)) return 'Insurance';

  // Entertainment & OTT & Subscriptions
  if (/netflix|spotify|hotstar|prime|youtube|apple|google\s*one|google\s*play|movie|bookmyshow|sonyliv|zee5|jiocinema|disney|hulu|hbo|paramount|playstation|xbox|canva|adobe|audible|gaana|coursera|discovery|times\s*prime/i.test(lower)) return 'Entertainment';

  // Food & Dining
  if (/swiggy|zomato|mcdonald|kfc|starbucks|burger|pizza|restaurant|cafe|food|dining|eats|dominos?|subway|chipotle|tim\s*hortons|chai\s*point|barbeque\s*nation/i.test(lower)) return 'Food & Dining';

  // Shopping & Retail
  if (/amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|store|mall|retail|mart|bazaar|croma|reliance\s*digital|bigbasket|blinkit|zepto|instamart|dmart|walmart|target|costco|zara|h&m|decathlon|lenskart|sonu\s*marketing/i.test(lower)) return 'Shopping';

  // Travel & Fuel
  if (/uber|ola|rapido|metro|irctc|indian\s*railway|rwallet|ir-cris|redbus|flight|indigo|train|toll|fastag|petrol|fuel|garuda\s*filling|makemytrip|goibibo|cleartrip|lyft|grab|bolt|hpcl|iocl|dunzo/i.test(lower)) return 'Travel & Fuel';

  // Bills & Utilities & Recharge
  if (/recharge|\bjio\b|\bairtel\b|\bvi\b|bescom|electricity|power|water|\bgas\b|broadband|wifi|dth|tata\s*play|fibernet|svs\s*online/i.test(lower)) return 'Bills & Utilities';

  // Health & Medical
  if (/pharmacy|apollo|medplus|1mg|hospital|clinic|\bdoctor\b|health|pharmeasy|practo|cult\.?fit/i.test(lower)) return 'Health & Medical';

  // Housing & Rent
  if (/\brent\b|maintenance|society/i.test(lower)) return 'Housing & Rent';

  // ATM
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

  // 1. Extract transaction date from SMS body (falling back to SMS timestamp)
  const transactionDate = extractDateFromSms(body, date);

  // 2. Sender / Body financial validation
  if (!isFinancialSender(address, body)) {
    return { transaction: null, rejectionReason: 'NON_FINANCIAL_SENDER' };
  }

  // 3. Reject non-transactional / pure OTP / marketing noise
  if (isNonTransactional(body)) {
    return { transaction: null, rejectionReason: 'NON_TRANSACTIONAL_NOISE' };
  }

  // 4. Extract Amount
  const amount = extractAmount(body);
  if (!amount) {
    return { transaction: null, rejectionReason: 'NO_AMOUNT_EXTRACTED', details: { matchedSender: true } };
  }

  // 5. Extract Transaction Type (Debit vs Credit)
  const type = determineTransactionType(body);
  if (!type) {
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
    : `pb-${transactionDate}-${amount}-${merchantHash}`;

  const transaction: PassbookTransaction = {
    id,
    type,
    amount,
    currency,
    date: transactionDate,
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
 * Parse a batch of SMS messages, filtering strictly to the last 90 days and sorting by date descending
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
 * Clean up / Prune transactions older than 90 days
 */
export function pruneOlderThan30Days(transactions: PassbookTransaction[]): PassbookTransaction[] {
  const cutoff = Date.now() - NINETY_DAYS_MS;
  return transactions.filter(t => t.date >= cutoff);
}
