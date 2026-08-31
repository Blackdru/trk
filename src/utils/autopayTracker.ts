import dayjs from 'dayjs';
import type { AutopayTransaction, BillingCycle } from '../types';

/**
 * Detect billing cycle for autopay based on transaction history
 */
export function detectAutopayCycle(
  merchantName: string,
  transactions: AutopayTransaction[]
): BillingCycle | null {
  // Get all transactions for this merchant
  const merchantTxns = transactions
    .filter(t => t.merchantName === merchantName)
    .sort((a, b) => a.date - b.date);

  if (merchantTxns.length < 2) {
    // Not enough data, use category-based defaults
    return getCategoryDefaultCycle(merchantTxns[0]?.category);
  }

  // Calculate average days between transactions
  const intervals: number[] = [];
  for (let i = 1; i < merchantTxns.length; i++) {
    const daysDiff = dayjs(merchantTxns[i].date).diff(dayjs(merchantTxns[i - 1].date), 'day');
    intervals.push(daysDiff);
  }

  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

  // Determine cycle based on average interval
  if (avgInterval <= 10) return 'weekly';
  if (avgInterval <= 35) return 'monthly';
  if (avgInterval <= 100) return 'quarterly';
  return 'yearly';
}

/**
 * Get default billing cycle based on autopay category
 */
function getCategoryDefaultCycle(category?: string): BillingCycle {
  switch (category) {
    case 'utility':
    case 'telecom':
      return 'monthly';
    case 'insurance':
      return 'yearly';
    case 'loan':
      return 'monthly';
    case 'investment':
      return 'monthly';
    default:
      return 'monthly';
  }
}

/**
 * Calculate next payment date for autopay
 */
export function calculateNextAutopayDate(
  lastPaymentDate: number,
  cycle: BillingCycle
): number {
  let next = dayjs(lastPaymentDate);
  const now = dayjs();
  
  if (next.isAfter(now, 'day')) {
    return next.valueOf();
  }

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

/**
 * Enrich autopay transactions with billing cycle and next payment date,
 * consolidating multiple SMS entries for the same merchant into a single active mandate.
 */
export function enrichAutopayWithCycles(
  transactions: AutopayTransaction[]
): AutopayTransaction[] {
  console.log(`[AutopayTracker] Enriching ${transactions.length} autopay transactions`);
  
  // Group by merchant name (case-insensitive)
  const byMerchant = new Map<string, AutopayTransaction[]>();
  
  transactions.forEach(txn => {
    const key = txn.merchantName.toLowerCase().trim();
    const existing = byMerchant.get(key) || [];
    existing.push(txn);
    byMerchant.set(key, existing);
  });

  const enriched: AutopayTransaction[] = [];

  byMerchant.forEach((merchantTxns, key) => {
    const cycle = detectAutopayCycle(merchantTxns[0].merchantName, merchantTxns) || 'monthly';
    
    // Find the most recent transaction for this merchant
    const mostRecent = merchantTxns.reduce((latest, current) => 
      current.date > latest.date ? current : latest
    );

    const nextPaymentDate = calculateNextAutopayDate(mostRecent.date, cycle);
    console.log(`[AutopayTracker] ${mostRecent.merchantName} (${merchantTxns.length} txns): next payment ${dayjs(nextPaymentDate).format('YYYY-MM-DD')}`);

    enriched.push({
      ...mostRecent,
      billingCycle: cycle,
      nextPaymentDate,
      notificationEnabled: true,
    });
  });
  
  console.log(`[AutopayTracker] Enriched ${enriched.length} unique merchant mandates`);
  return enriched;
}

/**
 * Get autopay transactions that are due soon
 */
export function getUpcomingAutopay(
  transactions: AutopayTransaction[],
  days: number = 7
): AutopayTransaction[] {
  const now = Date.now();
  const futureDate = dayjs().add(days, 'day').valueOf();

  return transactions
    .filter(txn => 
      txn.nextPaymentDate && 
      txn.nextPaymentDate >= now && 
      txn.nextPaymentDate <= futureDate
    )
    .sort((a, b) => (a.nextPaymentDate || 0) - (b.nextPaymentDate || 0));
}
