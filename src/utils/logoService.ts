/**
 * Service to get subscription service logos from various CDNs
 */

interface LogoMapping {
  [key: string]: string;
}

/**
 * Manual logo mappings for popular services
 * Using reliable CDN sources
 */
const LOGO_MAPPINGS: LogoMapping = {
  // Streaming Services
  'netflix': 'https://logo.clearbit.com/netflix.com',
  'netflix subscription': 'https://logo.clearbit.com/netflix.com',
  'netflix india': 'https://logo.clearbit.com/netflix.com',
  'spotify': 'https://logo.clearbit.com/spotify.com',
  'spotify india': 'https://logo.clearbit.com/spotify.com',
  'amazon prime': 'https://logo.clearbit.com/primevideo.com',
  'prime video': 'https://logo.clearbit.com/primevideo.com',
  'hotstar': 'https://logo.clearbit.com/hotstar.com',
  'disney': 'https://logo.clearbit.com/disneyplus.com',
  'disney+': 'https://logo.clearbit.com/disneyplus.com',
  'disney+ hotstar': 'https://logo.clearbit.com/hotstar.com',
  'youtube premium': 'https://logo.clearbit.com/youtube.com',
  'youtube': 'https://logo.clearbit.com/youtube.com',
  'apple tv': 'https://logo.clearbit.com/apple.com',
  'apple music': 'https://logo.clearbit.com/apple.com',
  'zee5': 'https://logo.clearbit.com/zee5.com',
  'sonyliv': 'https://logo.clearbit.com/sonyliv.com',
  'voot': 'https://logo.clearbit.com/voot.com',
  'mx player': 'https://logo.clearbit.com/mxplayer.in',
  'aha': 'https://logo.clearbit.com/aha.video',
  
  // Cloud & Productivity
  'google one': 'https://logo.clearbit.com/google.com',
  'google': 'https://logo.clearbit.com/google.com',
  'icloud': 'https://logo.clearbit.com/icloud.com',
  'apple': 'https://logo.clearbit.com/apple.com',
  'microsoft 365': 'https://logo.clearbit.com/microsoft.com',
  'office 365': 'https://logo.clearbit.com/microsoft.com',
  'microsoft': 'https://logo.clearbit.com/microsoft.com',
  'dropbox': 'https://logo.clearbit.com/dropbox.com',
  'adobe': 'https://logo.clearbit.com/adobe.com',
  'zoom': 'https://logo.clearbit.com/zoom.us',
  'notion': 'https://logo.clearbit.com/notion.so',
  'evernote': 'https://logo.clearbit.com/evernote.com',
  
  // Food & Delivery
  'swiggy': 'https://logo.clearbit.com/swiggy.com',
  'swiggy one': 'https://logo.clearbit.com/swiggy.com',
  'zomato': 'https://logo.clearbit.com/zomato.com',
  'zomato gold': 'https://logo.clearbit.com/zomato.com',
  'uber eats': 'https://logo.clearbit.com/uber.com',
  'uber': 'https://logo.clearbit.com/uber.com',
  'ola': 'https://logo.clearbit.com/olacabs.com',
  'dunzo': 'https://logo.clearbit.com/dunzo.com',
  'blinkit': 'https://logo.clearbit.com/blinkit.com',
  'zepto': 'https://logo.clearbit.com/zeptonow.com',
  
  // Telecom
  'jio': 'https://logo.clearbit.com/jio.com',
  'airtel': 'https://logo.clearbit.com/airtel.in',
  'vodafone': 'https://logo.clearbit.com/vodafone.com',
  'vi': 'https://logo.clearbit.com/myvi.in',
  'bsnl': 'https://logo.clearbit.com/bsnl.co.in',
  
  // Fitness & Health
  'cult.fit': 'https://logo.clearbit.com/cure.fit',
  'cultfit': 'https://logo.clearbit.com/cure.fit',
  'healthify': 'https://logo.clearbit.com/healthifyme.com',
  'headspace': 'https://logo.clearbit.com/headspace.com',
  'calm': 'https://logo.clearbit.com/calm.com',
  
  // Reading & Learning
  'kindle': 'https://logo.clearbit.com/amazon.com',
  'audible': 'https://logo.clearbit.com/audible.com',
  'scribd': 'https://logo.clearbit.com/scribd.com',
  'medium': 'https://logo.clearbit.com/medium.com',
  'coursera': 'https://logo.clearbit.com/coursera.org',
  'udemy': 'https://logo.clearbit.com/udemy.com',
  'skillshare': 'https://logo.clearbit.com/skillshare.com',
  
  // News & Magazines
  'times prime': 'https://logo.clearbit.com/timesprime.com',
  'the hindu': 'https://logo.clearbit.com/thehindu.com',
  'times of india': 'https://logo.clearbit.com/timesofindia.com',
  
  // Gaming
  'playstation': 'https://logo.clearbit.com/playstation.com',
  'xbox': 'https://logo.clearbit.com/xbox.com',
  'nintendo': 'https://logo.clearbit.com/nintendo.com',
  'steam': 'https://logo.clearbit.com/steampowered.com',
  
  // VPN & Security
  'nordvpn': 'https://logo.clearbit.com/nordvpn.com',
  'expressvpn': 'https://logo.clearbit.com/expressvpn.com',
  '1password': 'https://logo.clearbit.com/1password.com',
  'lastpass': 'https://logo.clearbit.com/lastpass.com',
};

/**
 * Get logo URL for a merchant/service
 * @param merchantName - Name of the merchant/service
 * @returns Logo URL or null if not available
 */
export function getLogoUrl(merchantName: string): string | null {
  if (!merchantName) return null;
  
  const normalizedName = merchantName.toLowerCase().trim();
  
  // Check direct mapping first
  if (LOGO_MAPPINGS[normalizedName]) {
    return LOGO_MAPPINGS[normalizedName];
  }
  
  // Check partial matches
  for (const [key, url] of Object.entries(LOGO_MAPPINGS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return url;
    }
  }
  
  // Try to extract domain and use Clearbit
  const domain = extractDomain(merchantName);
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }
  
  return null;
}

/**
 * Extract domain from merchant name
 * e.g., "Netflix India" -> "netflix.com"
 */
function extractDomain(merchantName: string): string | null {
  const normalized = merchantName.toLowerCase().trim();
  
  // Common domain patterns
  const domainMap: { [key: string]: string } = {
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'amazon': 'amazon.com',
    'google': 'google.com',
    'apple': 'apple.com',
    'microsoft': 'microsoft.com',
    'adobe': 'adobe.com',
    'zoom': 'zoom.us',
    'dropbox': 'dropbox.com',
    'swiggy': 'swiggy.com',
    'zomato': 'zomato.com',
    'uber': 'uber.com',
    'ola': 'olacabs.com',
    'jio': 'jio.com',
    'airtel': 'airtel.in',
    'hotstar': 'hotstar.com',
    'disney': 'disneyplus.com',
    'youtube': 'youtube.com',
  };
  
  for (const [keyword, domain] of Object.entries(domainMap)) {
    if (normalized.includes(keyword)) {
      return domain;
    }
  }
  
  return null;
}

/**
 * Get fallback logo URLs to try if primary fails
 */
export function getFallbackLogoUrls(merchantName: string): string[] {
  const fallbacks: string[] = [];
  const normalized = merchantName.toLowerCase().trim();
  
  // Try different CDN services
  const domain = extractDomain(merchantName);
  if (domain) {
    // Clearbit (primary) - already tried in getLogoUrl
    // fallbacks.push(`https://logo.clearbit.com/${domain}`);
    
    // Logo.dev (alternative)
    fallbacks.push(`https://img.logo.dev/${domain}?token=pk_X-LztJ6qQGmFdYAuVRo_Ew`);
    
    // Unavatar
    fallbacks.push(`https://unavatar.io/${domain}`);
    
    // Google Favicon Service (high res)
    fallbacks.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    
    // Favicon.io
    fallbacks.push(`https://favicons.githubusercontent.com/${domain}`);
  }
  
  return fallbacks;
}

/**
 * Get placeholder color based on merchant name
 * Used when logo is not available
 */
export function getPlaceholderColor(merchantName: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#E76F51', '#2A9D8F', '#E9C46A', '#F4A261', '#264653',
  ];
  
  // Generate consistent color based on name
  let hash = 0;
  for (let i = 0; i < merchantName.length; i++) {
    hash = merchantName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from merchant name for placeholder
 */
export function getInitials(merchantName: string): string {
  if (!merchantName) return '?';
  
  const words = merchantName.trim().split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[1][0]).toUpperCase();
}
