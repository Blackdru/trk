import dayjs from 'dayjs';
import type { ParsedTransaction, Subscription, BillingCycle } from '../types';
import { isKnownSubscriptionService, getStandardizedMerchantName, findMerchantPattern } from './merchantPatterns';

/**
 * Group transactions into subscriptions strictly for recognized app/media services.
 * 
 * Rules:
 * - Must be a known digital app subscription (e.g. Netflix, Spotify, Prime, Hotstar, Google One, etc.)
 * - Must have amount > 0 (skip ₹0 placeholders from mandate setups)
 * - Must NOT be a loan, EMI, insurance, telecom, utility, or general bank mandate
 */
export function detectSubscriptions(transactions: ParsedTransaction[]): Subscription[] {
  // Filter out any zero or negative amounts immediately
  const validTxns = transactions.filter(t => t.amount > 0);
  const grouped = groupTransactions(validTxns);
  const subscriptions: Subscription[] = [];

  console.log(`[SubscriptionDetector] Processing ${validTxns.length} valid transactions`);
  console.log(`[SubscriptionDetector] Found ${Object.keys(grouped).length} unique merchant-amount combinations`);

  for (const [key, txns] of Object.entries(grouped)) {
    const sortedTxns = txns.sort((a, b) => a.date - b.date);
    const firstTxn = sortedTxns[0];
    const merchantName = firstTxn.merchantName;

    // Check against single source of truth
    const isAppSubscription = isSubscriptionKeyword(firstTxn);
    const pattern = findMerchantPattern(merchantName) || (firstTxn.rawSms ? findMerchantPattern(firstTxn.rawSms) : null);

    // If explicitly marked as non-subscription (loan, utility, insurance, telecom, etc.), SKIP
    if (pattern && !pattern.isSubscription) {
      console.log(`[SubscriptionDetector] Skipping ${merchantName} - categorized as ${pattern.category} (not an app subscription)`);
      continue;
    }

    // Only create a subscription if it is a verified digital app subscription service
    if (!isAppSubscription) {
      console.log(`[SubscriptionDetector] Skipping ${merchantName} - not a recognized app subscription service`);
      continue;
    }

    const cleanName = getStandardizedMerchantName(merchantName, firstTxn.rawSms);

    // For single transaction of a known app subscription service, assume monthly
    if (txns.length === 1) {
      const cycle: BillingCycle = 'monthly';
      const nextRenewal = calculateNextRenewal(firstTxn.date, cycle);

      console.log(`[SubscriptionDetector] App subscription detected: ${cleanName} (₹${firstTxn.amount}/${cycle})`);

      subscriptions.push({
        id: `sms-${key}`,
        merchantName: cleanName,
        amount: firstTxn.amount,
        billingCycle: cycle,
        nextRenewalDate: nextRenewal,
        lastPaymentDate: firstTxn.date,
        source: 'sms',
        monthlyEquivalent: calculateMonthlyEquivalent(firstTxn.amount, cycle),
        notificationEnabled: true,
        transactions: sortedTxns,
        category: pattern?.category || 'Entertainment',
      });
      continue;
    }

    // Multiple transactions for known app service - detect billing cycle
    const cycle = detectBillingCycle(sortedTxns) || 'monthly';
    const lastTxn = sortedTxns[sortedTxns.length - 1];
    const nextRenewal = calculateNextRenewal(lastTxn.date, cycle);

    console.log(`[SubscriptionDetector] Recurring ${cycle} subscription detected: ${cleanName} (₹${lastTxn.amount})`);

    subscriptions.push({
      id: `sms-${key}`,
      merchantName: cleanName,
      amount: lastTxn.amount,
      billingCycle: cycle,
      nextRenewalDate: nextRenewal,
      lastPaymentDate: lastTxn.date,
      source: 'sms',
      monthlyEquivalent: calculateMonthlyEquivalent(lastTxn.amount, cycle),
      notificationEnabled: true,
      transactions: sortedTxns,
      category: pattern?.category || 'Entertainment',
    });
  }

  console.log(`[SubscriptionDetector] Detected ${subscriptions.length} active app subscriptions`);
  return subscriptions;
}

/**
 * Check if transaction is an app subscription service
 */
function isSubscriptionKeyword(transaction: ParsedTransaction): boolean {
  return isKnownSubscriptionService(transaction.merchantName, transaction.rawSms);
}

function groupTransactions(transactions: ParsedTransaction[]): Record<string, ParsedTransaction[]> {
  const groups: Record<string, ParsedTransaction[]> = {};

  for (const txn of transactions) {
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

  if (avgInterval >= 5 && avgInterval <= 10) return 'weekly';
  if (avgInterval >= 20 && avgInterval <= 40) return 'monthly';
  if (avgInterval >= 70 && avgInterval <= 110) return 'quarterly';
  if (avgInterval >= 330 && avgInterval <= 400) return 'yearly';

  return null;
}

export function calculateNextRenewal(lastPaymentDate: number, cycle: BillingCycle): number {
  let next = dayjs(lastPaymentDate);
  const now = dayjs();

  // If lastPaymentDate is already in the future, return it
  if (next.isAfter(now, 'day')) {
    return next.valueOf();
  }

  // Advance by cycle until next is in the future (strictly after today)
  while (next.isBefore(now, 'day') || next.isSame(now, 'day')) {
    switch (cycle) {
      case 'weekly':
        next = next.add(7, 'day');
        break;
      case 'monthly':
        next = next.add(1, 'month');
        break;
      case 'quarterly':
        next = next.add(3, 'month');
        break;
      case 'yearly':
        next = next.add(1, 'year');
        break;
    }
  }

  return next.valueOf();
}

export function calculateMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return Math.round(amount * 4.33 * 100) / 100;
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
