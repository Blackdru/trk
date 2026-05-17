import { Linking, Platform } from 'react-native';

/**
 * Deep Link Service - Context-aware redirection engine for subscription cancellation
 * 
 * Handles opening apps and providing guided cancellation flows for:
 * - UPI apps (PhonePe, GPay, Paytm)
 * - Banking apps (SBI YONO, HDFC, ICICI, etc.)
 * - Play Store for app subscriptions
 * 
 * PRIVACY: All processing happens locally on-device.
 */

export type AppTarget = 
  | 'phonepe' 
  | 'gpay' 
  | 'paytm' 
  | 'sbi' 
  | 'hdfc' 
  | 'icici' 
  | 'axis' 
  | 'kotak'
  | 'playstore'
  | 'unknown';

export interface AppScheme {
  scheme: string;
  packageId: string;
  fallbackUrl: string;
}

export interface CancellationGuide {
  appName: string;
  steps: string[];
  estimatedTime: string; // e.g., "2 minutes"
}

// Known app schemes for Indian payment apps
// Note: These schemes open the app's main screen only
// The modal provides clear step-by-step instructions for users to navigate within the app
const APP_SCHEMES: Record<AppTarget, AppScheme> = {
  phonepe: {
    scheme: 'phonepe://home', // Opens PhonePe home screen
    packageId: 'com.phonepe.app',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
  },
  gpay: {
    scheme: 'tez://home', // Opens GPay home screen
    packageId: 'com.google.android.apps.nbu.paisa.user',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
  },
  paytm: {
    scheme: 'paytmmp://home', // Opens Paytm home screen
    packageId: 'net.one97.paytm',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
  },
  sbi: {
    scheme: 'sbiyono://', // Opens SBI YONO app
    packageId: 'com.sbi.lotusintouch',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.sbi.lotusintouch',
  },
  hdfc: {
    scheme: 'hdfcbank://', // Opens HDFC Bank app
    packageId: 'com.snapwork.hdfc',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.snapwork.hdfc',
  },
  icici: {
    scheme: 'imobile://', // Opens iMobile Pay app
    packageId: 'com.csam.icici.bank.imobile',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.csam.icici.bank.imobile',
  },
  axis: {
    scheme: 'axismobile://', // Opens Axis Mobile app
    packageId: 'com.axis.mobile',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.axis.mobile',
  },
  kotak: {
    scheme: 'kotak811://', // Opens Kotak 811 app
    packageId: 'com.msf.kbank.mobile',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.msf.kbank.mobile',
  },
  playstore: {
    scheme: 'market://details?id=',
    packageId: '',
    fallbackUrl: 'https://play.google.com/store/apps/details?id=',
  },
  unknown: {
    scheme: '',
    packageId: '',
    fallbackUrl: '',
  },
};

// Cancellation guides for each app
const CANCELLATION_GUIDES: Record<AppTarget, CancellationGuide> = {
  phonepe: {
    appName: 'PhonePe',
    steps: [
      'Tap on your Profile icon at the top-left corner',
      'Select "Payment Methods or Manage Payments" from the menu',
      'Go to "Autopay" section',
      'Find and tap on your subscription',
      'Tap "Delete Autopay" and confirm',
    ],
    estimatedTime: '2 minutes',
  },
  gpay: {
    appName: 'Google Pay',
    steps: [
      'Tap on your Profile icon at the top-right corner',
      'Select "Autopay" from the menu',
      'Find your subscription in the list',
      'Tap on the subscription to open details',
      'Tap "Cancel" and confirm your choice',
    ],
    estimatedTime: '1-2 minutes',
  },
  paytm: {
    appName: 'Paytm',
    steps: [
      'Tap on your Profile icon',
      'Go to "Automatic Payments"',
      'Find your subscription in the list',
      'Tap "Cancel Automatic Payment" and confirm',
    ],
    estimatedTime: '2 minutes',
  },
  sbi: {
    appName: 'SBI YONO',
    steps: [
      'Login to YONO app with your credentials',
      'Tap on your Profile icon',
      'Go to "Manage My Accounts" section',
      'click "Manage UPI"',
      'Select "Manage UPI Autopay"',
      'Find your EMI/subscription',
      'Tap "Cancel Autopay" and confirm',
    ],
    estimatedTime: '2-3 minutes',
  },
  hdfc: {
    appName: 'HDFC Bank',
    steps: [
      'Login to HDFC Bank app',
      'Go to "Payments" section',
      'Select "Manage Auto Debit"',
      'Find your subscription',
      'Tap "Cancel" and confirm',
    ],
    estimatedTime: '2-3 minutes',
  },
  icici: {
    appName: 'iMobile Pay',
    steps: [
      'Login to iMobile Pay app',
      'Go to "Pay" section',
      'Select "Manage Autopay"',
      'Find your subscription',
      'Tap "Cancel" and confirm',
    ],
    estimatedTime: '2 minutes',
  },
  axis: {
    appName: 'Axis Mobile',
    steps: [
      'Login to Axis Mobile app',
      'Go to "Payments & Transfer"',
      'Select "Manage Mandates"',
      'Find your subscription',
      'Tap "Cancel" and confirm',
    ],
    estimatedTime: '2-3 minutes',
  },
  kotak: {
    appName: 'Kotak 811',
    steps: [
      'Login to Kotak 811 app',
      'Go to "Payments" section',
      'Select "Manage Autopay"',
      'Find your subscription',
      'Tap "Cancel" and confirm',
    ],
    estimatedTime: '2 minutes',
  },
  playstore: {
    appName: 'Google Play Store',
    steps: [
      'Open Google Play Store app',
      'Tap on your Profile icon (top-right)',
      'Select "Payments & subscriptions"',
      'Tap "Subscriptions"',
      'Find and tap on your subscription',
      'Tap "Cancel subscription" and confirm',
    ],
    estimatedTime: '1-2 minutes',
  },
  unknown: {
    appName: 'Your Payment App',
    steps: [
      'Open your UPI app (PhonePe/GPay/Paytm)',
      'Go to Profile then Autopay/Mandates section',
      'Find the subscription in the list',
      'Tap Cancel and confirm',
      'Wait for confirmation message',
    ],
    estimatedTime: '2-3 minutes',
  },
};

/**
 * Detect which app to open based on merchant name, SMS content, and manual selection
 */
export function detectAppTarget(merchantName: string, rawSms?: string, paymentApp?: string): AppTarget {
  // If user manually specified the payment app, use that
  if (paymentApp && paymentApp !== 'unknown') {
    return paymentApp as AppTarget;
  }
  
  const searchText = `${merchantName} ${rawSms || ''}`.toLowerCase();
  
  // Check for specific app mentions in SMS
  if (searchText.includes('phonepe')) return 'phonepe';
  if (searchText.includes('gpay') || searchText.includes('google pay')) return 'gpay';
  if (searchText.includes('paytm')) return 'paytm';
  
  // Check for bank mentions
  if (searchText.includes('sbi') || searchText.includes('state bank')) return 'sbi';
  if (searchText.includes('hdfc')) return 'hdfc';
  if (searchText.includes('icici')) return 'icici';
  if (searchText.includes('axis')) return 'axis';
  if (searchText.includes('kotak')) return 'kotak';
  
  // Check for app subscriptions (should go to Play Store)
  const appSubscriptions = [
    'netflix', 'spotify', 'youtube', 'prime', 'hotstar', 'disney',
    'google one', 'google play', 'apple music', 'adobe', 'microsoft',
    'sonyliv', 'zee5', 'voot', 'mx player', 'gaana',
  ];
  
  if (appSubscriptions.some(app => searchText.includes(app))) {
    return 'playstore';
  }
  
  // Default to unknown (will show generic UPI guide)
  return 'unknown';
}

/**
 * Get cancellation guide for a specific app
 */
export function getCancellationGuide(target: AppTarget): CancellationGuide {
  return CANCELLATION_GUIDES[target];
}

/**
 * Check if an app can be opened
 */
export async function canOpenApp(target: AppTarget): Promise<boolean> {
  if (target === 'unknown') return false;
  
  const scheme = APP_SCHEMES[target];
  if (!scheme.scheme) return false;
  
  try {
    return await Linking.canOpenURL(scheme.scheme);
  } catch (error) {
    console.error(`[DeepLink] Error checking if ${target} can be opened:`, error);
    return false;
  }
}

/**
 * Open the target app or fallback to Play Store
 */
export async function openApp(target: AppTarget, packageId?: string): Promise<boolean> {
  if (target === 'unknown') {
    return false;
  }
  
  const scheme = APP_SCHEMES[target];
  
  try {
    // For Play Store subscriptions, open directly to subscriptions management page
    if (target === 'playstore') {
      const subscriptionsUrl = 'https://play.google.com/store/account/subscriptions';
      
      try {
        await Linking.openURL(subscriptionsUrl);
        return true;
      } catch (error) {
        console.error('[DeepLink] Error opening subscriptions page:', error);
        await Linking.openURL('https://play.google.com/store');
        return true;
      }
    }
    
    // For payment/banking apps, try to open using the scheme
    try {
      const canOpen = await Linking.canOpenURL(scheme.scheme);
      
      if (canOpen) {
        await Linking.openURL(scheme.scheme);
        return true;
      }
    } catch (schemeError) {
      console.log(`[DeepLink] Scheme ${scheme.scheme} failed, trying fallback`);
    }
    
    // If scheme fails or app not installed, open Play Store to install
    await Linking.openURL(scheme.fallbackUrl);
    return false; // Return false to indicate app wasn't installed or scheme failed
    
  } catch (error) {
    console.error(`[DeepLink] Error opening ${target}:`, error);
    
    // Last resort: try opening Play Store
    try {
      await Linking.openURL(scheme.fallbackUrl);
      return false;
    } catch (fallbackError) {
      console.error(`[DeepLink] Fallback also failed:`, fallbackError);
      return false;
    }
  }
}

/**
 * Get package ID for app subscriptions (for Play Store deep link)
 */
export function getPackageIdForSubscription(merchantName: string): string | null {
  const name = merchantName.toLowerCase();
  
  const packageMap: Record<string, string> = {
    'netflix': 'com.netflix.mediaclient',
    'spotify': 'com.spotify.music',
    'youtube premium': 'com.google.android.youtube',
    'youtube music': 'com.google.android.apps.youtube.music',
    'amazon prime': 'com.amazon.avod.thirdpartyclient',
    'disney+ hotstar': 'in.startv.hotstar',
    'hotstar': 'in.startv.hotstar',
    'google one': 'com.google.android.apps.subscriptions.red',
    'google play': 'com.android.vending',
    'apple music': 'com.apple.android.music',
    'microsoft 365': 'com.microsoft.office.officehubrow',
    'adobe': 'com.adobe.cc',
    'sonyliv': 'com.sonyliv',
    'zee5': 'com.graymatrix.did',
    'voot': 'com.tv.v18.viola',
    'mx player': 'com.mxtech.videoplayer.ad',
    'gaana': 'com.gaana',
    'jiohotstar': 'in.startv.hotstar',
  };
  
  for (const [key, packageId] of Object.entries(packageMap)) {
    if (name.includes(key)) {
      return packageId;
    }
  }
  
  return null;
}
