import type { RawSms, ParsedTransaction, Subscription, AutopayTransaction } from '../types';
import { parseSms } from './smsParser';
import { detectSubscriptions } from './subscriptionDetector';
import { extractAutopayTransactions } from './autopayDetector';
import { getStorage } from '../storage';

const LAST_SYNC_TIMESTAMP_KEY = 'last_sms_sync_timestamp';
const PROCESSED_SMS_HASHES_KEY = 'processed_sms_hashes';

/**
 * Get the timestamp of the last successful SMS sync
 */
export function getLastSyncTimestamp(): number {
  return getStorage().getNumber(LAST_SYNC_TIMESTAMP_KEY) || 0;
}

/**
 * Update the last sync timestamp
 */
export function updateLastSyncTimestamp(timestamp: number): void {
  getStorage().set(LAST_SYNC_TIMESTAMP_KEY, timestamp);
}

/**
 * Get set of processed SMS hashes to avoid duplicates
 */
export function getProcessedSmsHashes(): Set<string> {
  const data = getStorage().getString(PROCESSED_SMS_HASHES_KEY);
  return data ? new Set(JSON.parse(data)) : new Set();
}

/**
 * Add SMS hash to processed set
 */
export function addProcessedSmsHash(hash: string): void {
  const hashes = getProcessedSmsHashes();
  hashes.add(hash);
  
  // Keep only last 10000 hashes to prevent unlimited growth
  const hashArray = Array.from(hashes);
  if (hashArray.length > 10000) {
    hashArray.splice(0, hashArray.length - 10000);
  }
  
  getStorage().set(PROCESSED_SMS_HASHES_KEY, JSON.stringify(hashArray));
}

/**
 * Generate a hash for SMS message to detect duplicates
 */
export function generateSmsHash(sms: RawSms): string {
  // Use body + date + address as unique identifier
  return `${sms.date}-${sms.address}-${sms.body.substring(0, 50)}`;
}

/**
 * Filter SMS messages to only include new ones since last sync
 */
export function filterNewSms(allSms: RawSms[], lastSyncTimestamp: number): RawSms[] {
  const processedHashes = getProcessedSmsHashes();
  
  return allSms.filter(sms => {
    // Filter by timestamp (with 1 hour buffer to catch any edge cases)
    const bufferTime = 60 * 60 * 1000; // 1 hour
    if (sms.date < lastSyncTimestamp - bufferTime) {
      return false;
    }
    
    // Filter by hash to avoid duplicates
    const hash = generateSmsHash(sms);
    if (processedHashes.has(hash)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Mark SMS messages as processed
 */
export function markSmsAsProcessed(smsMessages: RawSms[]): void {
  smsMessages.forEach(sms => {
    const hash = generateSmsHash(sms);
    addProcessedSmsHash(hash);
  });
}

/**
 * Perform incremental SMS sync
 * Returns only new transactions since last sync
 */
export function performIncrementalSync(
  allSms: RawSms[],
  lastSyncTimestamp: number
): {
  newTransactions: ParsedTransaction[];
  processedCount: number;
  skippedCount: number;
} {
  const newSms = filterNewSms(allSms, lastSyncTimestamp);
  const skippedCount = allSms.length - newSms.length;
  
  console.log(`[IncrementalSync] Total SMS: ${allSms.length}, New: ${newSms.length}, Skipped: ${skippedCount}`);
  
  const newTransactions: ParsedTransaction[] = [];
  
  for (const sms of newSms) {
    const parsed = parseSms(sms);
    if (parsed) {
      newTransactions.push(parsed);
    }
  }
  
  // Mark as processed
  markSmsAsProcessed(newSms);
  
  // Update last sync timestamp
  updateLastSyncTimestamp(Date.now());
  
  return {
    newTransactions,
    processedCount: newSms.length,
    skippedCount,
  };
}

/**
 * Merge new transactions with existing subscriptions
 * Only updates existing subscriptions or adds new ones
 */
export function mergeNewTransactions(
  newTransactions: ParsedTransaction[],
  existingSubscriptions: Subscription[]
): {
  updatedSubscriptions: Subscription[];
  newSubscriptions: Subscription[];
  updatedCount: number;
} {
  if (newTransactions.length === 0) {
    return {
      updatedSubscriptions: existingSubscriptions,
      newSubscriptions: [],
      updatedCount: 0,
    };
  }
  
  // Detect new subscriptions from transactions
  const detectedSubscriptions = detectSubscriptions(newTransactions);
  
  let updatedCount = 0;
  const updatedSubscriptions = [...existingSubscriptions];
  const newSubscriptions: Subscription[] = [];
  
  for (const detected of detectedSubscriptions) {
    const existingIndex = updatedSubscriptions.findIndex(
      s => s.merchantName.toLowerCase() === detected.merchantName.toLowerCase() &&
           s.amount === detected.amount
    );
    
    if (existingIndex >= 0) {
      // Update existing subscription
      updatedSubscriptions[existingIndex] = {
        ...updatedSubscriptions[existingIndex],
        lastPaymentDate: detected.lastPaymentDate,
        nextRenewalDate: detected.nextRenewalDate,
        transactions: [
          ...(updatedSubscriptions[existingIndex].transactions || []),
          ...(detected.transactions || []),
        ],
      };
      updatedCount++;
    } else {
      // New subscription
      newSubscriptions.push(detected);
    }
  }
  
  return {
    updatedSubscriptions: [...updatedSubscriptions, ...newSubscriptions],
    newSubscriptions,
    updatedCount,
  };
}

/**
 * Clear sync history (useful for debugging or reset)
 */
export function clearSyncHistory(): void {
  getStorage().delete(LAST_SYNC_TIMESTAMP_KEY);
  getStorage().delete(PROCESSED_SMS_HASHES_KEY);
  console.log('[IncrementalSync] Sync history cleared');
}
