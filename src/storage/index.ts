import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { Subscription, AppSettings, AutopayTransaction, PassbookTransaction } from '../types';

let storage: MMKV | null = null;

export function getStorage(): MMKV {
  if (!storage) {
    storage = createMMKV({ id: 'upi-subscription-tracker' });
  }
  return storage;
}

const KEYS = {
  SUBSCRIPTIONS: 'subscriptions',
  SETTINGS: 'settings',
  PROCESSED_SMS_IDS: 'processed_sms_ids',
  AUTOPAY_TRANSACTIONS: 'autopay_transactions',
  WELCOME_COMPLETED: 'welcome_completed',
  DELETED_SUBSCRIPTIONS: 'deleted_subscriptions',
  DELETED_AUTOPAY: 'deleted_autopay',
  PASSBOOK_TRANSACTIONS: 'passbook_transactions',
};

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  lastSmsSync: 0,
  trackAutopay: true, // Enable autopay tracking by default
  alarmTimeBeforeDue: 8, // Default 8 AM for 1-2 days before
  alarmTimeOnDueDate: 6, // Default 6 AM on payment date
};

export function isAppSubscription(sub: Subscription): boolean {
  if (sub.source === 'manual') return true;
  if (sub.amount <= 0) return false;
  const { isKnownSubscriptionService, findMerchantPattern } = require('../utils/merchantPatterns');
  const pattern = findMerchantPattern(sub.merchantName);
  if (pattern && !pattern.isSubscription) return false;
  return isKnownSubscriptionService(sub.merchantName);
}

export function getSubscriptions(): Subscription[] {
  const data = getStorage().getString(KEYS.SUBSCRIPTIONS);
  if (!data) return [];
  try {
    const list: Subscription[] = JSON.parse(data);
    const { calculateNextRenewal } = require('../utils/subscriptionDetector');
    const now = Date.now();
    let hasChanges = false;
    const valid = list.filter(isAppSubscription).map(sub => {
      if (sub.nextRenewalDate && sub.nextRenewalDate <= now) {
        const futureDate = calculateNextRenewal(sub.lastPaymentDate || sub.nextRenewalDate, sub.billingCycle || 'monthly');
        hasChanges = true;
        return { ...sub, nextRenewalDate: futureDate };
      }
      return sub;
    });
    if (valid.length !== list.length || hasChanges) {
      saveSubscriptions(valid);
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveSubscriptions(subscriptions: Subscription[]): void {
  getStorage().set(KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
}

export function addSubscription(subscription: Subscription): void {
  const existing = getSubscriptions();
  
  // Import tier check
  const { getSubscriptionTier } = require('../services/subscriptionService');
  const tier = getSubscriptionTier();
  
  // Final safeguard: don't add if at limit
  if (!tier.isPro && existing.length >= tier.maxSubscriptions) {
    console.warn(`[Storage] Blocked add: already at limit (${existing.length}/${tier.maxSubscriptions})`);
    return;
  }
  
  existing.push(subscription);
  saveSubscriptions(existing);
  console.log(`[Storage] Added subscription: ${existing.length}/${tier.isPro ? '∞' : tier.maxSubscriptions}`);
}

export function updateSubscription(id: string, updates: Partial<Subscription>): void {
  const subscriptions = getSubscriptions();
  const index = subscriptions.findIndex(s => s.id === id);
  if (index !== -1) {
    subscriptions[index] = { ...subscriptions[index], ...updates };
    saveSubscriptions(subscriptions);
  }
}

export function deleteSubscription(id: string): void {
  const subscriptions = getSubscriptions().filter(s => s.id !== id);
  saveSubscriptions(subscriptions);
  
  // Track this deletion to prevent re-detection
  addDeletedSubscription(id);
}

// Deleted subscriptions tracking
export function getDeletedSubscriptions(): Set<string> {
  const data = getStorage().getString(KEYS.DELETED_SUBSCRIPTIONS);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function addDeletedSubscription(id: string): void {
  const deleted = getDeletedSubscriptions();
  deleted.add(id);
  getStorage().set(KEYS.DELETED_SUBSCRIPTIONS, JSON.stringify([...deleted]));
  console.log(`[Storage] Marked subscription as deleted: ${id}`);
}

export function isSubscriptionDeleted(id: string): boolean {
  return getDeletedSubscriptions().has(id);
}

export function clearDeletedSubscriptions(): void {
  getStorage().remove(KEYS.DELETED_SUBSCRIPTIONS);
}

export function getSettings(): AppSettings {
  const data = getStorage().getString(KEYS.SETTINGS);
  const settings = data ? JSON.parse(data) : DEFAULT_SETTINGS;
  
  // Ensure new fields have default values for existing users
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
}

export function saveSettings(settings: AppSettings): void {
  getStorage().set(KEYS.SETTINGS, JSON.stringify(settings));
}

export function getProcessedSmsIds(): Set<string> {
  const data = getStorage().getString(KEYS.PROCESSED_SMS_IDS);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function addProcessedSmsId(id: string): void {
  const ids = getProcessedSmsIds();
  ids.add(id);
  getStorage().set(KEYS.PROCESSED_SMS_IDS, JSON.stringify([...ids]));
}

export function mergeSubscriptions(detected: Subscription[], existing: Subscription[]): Subscription[] {
  const manualSubs = existing.filter(s => s.source === 'manual');
  const existingIds = new Set(existing.map(s => s.id));
  const deletedIds = getDeletedSubscriptions();
  
  // Filter out deleted subscriptions and non-app subscriptions from detected
  const validDetected = detected.filter(s => !deletedIds.has(s.id) && isAppSubscription(s));
  
  console.log(`[Storage] Merge: ${detected.length} detected, ${deletedIds.size} deleted, ${validDetected.length} valid`);
  
  // Add new detected subscriptions (not deleted, not existing)
  const newDetected = validDetected.filter(s => !existingIds.has(s.id));
  
  // Update existing SMS-detected subscriptions (also filtered to app subscriptions)
  const updatedSms = existing
    .filter(s => s.source === 'sms' && isAppSubscription(s))
    .map(existingSub => {
      const updated = validDetected.find(d => d.id === existingSub.id);
      return updated || existingSub;
    });

  return [...manualSubs, ...updatedSms, ...newDetected];
}

// Autopay transaction storage
export function getAutopayTransactions(): AutopayTransaction[] {
  const data = getStorage().getString(KEYS.AUTOPAY_TRANSACTIONS);
  if (!data) return [];
  try {
    const list: AutopayTransaction[] = JSON.parse(data);
    const { calculateNextAutopayDate } = require('../utils/autopayTracker');
    const now = Date.now();
    let hasChanges = false;
    const updated = list.map(item => {
      if (item.nextPaymentDate && item.nextPaymentDate <= now && item.billingCycle) {
        const futureDate = calculateNextAutopayDate(item.date || item.nextPaymentDate, item.billingCycle);
        hasChanges = true;
        return { ...item, nextPaymentDate: futureDate };
      }
      return item;
    });
    if (hasChanges) {
      saveAutopayTransactions(updated);
    }
    return updated;
  } catch {
    return [];
  }
}

export function saveAutopayTransactions(transactions: AutopayTransaction[]): void {
  getStorage().set(KEYS.AUTOPAY_TRANSACTIONS, JSON.stringify(transactions));
}

export function deleteAutopayTransaction(id: string): void {
  const transactions = getAutopayTransactions().filter(t => t.id !== id);
  saveAutopayTransactions(transactions);
  
  // Track this deletion to prevent re-detection
  addDeletedAutopay(id);
}



// Deleted autopay tracking
export function getDeletedAutopay(): Set<string> {
  const data = getStorage().getString(KEYS.DELETED_AUTOPAY);
  return data ? new Set(JSON.parse(data)) : new Set();
}

export function addDeletedAutopay(id: string): void {
  const deleted = getDeletedAutopay();
  deleted.add(id);
  getStorage().set(KEYS.DELETED_AUTOPAY, JSON.stringify([...deleted]));
  console.log(`[Storage] Marked autopay as deleted: ${id}`);
}

export function isAutopayDeleted(id: string): boolean {
  return getDeletedAutopay().has(id);
}

export function clearDeletedAutopay(): void {
  getStorage().remove(KEYS.DELETED_AUTOPAY);
}

// Welcome screen tracking
export function hasCompletedWelcome(): boolean {
  return getStorage().getBoolean(KEYS.WELCOME_COMPLETED) || false;
}

export function setWelcomeCompleted(): void {
  getStorage().set(KEYS.WELCOME_COMPLETED, true);
}

// Passbook / All Transactions (30-day rolling window)
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getPassbookTransactions(): PassbookTransaction[] {
  const data = getStorage().getString(KEYS.PASSBOOK_TRANSACTIONS);
  if (!data) return [];
  try {
    const list: PassbookTransaction[] = JSON.parse(data);
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const { isNonTransactional } = require('../utils/passbookParser');
    let hasChanges = false;
    const valid = list.filter(t => {
      if (t.date < cutoff) {
        hasChanges = true;
        return false;
      }
      if (t.rawSms && isNonTransactional(t.rawSms)) {
        hasChanges = true;
        return false;
      }
      return true;
    });
    if (hasChanges || valid.length !== list.length) {
      getStorage().set(KEYS.PASSBOOK_TRANSACTIONS, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export function savePassbookTransactions(transactions: PassbookTransaction[]): void {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const valid = transactions.filter(t => t.date >= cutoff);
  getStorage().set(KEYS.PASSBOOK_TRANSACTIONS, JSON.stringify(valid));
}

export function addPassbookTransaction(transaction: PassbookTransaction): void {
  const existing = getPassbookTransactions();
  // Prevent duplicates
  const exists = existing.some(t => t.id === transaction.id || (t.referenceNumber && t.referenceNumber === transaction.referenceNumber));
  if (!exists) {
    const updated = [transaction, ...existing].sort((a, b) => b.date - a.date);
    savePassbookTransactions(updated);
  }
}

export function clearPassbookTransactions(): void {
  getStorage().remove(KEYS.PASSBOOK_TRANSACTIONS);
}

