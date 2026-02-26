import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat';
import type { PurchasesOffering, PurchasesPackage } from '../services/revenuecat';

interface Props {
  onUpgradeSuccess: () => void;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

const FEATURES = [
  { icon: 'infinity', title: 'Unlimited Subscriptions', desc: 'Track as many as you want' },
  { icon: 'eye-off', title: 'Ad-Free Experience', desc: 'No interruptions' },
  { icon: 'refresh-cw', title: 'Autopay Tracking', desc: 'Monitor all payments' },
  { icon: 'bell', title: 'Smart Notifications', desc: 'Never miss a renewal' },
  { icon: 'pie-chart', title: 'Advanced Analytics', desc: 'Detailed insights' },
  { icon: 'shield', title: 'Priority Support', desc: '24/7 assistance' },
];

export function UpgradeScreen({ onUpgradeSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setLoading(true);
    try {
      const currentOffering = await getOfferings();
      setOffering(currentOffering);
      
      if (currentOffering?.availablePackages && currentOffering.availablePackages.length > 0) {
        setSelectedPackage(currentOffering.availablePackages[0]);
      } else {
        console.warn('[UpgradeScreen] No packages available');
      }
    } catch (error: any) {
      console.error('[UpgradeScreen] Error loading offerings:', error);
      Alert.alert(
        'Configuration Required',
        'In-app purchases are not configured yet. Please set up products in RevenueCat dashboard.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        Alert.alert(
          '🎉 Welcome to Pro!',
          'You now have access to all premium features.',
          [{ text: 'Get Started', onPress: onUpgradeSuccess }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      console.log('[UpgradeScreen] User initiated restore purchases');
      const success = await restorePurchases();
      
      if (success) {
        console.log('[UpgradeScreen] Restore successful, calling onUpgradeSuccess');
        Alert.alert(
          '✅ Purchases Restored',
          'Your Pro subscription has been restored successfully!',
          [{ text: 'Continue', onPress: onUpgradeSuccess }]
        );
      } else {
        console.log('[UpgradeScreen] Restore returned false - no active purchases');
        Alert.alert(
          'No Active Purchases Found',
          'We couldn\'t find any active subscriptions linked to this account. If you recently purchased, please wait a few minutes and try again.\n\nIf the problem persists, contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('[UpgradeScreen] Restore error:', error);
      Alert.alert(
        'Restore Failed',
        `Something went wrong while restoring purchases: ${error.message || 'Unknown error'}\n\nPlease try again or contact support.`,
        [{ text: 'OK' }]
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleDebugInfo = async () => {
    try {
      const { getCustomerInfo, getCurrentApiKeyInfo } = require('../services/revenuecat');
      const customerInfo = await getCustomerInfo();
      const apiKeyInfo = getCurrentApiKeyInfo();
      
      if (customerInfo) {
        const debugInfo = {
          originalAppUserId: customerInfo.originalAppUserId,
          activeSubscriptions: customerInfo.activeSubscriptions || [],
          allPurchasedProducts: customerInfo.allPurchasedProductIdentifiers || [],
          activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
          allEntitlements: Object.keys(customerInfo.entitlements.all || {}),
        };
        
        console.log('[Debug] Customer Info:', JSON.stringify(debugInfo, null, 2));
        
        Alert.alert(
          'Debug Info',
          `Environment: ${apiKeyInfo.environment}\n` +
          `API Key: ${apiKeyInfo.keyPrefix}\n\n` +
          `User ID: ${debugInfo.originalAppUserId}\n\n` +
          `Active Subscriptions: ${debugInfo.activeSubscriptions.length}\n` +
          `${debugInfo.activeSubscriptions.join(', ')}\n\n` +
          `Purchased Products: ${debugInfo.allPurchasedProducts.length}\n` +
          `${debugInfo.allPurchasedProducts.join(', ')}\n\n` +
          `Active Entitlements: ${debugInfo.activeEntitlements.length}\n` +
          `${debugInfo.activeEntitlements.join(', ')}\n\n` +
          `Check console for full details.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Debug Info', 'No customer info available');
      }
    } catch (error: any) {
      Alert.alert('Debug Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B67CA" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="x" size={24} color="#1A1D1F" />
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.badge}>
          <Icon name="star" size={20} color="#FFB800" />
          <Text style={styles.badgeText}>PRO</Text>
        </View>
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>Unlock all premium features</Text>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresGrid}>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureIconWrapper}>
              <Icon name={feature.icon} size={20} color="#5B67CA" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pricing Section */}
      {offering && offering.availablePackages.length > 0 ? (
        <View style={styles.pricingSection}>
          {offering.availablePackages.map((pkg: PurchasesPackage) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[
                styles.priceCard,
                selectedPackage?.identifier === pkg.identifier && styles.priceCardSelected,
              ]}
              onPress={() => setSelectedPackage(pkg)}
            >
              <View style={styles.priceCardContent}>
                <View style={styles.priceLeft}>
                  <Text style={styles.priceTitle}>
                    {pkg.product.title.replace(/\s*\(.*?\)\s*/g, '')}
                  </Text>
                  <Text style={styles.priceAmount}>{pkg.product.priceString}</Text>
                </View>
                {selectedPackage?.identifier === pkg.identifier && (
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.noOfferings}>
          <Icon name="alert-circle" size={40} color="#FF6D4D" />
          <Text style={styles.noOfferingsText}>Products not configured</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="zap" size={20} color="#FFFFFF" />
              <Text style={styles.purchaseButtonText}>
                {selectedPackage ? `Subscribe Now` : 'Select a Plan'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          onLongPress={handleDebugInfo}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#5B67CA" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Auto-renews. Cancel anytime in settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6F767E',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFB800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1D1F',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6F767E',
    fontWeight: '500',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F1FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D1F',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#6F767E',
  },
  pricingSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E6E8EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  priceCardSelected: {
    borderColor: '#5B67CA',
    backgroundColor: '#F0F1FA',
  },
  priceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLeft: {
    flex: 1,
  },
  priceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1D1F',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5B67CA',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5B67CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOfferings: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  noOfferingsText: {
    fontSize: 14,
    color: '#FF6D4D',
    marginTop: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginTop: 'auto',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B67CA',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#5B67CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B67CA',
  },
  disclaimer: {
    fontSize: 12,
    color: '#8F95B2',
    textAlign: 'center',
    lineHeight: 16,
  },
});
