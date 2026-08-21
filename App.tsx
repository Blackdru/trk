import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar, Alert, AppState, AppStateStatus, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import dayjs from 'dayjs';

import { AppProvider, useAppContext } from './src/context/AppContext';
import { useSmsSync } from './src/hooks/useSmsSync';
import { usePermissions } from './src/hooks/usePermissions';
import { WelcomeScreen } from './src/screens';
import RevenueCatUI from 'react-native-purchases-ui';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { PaymentAlarmScreen } from './src/components/PaymentAlarmScreen';
import { OfflineScreen } from './src/components/OfflineScreen';
import type { Subscription, AutopayTransaction } from './src/types';
import { subscribeSmsReceived } from './src/native/SmsModule';
import { parseSms } from './src/utils/smsParser';
import { calculateNextRenewal } from './src/utils/subscriptionDetector';
import { enrichAutopayWithCycles } from './src/utils/autopayTracker';
import {
  getSubscriptions,
  getAutopayTransactions,
  hasCompletedWelcome,
  setWelcomeCompleted,
  deleteSubscription as deleteStoredSubscription,
  deleteAutopayTransaction as deleteStoredAutopay,
} from './src/storage';
import {
  createNotificationChannels,
} from './src/utils/reliableNotifications';
import { getUpcomingRenewals, getUpcomingPayments } from './src/utils/notifications';
import type { UpcomingPayment } from './src/utils/notifications';
import {
  initializeAlarmService,
  stopAlarmService,
  schedulePaymentAlarms,
  dismissAlarm,
  markPaymentAsPaid,
  snoozeAlarm,
  hasBeenSnoozed,
  type PaymentAlarm,
} from './src/services/alarmService';
import { initializeRevenueCat, checkSubscriptionStatus, setProStatusChangeCallback } from './src/services/revenuecat';
import { initializeAdMob, showInterstitialAd } from './src/services/admob';
import { getSubscriptionTier, canAddSubscription } from './src/services/subscriptionService';
import { checkAndPromptAppUpdate } from './src/services/appUpdateService';

function AppContent() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const {
    subscriptions,
    autopayTransactions,
    settings,
    isPro,
    hasSmsPermission,
    setSubscriptions,
    setAutopayTransactions,
    updateSettings,
    setIsPro,
    setHasSmsPermission,
    addSubscription: addSubscriptionToContext,
    addAutopayTransaction: addAutopayToContext,
    deleteSubscription: deleteSubscriptionFromContext,
    deleteAutopayTransaction: deleteAutopayFromContext,
    updateSubscription,
  } = useAppContext();
  
  const { syncSms, handleNewTransaction, isSyncing } = useSmsSync();
  const { checkSmsPermission, requestSmsPermission } = usePermissions();
  
  const [refreshing, setRefreshing] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [showWelcome, setShowWelcome] = useState(!hasCompletedWelcome());
  const [activeAlarms, setActiveAlarms] = useState<PaymentAlarm[]>([]);
  const [activeAlarmIndex, setActiveAlarmIndex] = useState(0);
  const [upcomingRenewals, setUpcomingRenewals] = useState<{
    today: Subscription[];
    tomorrow: Subscription[];
    twoDays: Subscription[];
  }>({ today: [], tomorrow: [], twoDays: [] });
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Register callback for pro status changes
  useEffect(() => {
    setProStatusChangeCallback((newIsPro) => {
      console.log('[App] Pro status changed:', newIsPro);
      setIsPro(newIsPro);
      
      if (newIsPro) {
        const allSubs = getSubscriptions();
        setSubscriptions(allSubs);
      }
    });
  }, [setIsPro, setSubscriptions]);

  // Monitor network connectivity
  useEffect(() => {
    console.log('[App] Setting up network monitoring');
    
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      console.log('[App] Network status:', connected ? 'online' : 'offline');
      setIsOnline(connected);
    });

    // Check initial network status
    NetInfo.fetch().then(state => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Periodic SMS sync
  useEffect(() => {
    if (!hasSmsPermission || appState !== 'active') return;

    console.log('[App] Setting up periodic SMS sync');
    
    // Sync immediately
    performSync();
    
    // Then sync every 5 minutes
    const interval = setInterval(() => {
      console.log('[App] Periodic SMS sync triggered');
      performSync();
    }, 5 * 60 * 1000);

    return () => {
      console.log('[App] Clearing periodic SMS sync');
      clearInterval(interval);
    };
  }, [hasSmsPermission, appState, subscriptions, autopayTransactions, settings.trackAutopay]);

  // Initialize app
  useEffect(() => {
    if (!showWelcome) {
      initializeApp();
    }
  }, [showWelcome]);



  // Listen for incoming SMS
  useEffect(() => {
    if (!hasSmsPermission) return;

    console.log('[App] Setting up SMS receiver listener');
    const subscription = subscribeSmsReceived(sms => {
      console.log('[App] SMS received:', sms.address);
      const parsed = parseSms(sms);
      if (parsed) {
        handleNewTransaction(
          parsed,
          subscriptions,
          autopayTransactions,
          setSubscriptions,
          setAutopayTransactions,
          () => {
            RevenueCatUI.presentPaywall().catch(err => console.warn(err));
          }
        );
      }
    });

    return () => {
      console.log('[App] Removing SMS receiver listener');
      subscription.remove();
    };
  }, [hasSmsPermission, subscriptions, autopayTransactions, handleNewTransaction]);

  // Schedule payment alarms and notifications
  useEffect(() => {
    if (settings.notificationsEnabled) {
      console.log('[App] Scheduling native alarms and notifications...');
      schedulePaymentAlarms(
        subscriptions,
        autopayTransactions,
        settings.alarmTimeBeforeDue || 8,
        settings.alarmTimeOnDueDate || 6
      );
      
      // Also schedule notifee notifications for redundancy
      import('./src/utils/reliableNotifications').then(({ scheduleAllReliableReminders }) => {
        scheduleAllReliableReminders(subscriptions, autopayTransactions);
      });
    }
  }, [subscriptions, autopayTransactions, settings.notificationsEnabled, settings.alarmTimeBeforeDue, settings.alarmTimeOnDueDate]);

  // Initialize alarm service
  useEffect(() => {
    if (settings.notificationsEnabled) {
      initializeAlarmService((alarms) => {
        console.log(`[App] ${alarms.length} alarm(s) triggered`);
        setActiveAlarms(prev => {
          if (prev.length === 0) return alarms;
          const prevIds = new Set(prev.map(a => a.id));
          const newAlarms = alarms.filter(a => !prevIds.has(a.id));
          return newAlarms.length > 0 ? [...prev, ...newAlarms] : prev;
        });
      });

      return () => {
        stopAlarmService();
      };
    }
  }, [settings.notificationsEnabled]);

  const initializeApp = async () => {
    try {
      const storedSubs = getSubscriptions();
      const tier = getSubscriptionTier();
      
      let subsToLoad = storedSubs;
      if (!tier.isPro && storedSubs.length > tier.maxSubscriptions) {
        const manualSubs = storedSubs.filter(s => s.source === 'manual');
        const smsSubs = storedSubs.filter(s => s.source === 'sms')
          .sort((a, b) => (b.lastPaymentDate || 0) - (a.lastPaymentDate || 0));
        
        subsToLoad = [...manualSubs, ...smsSubs].slice(0, tier.maxSubscriptions);
      }
      
      setSubscriptions(subsToLoad);

      const storedAutopay = getAutopayTransactions();
      const enrichedAutopay = enrichAutopayWithCycles(storedAutopay);
      setAutopayTransactions(enrichedAutopay);

      // Create notification channels and request permission
      await createNotificationChannels();
      
      // Request notification permission if notifications are enabled
      if (settings.notificationsEnabled) {
        const { requestNotificationPermission } = await import('./src/utils/reliableNotifications');
        const hasNotificationPermission = await requestNotificationPermission();
        
        if (!hasNotificationPermission) {
          console.warn('[App] Notification permission not granted');
        }
      }

      console.log('[App] Initializing RevenueCat...');
      await initializeRevenueCat();
      const isProUser = await checkSubscriptionStatus();
      setIsPro(isProUser);
      
      if (!isProUser) {
        console.log('[App] Initializing AdMob...');
        await initializeAdMob();
      }

      // Check current SMS permission status (don't request again - handled during welcome)
      const hasPermission = await checkSmsPermission();
      setHasSmsPermission(hasPermission);

      if (!hasPermission) {
        setShowWelcome(true);
      } else {
        await performSync();
        checkUpcomingPayments();
      }

      // Check for Google Play Store updates on app launch
      checkAndPromptAppUpdate();
    } catch (error) {
      console.error('[App] Initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app. Please restart.');
    }
  };

  const performSync = useCallback(async () => {
    await syncSms(
      subscriptions,
      autopayTransactions,
      settings.trackAutopay,
      (newSubs, newAutopay, newCount) => {
        setSubscriptions(newSubs);
        setAutopayTransactions(newAutopay);
        
        if (newCount > 0) {
          const newSubNames = newSubs
            .slice(-newCount)
            .map(s => s.merchantName)
            .join(', ');
          
          Alert.alert(
            '🎉 New Subscriptions Found!',
            `Detected ${newCount} subscription(s): ${newSubNames}`,
            [
              {
                text: 'OK',
              },
            ]
          );
        }
      }
    );
  }, [subscriptions, autopayTransactions, settings.trackAutopay, syncSms]);

  const checkUpcomingPayments = useCallback(() => {
    const renewals = getUpcomingRenewals(subscriptions);
    setUpcomingRenewals(renewals);
    
    const upcoming = getUpcomingPayments(subscriptions, autopayTransactions);
    const hasUpcoming = upcoming.today.length > 0 || upcoming.tomorrow.length > 0;
    
    if (hasUpcoming) {
      setShowRenewalAlert(true);
      
      if (upcoming.today.length > 0) {
        const names = upcoming.today.map(p => `${p.merchantName} (${p.type})`).join(', ');
        Alert.alert(
          'Payments Due Today!',
          `${upcoming.today.length} payment(s) due today: ${names}`
        );
      } else if (upcoming.tomorrow.length > 0) {
        const names = upcoming.tomorrow.map(p => `${p.merchantName} (${p.type})`).join(', ');
        Alert.alert(
          'Payments Due Tomorrow',
          `${upcoming.tomorrow.length} payment(s) due tomorrow: ${names}`
        );
      }
    }
  }, [subscriptions, autopayTransactions]);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[App] App came to foreground');
        
        // Re-verify SMS permission in case it was revoked in settings
        checkSmsPermission().then(hasPermission => {
          setHasSmsPermission(hasPermission);
          if (!hasPermission) {
            setShowWelcome(true);
          } else {
            performSync();
          }
        });
        
        checkUpcomingPayments();
        checkAndPromptAppUpdate();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, hasSmsPermission, subscriptions, autopayTransactions, checkSmsPermission, performSync, checkUpcomingPayments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    if (hasSmsPermission) {
      try {
        const { forceFullResync } = require('./src/native/SmsModule');
        await forceFullResync();
      } catch (e) {
        console.error('[App] Error during forceFullResync:', e);
      }
      await performSync();
    } else {
      setRefreshing(false);
      Alert.alert(
        'SMS Permission Required',
        'Please grant SMS permission to detect subscriptions automatically.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: async () => {
              const granted = await requestSmsPermission();
              if (granted) {
                setHasSmsPermission(true);
                setRefreshing(true);
                try {
                  const { forceFullResync } = require('./src/native/SmsModule');
                  await forceFullResync();
                } catch (e) {
                  console.error('[App] Error during forceFullResync:', e);
                }
                await performSync();
                setRefreshing(false);
              }
            }
          },
        ]
      );
      return;
    }
    
    setRefreshing(false);
  }, [hasSmsPermission, performSync, requestSmsPermission]);

  const handleAddSubscription = useCallback((sub: Subscription): boolean => {
    const tier = getSubscriptionTier();
    
    if (!tier.isPro && subscriptions.length >= tier.maxSubscriptions) {
      Alert.alert(
        'Subscription Limit Reached',
        `Free users can track up to ${tier.maxSubscriptions} subscriptions. Upgrade to Pro for unlimited subscriptions.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => { RevenueCatUI.presentPaywall().catch(err => console.warn(err)); } },
        ]
      );
      return false;
    }

    addSubscriptionToContext(sub);
    
    if (!isPro) {
      showInterstitialAd();
    }
    
    return true;
  }, [subscriptions.length, isPro, addSubscriptionToContext]);

  const handleAddAutopay = useCallback((autopay: AutopayTransaction): boolean => {
    const tier = getSubscriptionTier();
    
    // Check if autopay tracking is available
    if (!tier.hasAutopayTracking) {
      Alert.alert(
        'Pro Feature',
        'Autopay tracking is a Pro feature. Upgrade to Pro to track unlimited autopay transactions.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => { RevenueCatUI.presentPaywall().catch(err => console.warn(err)); } },
        ]
      );
      return false;
    }

    console.log(`[App] Adding autopay transaction: ${autopay.merchantName}`);
    
    // Enrich the new autopay transaction with all existing ones to calculate nextPaymentDate
    const allAutopay = [...autopayTransactions, autopay];
    const enriched = enrichAutopayWithCycles(allAutopay);
    
    // Find the enriched version of the new transaction
    const enrichedNew = enriched.find(t => t.id === autopay.id);
    
    if (enrichedNew) {
      console.log(`[App] Enriched autopay: nextPaymentDate = ${enrichedNew.nextPaymentDate ? dayjs(enrichedNew.nextPaymentDate).format('YYYY-MM-DD') : 'none'}`);
      addAutopayToContext(enrichedNew);
    } else {
      addAutopayToContext(autopay);
    }
    
    if (!isPro) {
      showInterstitialAd();
    }
    
    return true;
  }, [isPro, addAutopayToContext, autopayTransactions]);

  const handleDeleteSubscription = useCallback((id: string) => {
    Alert.alert('Delete Subscription', 'Are you sure you want to remove this subscription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSubscriptionFromContext(id);
          deleteStoredSubscription(id);
          
          if (!isPro) {
            showInterstitialAd();
          }
        },
      },
    ]);
  }, [isPro, deleteSubscriptionFromContext]);

  const handleDeleteAutopay = useCallback((id: string) => {
    Alert.alert('Delete Autopay', 'Are you sure you want to remove this autopay transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAutopayFromContext(id);
          deleteStoredAutopay(id);
          
          if (!isPro) {
            showInterstitialAd();
          }
        },
      },
    ]);
  }, [isPro, deleteAutopayFromContext]);

  const handleMarkSubscriptionPaid = useCallback((id: string) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;
    
    // Use current nextRenewalDate if future (or Date.now() if past/missing)
    // so paying early (e.g. July 27 for a July 29 due date) advances to August 29, not August 27
    const baseDate = sub.nextRenewalDate && sub.nextRenewalDate > Date.now()
      ? sub.nextRenewalDate
      : Date.now();
    const nextRenewal = calculateNextRenewal(baseDate, sub.billingCycle);
    updateSubscription(id, {
      lastPaymentDate: Date.now(),
      nextRenewalDate: nextRenewal,
    });
  }, [subscriptions, updateSubscription]);

  const handleMarkAutopayPaid = useCallback((id: string) => {
    // For autopay transactions, we just mark them as processed
    // by removing any nextPaymentDate field if it exists
    const autopay = autopayTransactions.find(t => t.id === id);
    if (!autopay) return;
    
    console.log(`[App] Marking autopay as paid: ${autopay.merchantName}`);
    // Autopay transactions don't have recurring dates, so we just acknowledge the payment
    // The transaction remains in history but is marked as handled
  }, [autopayTransactions]);

  const advanceAlarm = useCallback(() => {
    if (activeAlarmIndex + 1 < activeAlarms.length) {
      setActiveAlarmIndex(activeAlarmIndex + 1);
    } else {
      setActiveAlarms([]);
      setActiveAlarmIndex(0);
    }
  }, [activeAlarmIndex, activeAlarms.length]);

  const handleMarkAsPaid = useCallback(() => {
    const currentAlarm = activeAlarms[activeAlarmIndex];
    if (!currentAlarm) return;
    
    markPaymentAsPaid(currentAlarm.paymentId);
    advanceAlarm();
  }, [activeAlarms, activeAlarmIndex, advanceAlarm]);

  const handleRemindTomorrow = useCallback(() => {
    const currentAlarm = activeAlarms[activeAlarmIndex];
    if (!currentAlarm) return;
    
    dismissAlarm(currentAlarm.id);
    advanceAlarm();
  }, [activeAlarms, activeAlarmIndex, advanceAlarm]);

  const handleSnooze = useCallback(() => {
    const currentAlarm = activeAlarms[activeAlarmIndex];
    if (!currentAlarm) return;
    
    if (hasBeenSnoozed(currentAlarm.id)) {
      Alert.alert('Already Snoozed', 'This alarm has already been snoozed once.');
      return;
    }
    
    snoozeAlarm(currentAlarm.id);
    advanceAlarm();
  }, [activeAlarms, activeAlarmIndex, advanceAlarm]);

  if (showWelcome) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <WelcomeScreen
          onComplete={async (smsPermissionGranted: boolean) => {
            if (!smsPermissionGranted) {
              Alert.alert('Permission Required', 'SMS permission is mandatory to use the app.');
              return;
            }
            setWelcomeCompleted();
            setShowWelcome(false);
            setHasSmsPermission(true);
          }}
          onRequestSmsPermission={requestSmsPermission}
        />
      </SafeAreaProvider>
    );
  }

  // Block app if offline
  if (!isOnline) {
    return <OfflineScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer ref={navigationRef}>
        <BottomTabNavigator
          subscriptions={subscriptions}
          autopayTransactions={autopayTransactions}
          settings={settings}
          onAddSubscription={handleAddSubscription}
          onAddAutopay={handleAddAutopay}
          onDeleteSubscription={handleDeleteSubscription}
          onDeleteAutopay={handleDeleteAutopay}
          onMarkSubscriptionPaid={handleMarkSubscriptionPaid}
          onMarkAutopayPaid={handleMarkAutopayPaid}
          onSettingsChange={updateSettings}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onRequestSmsPermission={requestSmsPermission}
          hasSmsPermission={hasSmsPermission}
          isPro={isPro}
          onUpgradePress={() => { RevenueCatUI.presentPaywall().catch(err => console.warn(err)); }}
          upcomingRenewals={upcomingRenewals}
          showRenewalAlert={showRenewalAlert}
          onDismissRenewalAlert={() => setShowRenewalAlert(false)}
        />
      </NavigationContainer>



      <Modal
        visible={activeAlarms.length > 0}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {}}
      >
        {activeAlarms.length > 0 && (
          <PaymentAlarmScreen
            payment={{
              id: activeAlarms[activeAlarmIndex].id,
              merchantName: activeAlarms[activeAlarmIndex].merchantName,
              amount: activeAlarms[activeAlarmIndex].amount,
              dueDate: activeAlarms[activeAlarmIndex].dueDate,
              type: activeAlarms[activeAlarmIndex].type,
              category: activeAlarms[activeAlarmIndex].category,
            }}
            urgency={activeAlarms[activeAlarmIndex].urgency}
            onMarkAsPaid={handleMarkAsPaid}
            onRemindTomorrow={handleRemindTomorrow}
            onSnooze={handleSnooze}
            currentIndex={activeAlarmIndex}
            totalAlarms={activeAlarms.length}
          />
        )}
      </Modal>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
