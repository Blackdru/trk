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
  nextPaymentDate?: number; // Expected next payment date for recurring autopay
  billingCycle?: BillingCycle; // Detected billing cycle for recurring autopay
  notificationEnabled?: boolean; // Whether to notify for this autopay
}

export interface AppSettings {
  notificationsEnabled: boolean;
  lastSmsSync: number;
  trackAutopay: boolean; // New setting to enable/disable autopay tracking
  alarmTimeBeforeDue: number; // Hour (0-23) for alarms 1-2 days before due date (default: 8)
  alarmTimeOnDueDate: number; // Hour (0-23) for alarm on payment due date (default: 6)
}
