import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { Subscription, AutopayTransaction, AppSettings, PassbookTransaction } from '../types';
import {
  getSubscriptions as getStoredSubscriptions,
  saveSubscriptions as saveStoredSubscriptions,
  getAutopayTransactions as getStoredAutopay,
  saveAutopayTransactions as saveStoredAutopay,
  getSettings as getStoredSettings,
  saveSettings as saveStoredSettings,
  getPassbookTransactions as getStoredPassbook,
  savePassbookTransactions as saveStoredPassbook,
  addPassbookTransaction as addStoredPassbook,
  clearPassbookTransactions as clearStoredPassbook,
} from '../storage';

interface AppContextType {
  // State
  subscriptions: Subscription[];
  autopayTransactions: AutopayTransaction[];
  passbookTransactions: PassbookTransaction[];
  settings: AppSettings;
  isPro: boolean;
  hasSmsPermission: boolean;
  
  // Actions
  setSubscriptions: (subs: Subscription[]) => void;
  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  
  setAutopayTransactions: (txns: AutopayTransaction[]) => void;
  addAutopayTransaction: (txn: AutopayTransaction) => void;
  deleteAutopayTransaction: (id: string) => void;

  setPassbookTransactions: (txns: PassbookTransaction[]) => void;
  addPassbookTransaction: (txn: PassbookTransaction) => void;
  clearPassbookTransactions: () => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  setIsPro: (isPro: boolean) => void;
  setHasSmsPermission: (hasPermission: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptionsState] = useState<Subscription[]>([]);
  const [autopayTransactions, setAutopayState] = useState<AutopayTransaction[]>([]);
  const [passbookTransactions, setPassbookState] = useState<PassbookTransaction[]>(() => getStoredPassbook());
  const [settings, setSettingsState] = useState<AppSettings>(getStoredSettings());
  const [isPro, setIsPro] = useState(false);
  const [hasSmsPermission, setHasSmsPermission] = useState(false);
  
  const setSubscriptions = useCallback((subs: Subscription[]) => {
    setSubscriptionsState(subs);
    saveStoredSubscriptions(subs);
  }, []);
  
  const addSubscription = useCallback((sub: Subscription) => {
    setSubscriptionsState(prev => {
      const updated = [...prev, sub];
      saveStoredSubscriptions(updated);
      return updated;
    });
  }, []);
  
  const updateSubscription = useCallback((id: string, updates: Partial<Subscription>) => {
    setSubscriptionsState(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      saveStoredSubscriptions(updated);
      return updated;
    });
  }, []);
  
  const deleteSubscription = useCallback((id: string) => {
    setSubscriptionsState(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveStoredSubscriptions(updated);
      return updated;
    });
  }, []);
  
  const setAutopayTransactions = useCallback((txns: AutopayTransaction[]) => {
    setAutopayState(txns);
    saveStoredAutopay(txns);
  }, []);
  
  const addAutopayTransaction = useCallback((txn: AutopayTransaction) => {
    setAutopayState(prev => {
      const updated = [...prev, txn];
      saveStoredAutopay(updated);
      return updated;
    });
  }, []);
  
  const deleteAutopayTransaction = useCallback((id: string) => {
    setAutopayState(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveStoredAutopay(updated);
      return updated;
    });
  }, []);

  const setPassbookTransactions = useCallback((txns: PassbookTransaction[]) => {
    setPassbookState(txns);
    saveStoredPassbook(txns);
  }, []);

  const addPassbookTransaction = useCallback((txn: PassbookTransaction) => {
    setPassbookState(prev => {
      const exists = prev.some(t => t.id === txn.id || (t.referenceNumber && t.referenceNumber === txn.referenceNumber));
      if (exists) return prev;
      // Prune entries older than 30 days while adding
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const pruned = prev.filter(t => t.date >= cutoff);
      const updated = [txn, ...pruned].sort((a, b) => b.date - a.date);
      saveStoredPassbook(updated);
      return updated;
    });
  }, []);

  const clearPassbookTransactions = useCallback(() => {
    setPassbookState([]);
    clearStoredPassbook();
  }, []);
  
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      saveStoredSettings(updated);
      return updated;
    });
  }, []);
  
  const value: AppContextType = {
    subscriptions,
    autopayTransactions,
    passbookTransactions,
    settings,
    isPro,
    hasSmsPermission,
    setSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    setAutopayTransactions,
    addAutopayTransaction,
    deleteAutopayTransaction,
    setPassbookTransactions,
    addPassbookTransaction,
    clearPassbookTransactions,
    updateSettings,
    setIsPro,
    setHasSmsPermission,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

