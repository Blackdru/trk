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

/**
 * Enrich autopay transactions with billing cycle and next payment date
 */
export function enrichAutopayWithCycles(
  transactions: AutopayTransaction[]
): AutopayTransaction[] {
  // Group by merchant
  const byMerchant = new Map<string, AutopayTransaction[]>();
  
  transactions.forEach(txn => {
    const existing = byMerchant.get(txn.merchantName) || [];
    existing.push(txn);
    byMerchant.set(txn.merchantName, existing);
  });

  // Enrich each transaction
  return transactions.map(txn => {
    const merchantTxns = byMerchant.get(txn.merchantName) || [];
    const cycle = detectAutopayCycle(txn.merchantName, merchantTxns);
    
    if (!cycle) {
      return { ...txn, notificationEnabled: true };
    }

    // Find the most recent transaction for this merchant
    const mostRecent = merchantTxns.reduce((latest, current) => 
      current.date > latest.date ? current : latest
    );

    // Only set next payment date for the most recent transaction
    if (txn.id === mostRecent.id) {
      const nextPaymentDate = calculateNextAutopayDate(txn.date, cycle);
      return {
        ...txn,
        billingCycle: cycle,
        nextPaymentDate,
        notificationEnabled: true,
      };
    }

    return {
      ...txn,
      billingCycle: cycle,
      notificationEnabled: true,
    };
  });
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
