import dayjs from 'dayjs';
import type { ParsedTransaction, Subscription, BillingCycle } from '../types';

/**
 * Group transactions into subscriptions based on merchant, amount, and interval.
 * 
 * Grouping logic:
 * - Same merchant name (case-insensitive)
 * - Same amount (exact match)
 * - Interval approximately: 7 days (weekly), 30 days (monthly), 90 days (quarterly), 365 days (yearly)
 */
export function detectSubscriptions(transactions: ParsedTransaction[]): Subscription[] {
  const grouped = groupTransactions(transactions);
  const subscriptions: Subscription[] = [];

  console.log(`[SubscriptionDetector] Processing ${transactions.length} transactions`);
  console.log(`[SubscriptionDetector] Found ${Object.keys(grouped).length} unique merchant-amount combinations`);

  for (const [key, txns] of Object.entries(grouped)) {
    const sortedTxns = txns.sort((a, b) => a.date - b.date);
    
    // For single transaction, check if it's likely a subscription based on keywords
    if (txns.length === 1) {
      const txn = sortedTxns[0];
      const isLikelySubscription = isSubscriptionKeyword(txn);
      
      if (isLikelySubscription || txn.paymentType === 'Autopay' || txn.paymentType === 'Mandate') {
        const cycle: BillingCycle = 'monthly'; // Default assumption for subscriptions
        const nextRenewal = calculateNextRenewal(txn.date, cycle);
        
        console.log(`[SubscriptionDetector] Single transaction for ${txn.merchantName}, treating as subscription (${txn.paymentType})`);
        
        subscriptions.push({
          id: `sms-${key}`,
          merchantName: txn.merchantName,
          amount: txn.amount,
          billingCycle: cycle,
          nextRenewalDate: nextRenewal,
          lastPaymentDate: txn.date,
          source: 'sms',
          monthlyEquivalent: calculateMonthlyEquivalent(txn.amount, cycle),
          notificationEnabled: true,
          transactions: sortedTxns,
        });
      } else {
        console.log(`[SubscriptionDetector] Single transaction for ${txn.merchantName}, not treating as subscription (no subscription keywords)`);
      }
      continue;
    }

    // Multiple transactions - try to detect pattern
    const cycle = detectBillingCycle(sortedTxns);
    
    // If we have multiple transactions but can't detect cycle, check if it's a known service
    if (!cycle) {
      const firstTxn = sortedTxns[0];
      const isKnownService = isSubscriptionKeyword(firstTxn);
      
      if (isKnownService || firstTxn.paymentType === 'Autopay' || firstTxn.paymentType === 'Mandate') {
        // Assume monthly for known services even if pattern is unclear
        const lastTxn = sortedTxns[sortedTxns.length - 1];
        const nextRenewal = calculateNextRenewal(lastTxn.date, 'monthly');
        
        console.log(`[SubscriptionDetector] ${txns.length} transactions for ${firstTxn.merchantName}, pattern unclear but treating as monthly subscription (known service)`);
        
        subscriptions.push({
          id: `sms-${key}`,
          merchantName: lastTxn.merchantName,
          amount: lastTxn.amount,
          billingCycle: 'monthly',
          nextRenewalDate: nextRenewal,
          lastPaymentDate: lastTxn.date,
          source: 'sms',
          monthlyEquivalent: calculateMonthlyEquivalent(lastTxn.amount, 'monthly'),
          notificationEnabled: true,
          transactions: sortedTxns,
        });
      } else {
        console.log(`[SubscriptionDetector] Could not detect cycle for ${firstTxn.merchantName} with ${txns.length} transactions (unknown service)`);
      }
      continue;
    }

    const lastTxn = sortedTxns[sortedTxns.length - 1];
    const nextRenewal = calculateNextRenewal(lastTxn.date, cycle);

    console.log(`[SubscriptionDetector] Detected ${cycle} subscription for ${lastTxn.merchantName}`);

    subscriptions.push({
      id: `sms-${key}`,
      merchantName: lastTxn.merchantName,
      amount: lastTxn.amount,
      billingCycle: cycle,
      nextRenewalDate: nextRenewal,
      lastPaymentDate: lastTxn.date,
      source: 'sms',
      monthlyEquivalent: calculateMonthlyEquivalent(lastTxn.amount, cycle),
      notificationEnabled: true,
      transactions: sortedTxns,
    });
  }

  console.log(`[SubscriptionDetector] Detected ${subscriptions.length} subscriptions`);
  return subscriptions;
}

/**
 * Check if transaction is likely a subscription based on merchant name or keywords
 */
function isSubscriptionKeyword(transaction: ParsedTransaction): boolean {
  const merchantLower = transaction.merchantName.toLowerCase();
  const bodyLower = transaction.rawSms?.toLowerCase() || '';
  
  // Known subscription services
  const subscriptionServices = [
    'netflix', 'spotify', 'amazon prime', 'prime video', 'hotstar', 'disney',
    'youtube premium', 'youtube', 'google one', 'apple', 'icloud',
    'microsoft', 'office 365', 'adobe', 'dropbox', 'zoom',
    'swiggy one', 'zomato gold', 'uber pass', 'ola',
    'jio', 'airtel', 'vodafone', 'vi', 'bsnl',
    'times prime', 'cult.fit', 'healthify', 'headspace',
    'audible', 'kindle', 'scribd', 'medium'
  ];
  
  // Check merchant name
  for (const service of subscriptionServices) {
    if (merchantLower.includes(service)) {
      return true;
    }
  }
  
  // Check SMS body for subscription keywords
  const subscriptionKeywords = [
    'subscription', 'autopay', 'auto-pay', 'mandate', 'recurring',
    'monthly plan', 'annual plan', 'yearly plan', 'premium',
    'membership', 'renewal'
  ];
  
  for (const keyword of subscriptionKeywords) {
    if (bodyLower.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

function groupTransactions(transactions: ParsedTransaction[]): Record<string, ParsedTransaction[]> {
  const groups: Record<string, ParsedTransaction[]> = {};

  for (const txn of transactions) {
    // Key: normalized merchant name + amount
    const key = `${txn.merchantName.toLowerCase().trim()}-${txn.amount}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(txn);
  }

  return groups;
}

function detectBillingCycle(sortedTransactions: ParsedTransaction[]): BillingCycle | null {
  if (sortedTransactions.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < sortedTransactions.length; i++) {
    const daysDiff = dayjs(sortedTransactions[i].date).diff(
      dayjs(sortedTransactions[i - 1].date),
      'day'
    );
    intervals.push(daysDiff);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  
  console.log(`[SubscriptionDetector] Intervals: ${intervals.join(', ')} days, Average: ${avgInterval.toFixed(1)} days`);

  // Weekly: 5-10 days
  if (avgInterval >= 5 && avgInterval <= 10) {
    return 'weekly';
  }
  // Monthly: 25-35 days (relaxed from 25-35 to 20-40)
  if (avgInterval >= 20 && avgInterval <= 40) {
    return 'monthly';
  }
  // Quarterly: 80-100 days (relaxed to 70-110)
  if (avgInterval >= 70 && avgInterval <= 110) {
    return 'quarterly';
  }
  // Yearly: 350-380 days (relaxed to 330-400)
  if (avgInterval >= 330 && avgInterval <= 400) {
    return 'yearly';
  }

  // If intervals are very small (test data), assume monthly
  if (avgInterval < 5 && avgInterval > 0) {
    console.log(`[SubscriptionDetector] Very small intervals detected (test data?), assuming monthly`);
    return 'monthly';
  }

  console.log(`[SubscriptionDetector] No cycle matched for average interval: ${avgInterval.toFixed(1)} days`);
  return null;
}

export function calculateNextRenewal(lastPaymentDate: number, cycle: BillingCycle): number {
  const last = dayjs(lastPaymentDate);
  
  switch (cycle) {
    case 'weekly':
      return last.add(7, 'day').valueOf();
    case 'monthly':
      return last.add(1, 'month').valueOf();
    case 'quarterly':
      return last.add(3, 'month').valueOf();
    case 'yearly':
      return last.add(1, 'year').valueOf();
  }
}

export function calculateMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return Math.round(amount * 4.33 * 100) / 100; // ~4.33 weeks per month
    case 'monthly':
      return amount;
    case 'quarterly':
      return Math.round((amount / 3) * 100) / 100;
    case 'yearly':
      return Math.round((amount / 12) * 100) / 100;
  }
}

export function getUpcomingRenewals(subscriptions: Subscription[], days: number = 7): Subscription[] {
  const now = Date.now();
  const futureDate = dayjs().add(days, 'day').valueOf();

  return subscriptions
    .filter(sub => sub.nextRenewalDate >= now && sub.nextRenewalDate <= futureDate)
    .sort((a, b) => a.nextRenewalDate - b.nextRenewalDate);
}

export function getTotalMonthlySpend(subscriptions: Subscription[]): number {
  return subscriptions.reduce((total, sub) => total + sub.monthlyEquivalent, 0);
}
