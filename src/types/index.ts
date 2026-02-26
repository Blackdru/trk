export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type SubscriptionSource = 'sms' | 'manual';

export type AutopayStatus = 'active' | 'inactive' | 'unknown';

export interface RawSms {
  body: string;
  date: number;
  address: string;
}

export interface ParsedTransaction {
  id: string;
  merchantName: string;
  amount: number;
  date: number;
  paymentType: 'UPI' | 'Autopay' | 'Mandate';
  rawSms?: string;
}

export interface Subscription {
  id: string;
  merchantName: string;
  amount: number;
  billingCycle: BillingCycle;
  nextRenewalDate: number;
  lastPaymentDate?: number;
  source: SubscriptionSource;
  monthlyEquivalent: number;
  notificationEnabled: boolean;
  transactions?: ParsedTransaction[];
}

export interface AutopayTransaction {
  id: string;
  merchantName: string;
  amount: number;
  date: number;
  paymentType: 'Autopay' | 'Mandate';
  status: AutopayStatus;
  rawSms: string;
  category?: string; // e.g., 'utility', 'insurance', 'loan', 'subscription'
}

export interface AppSettings {
  notificationsEnabled: boolean;
  lastSmsSync: number;
  trackAutopay: boolean; // New setting to enable/disable autopay tracking
}
