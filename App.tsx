import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar, PermissionsAndroid, Platform, Alert, AppState, AppStateStatus, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';

import { UpgradeScreen, WelcomeScreen } from './src/screens';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import type { Subscription, AppSettings, ParsedTransaction, AutopayTransaction } from './src/types';
import { getSms, subscribeSmsReceived, hasPermission } from './src/native/SmsModule';
import { parseSms } from './src/utils/smsParser';
import { detectSubscriptions, calculateNextRenewal } from './src/utils/subscriptionDetector';
import { extractAutopayTransactions } from './src/utils/autopayDetector';
import {
  getSubscriptions,
  saveSubscriptions,
  addSubscription,
  deleteSubscription,
  getSettings,
  saveSettings,
  mergeSubscriptions,
  getAutopayTransactions,
  saveAutopayTransactions,
  hasCompletedWelcome,
  setWelcomeCompleted,
} from './src/storage';
import {
  createNotificationChannel,
  requestNotificationPermission,
  scheduleAllNotifications,
  getUpcomingRenewals,
} from './src/utils/notifications';
import { initializeRevenueCat, checkSubscriptionStatus, setProStatusChangeCallback } from './src/services/revenuecat';
import { initializeAdMob, showInterstitialAd } from './src/services/admob';
import { getSubscriptionTier, canAddSubscription } from './src/services/subscriptionService';



function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [autopayTransactions, setAutopayTransactions] = useState<AutopayTransaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [refreshing, setRefreshing] = useState(false);
  const [hasSmsPermission, setHasSmsPermission] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showWelcome, setShowWelcome] = useState(!hasCompletedWelcome());
  const [upcomingRenewals, setUpcomingRenewals] = useState<{
    today: Subscription[];
    tomorrow: Subscription[];
    twoDays: Subscription[];
  }>({ today: [], tomorrow: [], twoDays: [] });
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);

  // Register callback for pro status changes from RevenueCat
  useEffect(() => {
    setProStatusChangeCallback((newIsPro) => {
      console.log('[App] Pro status changed:', newIsPro);
      setIsPro(newIsPro);
      
      // Reload subscriptions if upgraded to pro
      if (newIsPro) {
        const allSubs = getSubscriptions();
        setSubscriptions(allSubs);
      }
    });
  }, []);

  // Periodic SMS sync (every 5 minutes when app is active)
  useEffect(() => {
    if (!hasSmsPermission || appState !== 'active') return;

    console.log('[App] Setting up periodic SMS sync');
    
    // Sync immediately
    syncSms(subscriptions);
    
    // Then sync every 5 minutes
    const interval = setInterval(() => {
      console.log('[App] Periodic SMS sync triggered');
      syncSms(subscriptions);
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      console.log('[App] Clearing periodic SMS sync');
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSmsPermission, appState]);

  useEffect(() => {
    // Only initialize app after welcome screen is completed
    if (!showWelcome) {
      initializeApp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWelcome]);

  // Listen for app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // App came to foreground
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[App] App came to foreground, syncing SMS...');
        if (hasSmsPermission) {
          syncSms(subscriptions);
        }
        
        // Check for upcoming renewals and show alert
        const renewals = getUpcomingRenewals(subscriptions);
        const hasUpcoming = renewals.today.length > 0 || renewals.tomorrow.length > 0 || renewals.twoDays.length > 0;
        
        if (hasUpcoming) {
          setUpcomingRenewals(renewals);
          setShowRenewalAlert(true);
        }
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, hasSmsPermission, subscriptions]);

  useEffect(() => {
    if (!hasSmsPermission) {
      console.log('[App] SMS listener not set up - no permission');
      return;
    }

    console.log('[App] Setting up SMS receiver listener');
    const subscription = subscribeSmsReceived(sms => {
      console.log('[App] SMS received:', sms.address, sms.body.substring(0, 50));
      const parsed = parseSms(sms);
      if (parsed) {
        console.log('[App] SMS parsed successfully:', parsed.merchantName, parsed.amount);
        handleNewTransaction(parsed);
      } else {
        console.log('[App] SMS not parsed - not a UPI transaction');
      }
    });

    return () => {
      console.log('[App] Removing SMS receiver listener');
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSmsPermission, subscriptions]);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      scheduleAllNotifications(subscriptions);
    }
    
    // Check for upcoming renewals and show in-app alert
    const renewals = getUpcomingRenewals(subscriptions);
    const hasUpcoming = renewals.today.length > 0 || renewals.tomorrow.length > 0 || renewals.twoDays.length > 0;
    
    if (hasUpcoming) {
      setUpcomingRenewals(renewals);
      setShowRenewalAlert(true);
    }
  }, [subscriptions, settings.notificationsEnabled]);

  const initializeApp = async () => {
    const storedSubs = getSubscriptions();
    
    // Check subscription limit for free users
    const tier = getSubscriptionTier();
    let subsToLoad = storedSubs;
    
    if (!tier.isPro && storedSubs.length > tier.maxSubscriptions) {
      // Prioritize manual subscriptions, then SMS subscriptions by date
      const manualSubs = storedSubs.filter(s => s.source === 'manual');
      const smsSubs = storedSubs.filter(s => s.source === 'sms')
        .sort((a, b) => (b.lastPaymentDate || 0) - (a.lastPaymentDate || 0));
      
      subsToLoad = [...manualSubs, ...smsSubs].slice(0, tier.maxSubscriptions);
      saveSubscriptions(subsToLoad);
      
      console.log(`[App] Limited subscriptions from ${storedSubs.length} to ${subsToLoad.length} (free tier)`);
    }
    
    setSubscriptions(subsToLoad);

    const storedAutopay = getAutopayTransactions();
    setAutopayTransactions(storedAutopay);

    // Create notification channel (doesn't request permission)
    await createNotificationChannel();

    // Initialize RevenueCat and check Pro status
    console.log('[App] Initializing RevenueCat...');
    await initializeRevenueCat();
    const isProUser = await checkSubscriptionStatus();
    console.log('[App] Pro status:', isProUser);
    setIsPro(isProUser);
    
    // Initialize AdMob only for free users
    if (!isProUser) {
      console.log('[App] User is free tier, initializing AdMob...');
      await initializeAdMob();
    } else {
      console.log('[App] User is Pro, skipping AdMob initialization');
    }

    // Check if SMS permission already granted (doesn't request)
    const hasPermissionResult = await hasPermission();
    setHasSmsPermission(hasPermissionResult);

    if (hasPermissionResult) {
      await syncSms(subsToLoad);
    }
    
    // Check for upcoming renewals and show alert dialog
    const renewals = getUpcomingRenewals(subsToLoad);
    const hasUpcoming = renewals.today.length > 0 || renewals.tomorrow.length > 0 || renewals.twoDays.length > 0;
    
    if (hasUpcoming) {
      setUpcomingRenewals(renewals);
      setShowRenewalAlert(true);
      
      // Show alert dialog for critical renewals (today and tomorrow)
      if (renewals.today.length > 0) {
        const names = renewals.today.map(s => s.merchantName).join(', ');
        Alert.alert(
          '🔔 Subscriptions Renewing Today!',
          `${renewals.today.length} subscription(s) renewing today: ${names}`,
          [{ text: 'OK' }]
        );
      } else if (renewals.tomorrow.length > 0) {
        const names = renewals.tomorrow.map(s => s.merchantName).join(', ');
        Alert.alert(
          '⚠️ Subscriptions Renewing Tomorrow',
          `${renewals.tomorrow.length} subscription(s) renewing tomorrow: ${names}`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const requestSmsPermission = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const readResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission Required',
          message:
            'This app needs access to your SMS to automatically detect UPI subscriptions. ' +
            'All processing happens locally on your device.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      const receiveResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        {
          title: 'SMS Permission Required',
          message: 'Allow receiving SMS for real-time subscription detection.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (
        readResult === PermissionsAndroid.RESULTS.GRANTED &&
        receiveResult === PermissionsAndroid.RESULTS.GRANTED
      ) {
        setHasSmsPermission(true);
        await syncSms(subscriptions);
      } else {
        Alert.alert(
          'Permission Denied',
          'SMS access is needed for automatic subscription detection. You can still add subscriptions manually.'
        );
      }
    } catch (err) {
      console.warn('Permission error:', err);
    }
  };

  const syncSms = async (existingSubs: Subscription[]) => {
    try {
      console.log('[App] Starting SMS sync...');
      const smsMessages = await getSms();
      console.log(`[App] Retrieved ${smsMessages.length} SMS messages`);
      
      const transactions: ParsedTransaction[] = [];

      for (const sms of smsMessages) {
        const parsed = parseSms(sms);
        if (parsed) {
          transactions.push(parsed);
        }
      }

      console.log(`[App] Parsed ${transactions.length} transactions from SMS`);

      // Detect subscriptions from ALL transactions
      // The detectSubscriptions function will only create subscriptions for:
      // 1. Multiple transactions with recurring patterns
      // 2. Single autopay/mandate transactions for KNOWN subscription services
      const detected = detectSubscriptions(transactions);
      console.log(`[App] Detected ${detected.length} subscriptions`);
      
      // IMPORTANT: Separate autopay transactions for the autopay tracker
      // All autopay/mandate transactions go here, regardless of whether they're also subscriptions
      const autopayTransactions = transactions.filter(t => t.paymentType === 'Autopay' || t.paymentType === 'Mandate');
      
      console.log(`[App] Found ${autopayTransactions.length} autopay/mandate transactions for tracker`);
      
      // Check subscription limit for free users
      const tier = getSubscriptionTier();
      const manualSubs = existingSubs.filter(s => s.source === 'manual');
      const existingSmsSubs = existingSubs.filter(s => s.source === 'sms');
      
      // Calculate how many auto-detected subscriptions we can add
      const availableSlots = tier.maxSubscriptions - manualSubs.length;
      
      // Limit detected subscriptions to available slots
      let limitedDetected = detected;
      if (!tier.isPro && detected.length > availableSlots) {
        // Keep existing SMS subs and add new ones up to the limit
        const existingSmsIds = new Set(existingSmsSubs.map(s => s.id));
        const newDetected = detected.filter(d => !existingSmsIds.has(d.id));
        const existingToKeep = detected.filter(d => existingSmsIds.has(d.id));
        
        const slotsForNew = Math.max(0, availableSlots - existingToKeep.length);
        limitedDetected = [...existingToKeep, ...newDetected.slice(0, slotsForNew)];
        
        console.log(`[App] Limited to ${limitedDetected.length} subscriptions (free tier limit)`);
      }
      
      const merged = mergeSubscriptions(limitedDetected, existingSubs);
      console.log(`[App] Final subscription count: ${merged.length}`);
      
      // Extract autopay transactions if enabled (ONLY from autopay transactions)
      if (settings.trackAutopay && tier.hasAutopayTracking) {
        const autopayTxns = extractAutopayTransactions(autopayTransactions);
        console.log(`[App] Extracted ${autopayTxns.length} autopay transactions from SMS`);
        
        // Filter out deleted autopay transactions
        const { getDeletedAutopay, getAutopayTransactions } = require('./src/storage');
        const deletedAutopay = getDeletedAutopay();
        const validAutopay = autopayTxns.filter(txn => !deletedAutopay.has(txn.id));
        
        console.log(`[App] Valid autopay after filtering deleted: ${validAutopay.length}`);
        
        // IMPORTANT: Merge with existing autopay (to preserve manual entries)
        const existingAutopay = getAutopayTransactions();
        const manualAutopay = existingAutopay.filter(a => a.id.startsWith('manual-autopay-'));
        
        // Combine manual autopay with SMS-detected autopay
        const mergedAutopay = [...manualAutopay, ...validAutopay];
        
        // Remove duplicates based on ID
        const uniqueAutopay = Array.from(
          new Map(mergedAutopay.map(item => [item.id, item])).values()
        );
        
        console.log(`[App] Final autopay count: ${uniqueAutopay.length} (${manualAutopay.length} manual + ${validAutopay.length} SMS)`);
        
        setAutopayTransactions(uniqueAutopay);
        saveAutopayTransactions(uniqueAutopay);
      }
      
      // Check if new subscriptions were added
      const newSubscriptions = merged.filter(
        sub => !existingSubs.find(existing => existing.id === sub.id)
      );
      
      setSubscriptions(merged);
      saveSubscriptions(merged);
      saveSettings({ ...settings, lastSmsSync: Date.now() });
      
      if (newSubscriptions.length > 0) {
        const names = newSubscriptions.map(s => s.merchantName).join(', ');
        Alert.alert(
          '🎉 New Subscriptions Found!',
          `Detected ${newSubscriptions.length} subscription(s): ${names}`,
          [
            { 
              text: 'View', 
              onPress: () => {
                // Navigate to Subscriptions tab
                if (navigationRef.current?.isReady()) {
                  navigationRef.current.navigate('Subscriptions' as never);
                }
              }
            }
          ]
        );
      } else if (detected.length > 0 && existingSubs.length === 0) {
        Alert.alert(
          'Subscriptions Found',
          `Found ${limitedDetected.length} subscription(s) from your SMS messages.`,
          [{ text: 'OK' }]
        );
      } else if (transactions.length > 0 && detected.length === 0) {
        Alert.alert(
          'No Patterns Detected',
          `Found ${transactions.length} payment(s) but couldn't detect recurring patterns. Add subscriptions manually if needed.`,
          [{ text: 'OK' }]
        );
      } else if (!tier.isPro && detected.length > limitedDetected.length) {
        // Show upgrade prompt if we hit the limit
        Alert.alert(
          'Subscription Limit Reached',
          `Found ${detected.length} subscriptions but free users can only track ${tier.maxSubscriptions}. Upgrade to Pro for unlimited subscriptions.`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => setShowUpgradeModal(true) },
          ]
        );
      }
    } catch (error) {
      console.error('[App] SMS sync error:', error);
      Alert.alert('Error', `Failed to sync SMS: ${error}`);
    }
  };

  const handleNewTransaction = (transaction: ParsedTransaction) => {
    console.log('[App] New transaction received:', transaction.merchantName, transaction.amount, 'Type:', transaction.paymentType);
    
    // FIRST: Check if this is an autopay/mandate transaction - these should ONLY go to autopay tracker
    if (transaction.paymentType === 'Autopay' || transaction.paymentType === 'Mandate') {
      console.log('[App] Detected autopay/mandate transaction, adding to autopay tracker only');
      const tier = getSubscriptionTier();
      
      if (tier.hasAutopayTracking) {
        const autopayTxns = extractAutopayTransactions([transaction]);
        
        if (autopayTxns.length > 0) {
          const newAutopay = autopayTxns[0];
          
          // Check if this autopay was previously deleted
          const { isAutopayDeleted } = require('./src/storage');
          if (isAutopayDeleted(newAutopay.id)) {
            console.log('[App] Autopay was previously deleted, ignoring:', newAutopay.merchantName);
            return;
          }
          
          // Check if already exists
          const existingAutopay = autopayTransactions.find(a => a.id === newAutopay.id);
          if (!existingAutopay) {
            const updatedAutopay = [...autopayTransactions, newAutopay];
            setAutopayTransactions(updatedAutopay);
            saveAutopayTransactions(updatedAutopay);
            
            console.log('[App] New autopay transaction added:', newAutopay.merchantName);
          }
        }
      }
      return; // Don't process as subscription
    }
    
    // SECOND: Check if this is an existing subscription (regular subscription payments)
    const existingSub = subscriptions.find(
      s =>
        s.merchantName.toLowerCase() === transaction.merchantName.toLowerCase() &&
        s.amount === transaction.amount
    );

    if (existingSub) {
      // Update existing subscription with new payment date
      console.log('[App] Updating existing subscription:', existingSub.merchantName);
      const nextRenewal = calculateNextRenewal(transaction.date, existingSub.billingCycle);
      const updated = subscriptions.map(s =>
        s.id === existingSub.id
          ? { ...s, lastPaymentDate: transaction.date, nextRenewalDate: nextRenewal }
          : s
      );
      setSubscriptions(updated);
      saveSubscriptions(updated);
    } else {
      // THIRD: New regular subscription transaction
      console.log('[App] New subscription transaction detected, analyzing...');
      
      // Try to detect if this is a new subscription
      const detected = detectSubscriptions([transaction]);
      
      if (detected.length > 0) {
        const newSub = detected[0];
        
        // Check if this subscription was previously deleted
        const { isSubscriptionDeleted } = require('./src/storage');
        if (isSubscriptionDeleted(newSub.id)) {
          console.log('[App] Subscription was previously deleted, ignoring:', newSub.merchantName);
          return;
        }
        
        // New subscription detected
        const tier = getSubscriptionTier();
        
        if (!tier.isPro && subscriptions.length >= tier.maxSubscriptions) {
          console.log('[App] New subscription detected but limit reached');
          Alert.alert(
            'New Subscription Detected',
            `Found a new subscription: ${transaction.merchantName} (₹${transaction.amount})\n\nYou've reached the free tier limit. Upgrade to Pro to track unlimited subscriptions.`,
            [
              { text: 'Maybe Later', style: 'cancel' },
              { text: 'Upgrade to Pro', onPress: () => setShowUpgradeModal(true) },
            ]
          );
        } else {
          // Add the new subscription
          const newSub = detected[0];
          const updatedSubs = [...subscriptions, newSub];
          setSubscriptions(updatedSubs);
          saveSubscriptions(updatedSubs);
          
          console.log('[App] New subscription added:', newSub.merchantName);
          Alert.alert(
            '🎉 New Subscription Detected',
            `Added: ${newSub.merchantName} - ₹${newSub.amount}/${newSub.billingCycle}`,
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[App] Manual refresh triggered');
    
    if (hasSmsPermission) {
      const beforeCount = subscriptions.length;
      await syncSms(subscriptions);
      
      // Check if new subscriptions were added
      const afterSubs = getSubscriptions();
      const newCount = afterSubs.length - beforeCount;
      
      if (newCount > 0) {
        console.log(`[App] Sync complete: ${newCount} new subscription(s) found`);
        // Alert is already shown by syncSms function
      } else {
        console.log('[App] Sync complete: No new subscriptions found');
      }
    } else {
      Alert.alert(
        'SMS Permission Required',
        'Please grant SMS permission to detect subscriptions automatically.',
        [{ text: 'OK' }]
      );
    }
    
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSmsPermission, subscriptions]);

  const handleAddSubscription = (sub: Subscription): boolean => {
    const tier = getSubscriptionTier();
    
    // Check subscription limit for free users
    if (!tier.isPro && subscriptions.length >= tier.maxSubscriptions) {
      console.log(`[App] Blocking add: ${subscriptions.length} >= ${tier.maxSubscriptions}`);
      Alert.alert(
        'Subscription Limit Reached',
        `Free users can track up to ${tier.maxSubscriptions} subscriptions. Upgrade to Pro for unlimited subscriptions and ad-free experience.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => setShowUpgradeModal(true) },
        ]
      );
      return false;
    }

    console.log(`[App] Adding subscription: ${subscriptions.length + 1}/${tier.maxSubscriptions}`);
    const updated = [...subscriptions, sub];
    setSubscriptions(updated);
    addSubscription(sub);
    
    // Show interstitial ad for free users after manual add
    if (!isPro) {
      console.log('[App] Showing interstitial ad after manual subscription add');
      showInterstitialAd();
    }
    
    return true;
  };

  const handleAddAutopay = (autopay: AutopayTransaction): boolean => {
    const tier = getSubscriptionTier();
    
    // Check if autopay tracking is available
    if (!tier.hasAutopayTracking) {
      Alert.alert(
        'Pro Feature',
        'Autopay tracking is a Pro feature. Upgrade to Pro to track unlimited autopay transactions.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => setShowUpgradeModal(true) },
        ]
      );
      return false;
    }

    console.log(`[App] Adding autopay transaction: ${autopay.merchantName}`);
    const updated = [...autopayTransactions, autopay];
    setAutopayTransactions(updated);
    saveAutopayTransactions(updated);
    return true;
  };

  const handleDeleteSubscription = (id: string) => {
    Alert.alert('Delete Subscription', 'Are you sure you want to remove this subscription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = subscriptions.filter(s => s.id !== id);
          setSubscriptions(updated);
          deleteSubscription(id);
          
          // Show interstitial ad for free users after manual delete
          if (!isPro) {
            console.log('[App] Showing interstitial ad after manual subscription delete');
            showInterstitialAd();
          }
        },
      },
    ]);
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleUpgradeSuccess = async () => {
    setShowUpgradeModal(false);
    const isProUser = await checkSubscriptionStatus();
    setIsPro(isProUser);
    
    // Reload all subscriptions (no longer limited to 3)
    const allSubs = getSubscriptions();
    setSubscriptions(allSubs);
    
    // Re-sync SMS to detect any previously ignored subscriptions
    if (hasSmsPermission) {
      setRefreshing(true);
      await syncSms(allSubs);
      setRefreshing(false);
    }
    
    Alert.alert('🎉 Success!', 'You are now a Pro user. Enjoy unlimited subscriptions and ad-free experience!');
  };

  const handleWelcomeComplete = async () => {
    setWelcomeCompleted();
    setShowWelcome(false);
    
    // Request SMS permission first (critical for subscription detection)
    await requestSmsPermission();
    
    // Then request notification permission
    await requestNotificationPermission();
  };

  // Show welcome screen on first launch
  if (showWelcome) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#D3D3D3" />
        <WelcomeScreen onComplete={handleWelcomeComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#D3D3D3" />
      <NavigationContainer ref={navigationRef}>
        <BottomTabNavigator
          subscriptions={subscriptions}
          autopayTransactions={autopayTransactions}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onDeleteSubscription={handleDeleteSubscription}
          onAddSubscription={handleAddSubscription}
          onAddAutopay={handleAddAutopay}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onRequestSmsPermission={requestSmsPermission}
          hasSmsPermission={hasSmsPermission}
          isPro={isPro}
          onUpgradePress={() => setShowUpgradeModal(true)}
          upcomingRenewals={upcomingRenewals}
          showRenewalAlert={showRenewalAlert}
          onDismissRenewalAlert={() => setShowRenewalAlert(false)}
        />
      </NavigationContainer>

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <UpgradeScreen
          onUpgradeSuccess={handleUpgradeSuccess}
          onClose={() => setShowUpgradeModal(false)}
        />
      </Modal>
    </SafeAreaProvider>
  );
}

export default App;
