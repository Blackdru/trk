import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import type { Subscription, AutopayTransaction, ParsedTransaction } from '../types';
import { getSms } from '../native/SmsModule';
import { parseSms } from '../utils/smsParser';
import { detectSubscriptions, calculateNextRenewal } from '../utils/subscriptionDetector';
import { extractAutopayTransactions } from '../utils/autopayDetector';
import { enrichAutopayWithCycles } from '../utils/autopayTracker';
import { mergeSubscriptions, getDeletedAutopay, isSubscriptionDeleted, isAutopayDeleted } from '../storage';
import { getSubscriptionTier } from '../services/subscriptionService';
import {
  performIncrementalSync,
  mergeNewTransactions,
  getLastSyncTimestamp,
} from '../utils/incrementalSync';
import { createError, ErrorType, handleError, getUserFriendlyMessage, RetryableOperation } from '../utils/errorHandler';

export function useSmsSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  
  const syncSms = useCallback(async (
    existingSubscriptions: Subscription[],
    existingAutopay: AutopayTransaction[],
    trackAutopay: boolean,
    onSuccess: (subs: Subscription[], autopay: AutopayTransaction[], newCount: number) => void
  ) => {
    if (isSyncing) {
      console.log('[SmsSync] Sync already in progress, skipping');
      return;
    }
    
    setIsSyncing(true);
    
    try {
      console.log('[SmsSync] Starting incremental SMS sync...');
      
      const retryOperation = new RetryableOperation(3, 1000);
      
      // Fetch SMS with retry logic
      const smsMessages = await retryOperation.execute(
        () => getSms(),
        (attempt, error) => {
          console.log(`[SmsSync] Retry attempt ${attempt} after error:`, error);
        }
      );
      
      console.log(`[SmsSync] Retrieved ${smsMessages.length} SMS messages`);
      
      // Perform incremental sync
      const lastSync = getLastSyncTimestamp();
      const { newTransactions, processedCount, skippedCount } = performIncrementalSync(
        smsMessages,
        lastSync
      );
      
      console.log(`[SmsSync] Processed: ${processedCount}, Skipped: ${skippedCount}, New transactions: ${newTransactions.length}`);
      
      if (newTransactions.length === 0) {
        console.log('[SmsSync] No new transactions found');
        setIsSyncing(false);
        return;
      }
      
      // Separate autopay transactions
      const autopayTransactions = newTransactions.filter(
        t => t.paymentType === 'Autopay' || t.paymentType === 'Mandate'
      );
      
      console.log(`[SmsSync] Found ${autopayTransactions.length} autopay/mandate transactions`);
      
      // Merge new transactions with existing subscriptions
      const { updatedSubscriptions, newSubscriptions, updatedCount } = mergeNewTransactions(
        newTransactions,
        existingSubscriptions
      );
      
      console.log(`[SmsSync] Updated: ${updatedCount}, New: ${newSubscriptions.length}`);
      
      // Check subscription limit for free users
      const tier = getSubscriptionTier();
      let finalSubscriptions = updatedSubscriptions;
      
      if (!tier.isPro && updatedSubscriptions.length > tier.maxSubscriptions) {
        // Prioritize manual subscriptions
        const manualSubs = updatedSubscriptions.filter(s => s.source === 'manual');
        const smsSubs = updatedSubscriptions.filter(s => s.source === 'sms')
          .sort((a, b) => (b.lastPaymentDate || 0) - (a.lastPaymentDate || 0));
        
        finalSubscriptions = [...manualSubs, ...smsSubs].slice(0, tier.maxSubscriptions);
        
        console.log(`[SmsSync] Limited subscriptions from ${updatedSubscriptions.length} to ${finalSubscriptions.length}`);
      }
      
      // Handle autopay transactions
      let finalAutopay = existingAutopay;
      
      if (trackAutopay && tier.hasAutopayTracking && autopayTransactions.length > 0) {
        const autopayTxns = extractAutopayTransactions(autopayTransactions);
        console.log(`[SmsSync] Extracted ${autopayTxns.length} autopay transactions`);
        
        // Filter out deleted autopay
        const deletedAutopay = getDeletedAutopay();
        const validAutopay = autopayTxns.filter(txn => !deletedAutopay.has(txn.id));
        
        // Merge with existing (preserve manual entries)
        const manualAutopay = existingAutopay.filter(a => a.id.startsWith('manual-autopay-'));
        const mergedAutopay = [...manualAutopay, ...validAutopay];
        
        // Remove duplicates
        const uniqueAutopay = Array.from(
          new Map(mergedAutopay.map(item => [item.id, item])).values()
        );
        
        // Enrich with billing cycles
        finalAutopay = enrichAutopayWithCycles(uniqueAutopay);
        
        console.log(`[SmsSync] Final autopay count: ${finalAutopay.length}`);
      }
      
      // Call success callback
      onSuccess(finalSubscriptions, finalAutopay, newSubscriptions.length);
      
      console.log('[SmsSync] Sync completed successfully');
      
    } catch (error) {
      console.error('[SmsSync] Sync failed:', error);
      
      const appError = createError(
        ErrorType.SMS_SYNC_FAILED,
        `SMS sync failed: ${error}`,
        getUserFriendlyMessage(error),
        error,
        true
      );
      
      handleError(appError);
      
      Alert.alert(
        'Sync Failed',
        appError.userMessage,
        [
          { text: 'OK' },
          appError.retryable ? { text: 'Retry', onPress: () => syncSms(existingSubscriptions, existingAutopay, trackAutopay, onSuccess) } : undefined,
        ].filter(Boolean) as any
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);
  
  const handleNewTransaction = useCallback((
    transaction: ParsedTransaction,
    subscriptions: Subscription[],
    autopayTransactions: AutopayTransaction[],
    onSubscriptionUpdate: (subs: Subscription[]) => void,
    onAutopayUpdate: (autopay: AutopayTransaction[]) => void,
    onLimitReached: () => void
  ) => {
    console.log('[SmsSync] New transaction:', transaction.merchantName, transaction.amount, transaction.paymentType);
    
    // Handle autopay/mandate transactions
    if (transaction.paymentType === 'Autopay' || transaction.paymentType === 'Mandate') {
      const tier = getSubscriptionTier();
      
      if (tier.hasAutopayTracking) {
        const autopayTxns = extractAutopayTransactions([transaction]);
        
        if (autopayTxns.length > 0) {
          const newAutopay = autopayTxns[0];
          
          if (isAutopayDeleted(newAutopay.id)) {
            console.log('[SmsSync] Autopay was deleted, ignoring');
            return;
          }
          
          const exists = autopayTransactions.find(a => a.id === newAutopay.id);
          if (!exists) {
            onAutopayUpdate([...autopayTransactions, newAutopay]);
          }
        }
      }
      return;
    }
    
    // Handle regular subscription payments
    const existingSub = subscriptions.find(
      s => s.merchantName.toLowerCase() === transaction.merchantName.toLowerCase() &&
           s.amount === transaction.amount
    );
    
    if (existingSub) {
      // Update existing subscription
      const nextRenewal = calculateNextRenewal(transaction.date, existingSub.billingCycle);
      const updated = subscriptions.map(s =>
        s.id === existingSub.id
          ? { ...s, lastPaymentDate: transaction.date, nextRenewalDate: nextRenewal }
          : s
      );
      onSubscriptionUpdate(updated);
    } else {
      // New subscription
      const detected = detectSubscriptions([transaction]);
      
      if (detected.length > 0) {
        const newSub = detected[0];
        
        if (isSubscriptionDeleted(newSub.id)) {
          console.log('[SmsSync] Subscription was deleted, ignoring');
          return;
        }
        
        const tier = getSubscriptionTier();
        
        if (!tier.isPro && subscriptions.length >= tier.maxSubscriptions) {
          onLimitReached();
        } else {
          onSubscriptionUpdate([...subscriptions, newSub]);
          
          Alert.alert(
            '🎉 New Subscription Detected',
            `Added: ${newSub.merchantName} - ₹${newSub.amount}/${newSub.billingCycle}`
          );
        }
      }
    }
  }, []);
  
  return {
    syncSms,
    handleNewTransaction,
    isSyncing,
  };
}
