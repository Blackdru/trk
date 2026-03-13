import { Platform } from 'react-native';
import { setProStatus } from './subscriptionService';

// Lazy import to prevent crashes if package not installed
let Purchases: any = null;
let LOG_LEVEL: any = null;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default;
  LOG_LEVEL = PurchasesModule.LOG_LEVEL;
} catch (error) {
  console.warn('[RevenueCat] Package not installed, running in mock mode');
}

// RevenueCat API keys
// Production keys - used for release builds
const REVENUECAT_API_KEY_ANDROID_PROD = 'goog_XvIqbAwRDSspoZBIrjTvxRgVwWF';
const REVENUECAT_API_KEY_IOS_PROD = 'YOUR_IOS_API_KEY_HERE';

// Test keys - used for debug builds and emulators
const REVENUECAT_API_KEY_ANDROID_TEST = 'test_loZRxDLeQgzwdkrlFuIrrSxacUo';
const REVENUECAT_API_KEY_IOS_TEST = 'YOUR_IOS_TEST_API_KEY_HERE';

// Detect if running in debug mode or on emulator
const isDebugOrEmulator = (): boolean => {
  // Check if running in debug mode
  if (__DEV__) {
    return true;
  }
  
  // Additional check for emulator (can be enhanced)
  // This is a simple heuristic - you can add more checks if needed
  return false;
};

// Select appropriate API key based on environment
const getRevenueCatApiKey = (): string => {
  const isTest = isDebugOrEmulator();
  
  if (Platform.OS === 'android') {
    return isTest ? REVENUECAT_API_KEY_ANDROID_TEST : REVENUECAT_API_KEY_ANDROID_PROD;
  } else if (Platform.OS === 'ios') {
    return isTest ? REVENUECAT_API_KEY_IOS_TEST : REVENUECAT_API_KEY_IOS_PROD;
  }
  
  return '';
};

const REVENUECAT_API_KEY = getRevenueCatApiKey();

// Type definitions for when package is available
export type PurchasesOffering = any;
export type CustomerInfo = any;
export type PurchasesPackage = any;

// Callback for pro status changes
let proStatusChangeCallback: ((isPro: boolean) => void) | null = null;

export function setProStatusChangeCallback(callback: (isPro: boolean) => void): void {
  proStatusChangeCallback = callback;
}

// Check if RevenueCat is initialized
let isInitialized = false;

export function isRevenueCatInitialized(): boolean {
  return isInitialized && Purchases !== null;
}

export function isUsingTestEnvironment(): boolean {
  return isDebugOrEmulator();
}

export function getCurrentApiKeyInfo(): { environment: string; keyPrefix: string } {
  const isTest = isDebugOrEmulator();
  return {
    environment: isTest ? 'TEST' : 'PRODUCTION',
    keyPrefix: REVENUECAT_API_KEY.substring(0, 15) + '...',
  };
}

export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (!Purchases) {
    console.warn('[RevenueCat] SDK not available, skipping initialization');
    return;
  }

  // Check if API key is configured
  if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY.includes('YOUR_')) {
    console.warn('[RevenueCat] API key not configured. Please add your RevenueCat API keys.');
    console.warn('[RevenueCat] Get your keys from: https://app.revenuecat.com/settings/api-keys');
    return;
  }

  try {
    const isTest = isDebugOrEmulator();
    const environment = isTest ? 'TEST' : 'PRODUCTION';
    const keyPrefix = REVENUECAT_API_KEY.substring(0, 10);
    
    console.log(`[RevenueCat] Initializing with ${environment} API key (${keyPrefix}...)`);
    console.log(`[RevenueCat] Environment: __DEV__=${__DEV__}, Platform=${Platform.OS}`);
    
    Purchases.setLogLevel(LOG_LEVEL.WARN); // Reduce log noise
    
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId,
    });

    console.log('[RevenueCat] Initialized successfully');
    isInitialized = true;
    
    // Listen for customer info updates (purchases, restores, etc.)
    Purchases.addCustomerInfoUpdateListener((customerInfo: CustomerInfo) => {
      console.log('[RevenueCat] Customer info updated');
      checkProEntitlement(customerInfo);
    });
    
    // Check initial subscription status (with error handling)
    try {
      await checkSubscriptionStatus();
    } catch (statusError) {
      console.warn('[RevenueCat] Could not check initial status:', statusError);
      // Don't fail initialization if status check fails
    }
  } catch (error) {
    console.error('[RevenueCat] Initialization error:', error);
    // Don't throw - allow app to continue without RevenueCat
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!Purchases) {
    console.warn('[RevenueCat] SDK not available');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null) {
      return offerings.current;
    }
    console.warn('[RevenueCat] No current offering found');
    return null;
  } catch (error: any) {
    console.warn('[RevenueCat] Error fetching offerings:', error.message || error);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  if (!Purchases) {
    console.warn('[RevenueCat] SDK not available');
    return false;
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = checkProEntitlement(customerInfo);
    
    if (isPro) {
      console.log('[RevenueCat] Purchase successful, user is now Pro');
      return true;
    } else {
      // Sometimes entitlement takes a moment to process, retry once
      console.log('[RevenueCat] Entitlement not immediately active, retrying...');
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      const retryInfo = await Purchases.getCustomerInfo();
      const retryIsPro = checkProEntitlement(retryInfo);
      
      if (retryIsPro) {
        console.log('[RevenueCat] Purchase successful after retry, user is now Pro');
        return true;
      }
      
      console.warn('[RevenueCat] Purchase completed but entitlement not active');
      return false;
    }
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[RevenueCat] Purchase cancelled by user');
    } else {
      console.error('[RevenueCat] Purchase error:', error);
    }
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!Purchases) {
    console.error('[RevenueCat] ❌ SDK not available');
    return false;
  }

  if (!isInitialized) {
    console.error('[RevenueCat] ❌ RevenueCat not initialized. Call initializeRevenueCat first.');
    return false;
  }

  try {
    console.log('[RevenueCat] Starting restore purchases...');
    
    // Call restore purchases
    const customerInfo = await Purchases.restorePurchases();
    
    console.log('[RevenueCat] Restore API call completed');
    console.log('[RevenueCat] Customer Info:', JSON.stringify({
      originalAppUserId: customerInfo.originalAppUserId,
      activeSubscriptions: customerInfo.activeSubscriptions,
      allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      entitlements: Object.keys(customerInfo.entitlements.active || {}),
    }));
    
    // Check if user has pro entitlement
    const isPro = checkProEntitlement(customerInfo);
    
    if (isPro) {
      console.log('[RevenueCat] ✅ Purchases restored successfully, user is Pro');
      return true;
    } else {
      // Check if there are any purchases at all
      const hasPurchases = customerInfo.allPurchasedProductIdentifiers && 
                          customerInfo.allPurchasedProductIdentifiers.length > 0;
      
      if (hasPurchases) {
        console.warn('[RevenueCat] ⚠️ User has purchases but no active entitlement');
        console.warn('[RevenueCat] Purchased products:', customerInfo.allPurchasedProductIdentifiers);
        
        // Wait and retry once
        console.log('[RevenueCat] Retrying entitlement check...');
        await new Promise<void>(resolve => setTimeout(resolve, 2000));
        
        const retryInfo = await Purchases.getCustomerInfo();
        const retryIsPro = checkProEntitlement(retryInfo);
        
        if (retryIsPro) {
          console.log('[RevenueCat] ✅ Restore successful after retry');
          return true;
        }
        
        console.warn('[RevenueCat] ❌ Entitlement still not active after retry');
        return false;
      } else {
        console.log('[RevenueCat] ℹ️ No purchases found to restore');
        return false;
      }
    }
  } catch (error: any) {
    console.error('[RevenueCat] ❌ Restore error:', error);
    console.error('[RevenueCat] Error details:', {
      message: error.message,
      code: error.code,
      userInfo: error.userInfo,
    });
    return false;
  }
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!Purchases) {
    console.warn('[RevenueCat] SDK not available, defaulting to free tier');
    setProStatus(false);
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return checkProEntitlement(customerInfo);
  } catch (error: any) {
    console.warn('[RevenueCat] Error checking subscription:', error.message || error);
    // Default to free tier on error
    setProStatus(false);
    return false;
  }
}

function checkProEntitlement(customerInfo: CustomerInfo): boolean {
  try {
    // IMPORTANT: Entitlement identifier must match EXACTLY what's in RevenueCat dashboard
    // Current value in RevenueCat: "upi subscription tracker Pro" (with spaces, capital P)
    const ENTITLEMENT_ID = 'upi subscription tracker Pro';
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    console.log('[RevenueCat] Checking entitlement - isPro:', isPro);
    console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active || {}));
    
    if (isPro) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      
      // For test/sandbox purchases, set expiry far in the future (10 years)
      // For production, use actual expiry date
      let expiryDate: number;
      
      if (isUsingTestEnvironment()) {
        // Test environment - set expiry 10 years from now
        expiryDate = Date.now() + (10 * 365 * 24 * 60 * 60 * 1000);
        console.log('[RevenueCat] Test environment - setting expiry 10 years from now');
      } else {
        // Production - use actual expiry or 1 year for lifetime
        expiryDate = entitlement.expirationDate 
          ? new Date(entitlement.expirationDate).getTime()
          : Date.now() + (365 * 24 * 60 * 60 * 1000);
      }
      
      console.log('[RevenueCat] User is Pro, expiry:', new Date(expiryDate));
      setProStatus(true, expiryDate);
      
      // Notify callback if registered
      if (proStatusChangeCallback) {
        proStatusChangeCallback(true);
      }
    } else {
      console.log('[RevenueCat] User is free tier');
      setProStatus(false);
      
      // Notify callback if registered
      if (proStatusChangeCallback) {
        proStatusChangeCallback(false);
      }
    }
    
    return isPro;
  } catch (error: any) {
    console.warn('[RevenueCat] Error checking entitlement:', error.message || error);
    setProStatus(false);
    return false;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!Purchases) {
    console.warn('[RevenueCat] SDK not available');
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] Error getting customer info:', error);
    return null;
  }
}
