import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../theme';
import type { AutopayTransaction } from '../types';
import {
  detectAppTarget,
  getCancellationGuide,
  canOpenApp,
  openApp,
  getPackageIdForSubscription,
  type AppTarget,
} from '../utils/deepLinkService';
import { getStorage } from '../storage';

// Global flag to track if user opened external app (persists across component remounts)
let globalHasOpenedApp = false;

interface CancellationModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: AutopayTransaction;
  onCancellationComplete?: (transactionId: string, cancelled: boolean) => void;
}

/**
 * Guided Cancellation Modal
 * 
 * Shows step-by-step instructions and opens the appropriate app
 * for cancelling subscriptions/autopay mandates.
 */
export function CancellationModal({
  visible,
  onClose,
  transaction,
  onCancellationComplete,
}: CancellationModalProps) {
  const [appTarget, setAppTarget] = useState<AppTarget>('unknown');
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [hasOpened, setHasOpened] = useState<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (visible) {
      checkAppAvailability();
      // Check if user previously opened the app (from global flag)
      if (globalHasOpenedApp) {
        setHasOpened(true);
      } else {
        setHasOpened(false);
      }
    } else {
      // Reset global flag when modal closes
      globalHasOpenedApp = false;
    }
  }, [visible, transaction]);

  // Detect when user returns to the app after opening external app
  useEffect(() => {
    if (!visible) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[CancellationModal] AppState changed from', appStateRef.current, 'to', nextAppState);
      console.log('[CancellationModal] globalHasOpenedApp:', globalHasOpenedApp);
      console.log('[CancellationModal] visible:', visible);
      
      // User returned to foreground after opening external app
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        globalHasOpenedApp
      ) {
        console.log('[CancellationModal] User returned from external app, showing feedback');
        // Use a small delay to ensure the component is fully mounted
        setTimeout(() => {
          setHasOpened(true);
        }, 100);
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [visible]);

  const checkAppAvailability = async () => {
    setIsChecking(true);
    
    const target = detectAppTarget(
      transaction.merchantName, 
      transaction.rawSms,
      transaction.paymentApp
    );
    setAppTarget(target);
    
    if (target !== 'unknown') {
      const canOpen = await canOpenApp(target);
      setIsAppInstalled(canOpen);
    }
    
    setIsChecking(false);
  };

  const handleOpenApp = async () => {
    // Don't show feedback immediately, only set the flag
    // Feedback will show when user returns from external app
    globalHasOpenedApp = true;
    
    // For Play Store, get package ID
    let packageId: string | undefined;
    if (appTarget === 'playstore') {
      packageId = getPackageIdForSubscription(transaction.merchantName) || undefined;
    }
    
    const opened = await openApp(appTarget, packageId);
    
    if (!opened && appTarget !== 'playstore') {
      Alert.alert(
        'App Not Installed',
        `${guide.appName} is not installed. We'll take you to the Play Store to install it.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDidCancel = (cancelled: boolean) => {
    if (cancelled) {
      // Track successful cancellation
      trackCancellation(transaction.id, appTarget, true);
    }
    
    onCancellationComplete?.(transaction.id, cancelled);
    onClose();
  };

  const guide = getCancellationGuide(appTarget);
  
  // Calculate urgency
  const isUrgent = transaction.nextPaymentDate 
    ? (transaction.nextPaymentDate - Date.now()) < 2 * 24 * 60 * 60 * 1000 // Less than 2 days
    : false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Subscription</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Subscription Info */}
            <View style={styles.subscriptionInfo}>
              <Text style={styles.merchantName}>{transaction.merchantName}</Text>
              <Text style={styles.amount}>₹{transaction.amount.toFixed(2)}</Text>
              
              {isUrgent && transaction.nextPaymentDate && (
                <View style={styles.urgentBanner}>
                  <Icon name="alert-triangle" size={20} color="#FF9800" />
                  <View style={styles.urgentBannerContent}>
                    <Text style={styles.urgentText}>
                      ⚠️ Payment due {formatDueDate(transaction.nextPaymentDate)}
                    </Text>
                    <Text style={styles.urgentSubtext}>Cancel now to avoid charges</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Loading State */}
            {isChecking && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>Checking app availability...</Text>
              </View>
            )}

            {/* App Info & Steps */}
            {!isChecking && (
              <>
                <View style={styles.appInfo}>
                  <Text style={styles.appInfoTitle}>
                    {isAppInstalled 
                      ? `We'll take you to ${guide.appName}` 
                      : appTarget === 'unknown'
                      ? 'Follow these steps'
                      : `${guide.appName} not installed`}
                  </Text>
                  <Text style={styles.estimatedTime}>
                    Estimated time: {guide.estimatedTime}
                  </Text>
                </View>

                {/* Steps */}
                <View style={styles.stepsContainer}>
                  <Text style={styles.stepsTitle}>Steps to cancel:</Text>
                  {guide.steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Additional Tips */}
                {appTarget === 'unknown' && (
                  <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>💡 Tips:</Text>
                    <Text style={styles.tipText}>
                      • Check the SMS for the payment app name
                    </Text>
                    <Text style={styles.tipText}>
                      • Look for "via PhonePe" or "via GPay" in the message
                    </Text>
                    <Text style={styles.tipText}>
                      • Contact merchant support if you can't find the mandate
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          {!isChecking && (
            <View style={styles.footer}>
              {appTarget !== 'unknown' && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleOpenApp}
                >
                  <Text style={styles.primaryButtonText}>
                    {appTarget === 'playstore'
                      ? 'Open Subscriptions'
                      : isAppInstalled 
                      ? `Open ${guide.appName}` 
                      : `Install ${guide.appName}`}
                  </Text>
                </TouchableOpacity>
              )}

              {hasOpened && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackTitle}>Did you cancel this subscription?</Text>
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.successButton]}
                      onPress={() => handleDidCancel(true)}
                    >
                      <Text style={styles.successButtonText}>Yes, Cancelled</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton]}
                      onPress={() => handleDidCancel(false)}
                    >
                      <Text style={styles.secondaryButtonText}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!hasOpened && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function formatDueDate(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function trackCancellation(transactionId: string, appTarget: AppTarget, success: boolean) {
  try {
    const storage = getStorage();
    const key = `cancellation_${transactionId}`;
    const data = {
      transactionId,
      appTarget,
      success,
      timestamp: Date.now(),
    };
    storage.set(key, JSON.stringify(data));
    
    // Also track success rate for this app
    if (success) {
      const statsKey = `cancellation_stats_${appTarget}`;
      const existing = storage.getString(statsKey);
      const stats = existing ? JSON.parse(existing) : { successful: 0, total: 0 };
      stats.successful += 1;
      stats.total += 1;
      storage.set(statsKey, JSON.stringify(stats));
    }
  } catch (error) {
    console.error('[CancellationModal] Error tracking cancellation:', error);
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 24,
    maxHeight: '88%',
    width: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  subscriptionInfo: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: 4,
  },
  urgentBanner: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  urgentBannerContent: {
    flex: 1,
  },
  urgentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  urgentSubtext: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
  },
  appInfo: {
    marginBottom: 20,
    padding: 18,
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  appInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  estimatedTime: {
    fontSize: 13,
    color: colors.text.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 18,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 22,
    paddingTop: 8,
  },
  tipsContainer: {
    backgroundColor: '#E3F2FD',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 14,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 10,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackContainer: {
    marginTop: 4,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
  },
});
