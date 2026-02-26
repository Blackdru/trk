import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { Subscription, AppSettings } from '../types';

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
};

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  lastSmsSync: 0,
  trackAutopay: true, // Enable autopay tracking by default
};

export function getSubscriptions(): Subscription[] {
  const data = getStorage().getString(KEYS.SUBSCRIPTIONS);
  return data ? JSON.parse(data) : [];
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
  getStorage().delete(KEYS.DELETED_SUBSCRIPTIONS);
}

export function getSettings(): AppSettings {
  const data = getStorage().getString(KEYS.SETTINGS);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
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
  
  // Filter out deleted subscriptions from detected
  const validDetected = detected.filter(s => !deletedIds.has(s.id));
  
  console.log(`[Storage] Merge: ${detected.length} detected, ${deletedIds.size} deleted, ${validDetected.length} valid`);
  
  // Add new detected subscriptions (not deleted, not existing)
  const newDetected = validDetected.filter(s => !existingIds.has(s.id));
  
  // Update existing SMS-detected subscriptions
  const updatedSms = existing
    .filter(s => s.source === 'sms')
    .map(existingSub => {
      const updated = validDetected.find(d => d.id === existingSub.id);
      return updated || existingSub;
    });

  return [...manualSubs, ...updatedSms, ...newDetected];
}

// Autopay transaction storage
export function getAutopayTransactions(): any[] {
  const data = getStorage().getString(KEYS.AUTOPAY_TRANSACTIONS);
  return data ? JSON.parse(data) : [];
}

export function saveAutopayTransactions(transactions: any[]): void {
  getStorage().set(KEYS.AUTOPAY_TRANSACTIONS, JSON.stringify(transactions));
}

export function deleteAutopayTransaction(id: string): void {
  const transactions = getAutopayTransactions().filter(t => t.id !== id);
  saveAutopayTransactions(transactions);
  
  // Track this deletion to prevent re-detection
  addDeletedAutopay(id);
}

export function clearAutopayTransactions(): void {
  getStorage().delete(KEYS.AUTOPAY_TRANSACTIONS);
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
  getStorage().delete(KEYS.DELETED_AUTOPAY);
}

// Welcome screen tracking
export function hasCompletedWelcome(): boolean {
  return getStorage().getBoolean(KEYS.WELCOME_COMPLETED) || false;
}

export function setWelcomeCompleted(): void {
  getStorage().set(KEYS.WELCOME_COMPLETED, true);
}
