import { getStorage } from '../storage';

const STORAGE_KEYS = {
  IS_PRO: 'is_pro_user',
  PRO_EXPIRY: 'pro_expiry_date',
};

export interface SubscriptionTier {
  isPro: boolean;
  maxSubscriptions: number;
  maxAutopay: number;
  hasAds: boolean;
  hasAutopayTracking: boolean;
}

export function getSubscriptionTier(): SubscriptionTier {
  const storage = getStorage();
  const isPro = storage.getBoolean(STORAGE_KEYS.IS_PRO) || false;
  const proExpiry = storage.getNumber(STORAGE_KEYS.PRO_EXPIRY) || 0;
  const now = Date.now();

  // Check if pro subscription is still valid
  const isProActive = isPro && proExpiry > now;

  console.log('[SubscriptionService] Tier check:');
  console.log('  - isPro (stored):', isPro);
  console.log('  - proExpiry:', proExpiry, '(', new Date(proExpiry).toISOString(), ')');
  console.log('  - now:', now, '(', new Date(now).toISOString(), ')');
  console.log('  - proExpiry > now:', proExpiry > now);
  console.log('  - isProActive:', isProActive);

  return {
    isPro: isProActive,
    maxSubscriptions: isProActive ? Infinity : 3,
    maxAutopay: isProActive ? Infinity : 3,
    hasAds: !isProActive,
    hasAutopayTracking: true, // Now available for free users with limit
  };
}

export function setProStatus(isPro: boolean, expiryDate?: number): void {
  const storage = getStorage();
  console.log('[SubscriptionService] Setting Pro status:', isPro, 'expiry:', expiryDate, 'type:', typeof expiryDate);
  storage.set(STORAGE_KEYS.IS_PRO, isPro);
  if (expiryDate) {
    // Ensure we're storing as number
    const expiryNumber = typeof expiryDate === 'string' ? parseInt(expiryDate, 10) : expiryDate;
    storage.set(STORAGE_KEYS.PRO_EXPIRY, expiryNumber);
    console.log('[SubscriptionService] Stored expiry as number:', expiryNumber);
  } else if (!isPro) {
    // Clear expiry if setting to free - set to 0 instead of delete
    storage.set(STORAGE_KEYS.PRO_EXPIRY, 0);
  }
}

export function canAddSubscription(currentCount: number): boolean {
  const tier = getSubscriptionTier();
  // For pro users, always allow
  if (tier.isPro) {
    return true;
  }
  // For free users, check if adding one more would exceed limit
  return currentCount < tier.maxSubscriptions;
}

export function getSubscriptionLimitMessage(): string {
  const tier = getSubscriptionTier();
  if (tier.isPro) {
    return 'Unlimited subscriptions';
  }
  return `Free: ${tier.maxSubscriptions} subscriptions max`;
}
