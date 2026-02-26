import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { getOfferings, purchasePackage, restorePurchases } from '../services/revenuecat';
import type { PurchasesOffering, PurchasesPackage } from '../services/revenuecat';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  onUpgradeSuccess: () => void;
  onClose: () => void;
}

const FEATURES = [
  { 
    icon: 'infinity', 
    title: 'Unlimited Subscriptions', 
    desc: 'Track as many subscriptions as you want without any limits',
    color: colors.primary[600],
    bgColor: colors.primary[100],
  },
  { 
    icon: 'eye-off', 
    title: 'Ad-Free Experience', 
    desc: 'Enjoy the app without any interruptions or advertisements',
    color: colors.success[600],
    bgColor: colors.success[100],
  },
  { 
    icon: 'refresh-cw', 
    title: 'Autopay Tracking', 
    desc: 'Monitor all your autopay and mandate transactions',
    color: colors.warning[600],
    bgColor: colors.warning[100],
  },
  { 
    icon: 'bell', 
    title: 'Smart Notifications', 
    desc: 'Get timely reminders before subscription renewals',
    color: colors.error[600],
    bgColor: colors.error[100],
  },
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={gradients.purple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingContainer}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.text.inverse} />
            <Text style={styles.loadingText}>Loading subscription options...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={gradients.sunset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="x" size={24} color={colors.text.inverse} />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.starBadge}>
              <Icon name="star" size={20} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>Upgrade to Pro</Text>
          </View>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You'll Get</Text>
          
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.bgColor }]}>
                  <Icon name={feature.icon} size={24} color={feature.color} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
                <View style={styles.featureCheck}>
                  <Icon name="check-circle" size={20} color={colors.success[500]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          {offering && offering.availablePackages.length > 0 ? (
            <View style={styles.pricingCards}>
              {offering.availablePackages.map((pkg: PurchasesPackage) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isSelected ? gradients.primary : [colors.background, colors.background]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.priceCard,
                        isSelected && styles.priceCardSelected,
                        isSelected && shadows.lg,
                      ]}
                    >
                      <View style={styles.priceCardContent}>
                        <View style={styles.priceInfo}>
                          <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                            {pkg.product.title.replace(/\s*\(.*?\)\s*/g, '')}
                          </Text>
                          <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, isSelected && styles.priceAmountSelected]}>
                              {pkg.product.priceString}
                            </Text>
                            {pkg.packageType === 'ANNUAL' && (
                              <View style={styles.saveBadge}>
                                <Text style={styles.saveBadgeText}>SAVE 40%</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Icon name="check" size={18} color={colors.text.inverse} />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noOfferings}>
              <Icon name="alert-circle" size={48} color={colors.error[500]} />
              <Text style={styles.noOfferingsTitle}>Products Not Available</Text>
              <Text style={styles.noOfferingsText}>
                In-app purchases are not configured yet. Please try again later.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={purchasing || !selectedPackage ? [colors.gray[300], colors.gray[400]] : gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.purchaseButton, shadows.lg]}
          >
            {purchasing ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <>
                <Icon name="zap" size={20} color={colors.text.inverse} />
                <Text style={styles.purchaseButtonText}>
                  {selectedPackage ? 'Start Pro Now' : 'Select a Plan'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          onLongPress={handleDebugInfo}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.primary[600]} />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Auto-renews. Cancel anytime from your account settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body.medium,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  heroSection: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContent: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  starBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.headline.large,
    color: colors.text.inverse,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body.medium,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  featuresSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  featuresGrid: {
    gap: spacing.sm,
  },
  featureCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body.medium,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    ...typography.body.small,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  featureCheck: {
    marginLeft: spacing.xs,
  },
  pricingSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  pricingCards: {
    gap: spacing.md,
  },
  priceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  priceCardSelected: {
    borderColor: colors.primary[600],
    borderWidth: 3,
  },
  priceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  planName: {
    ...typography.title.small,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  planNameSelected: {
    color: colors.text.inverse,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceAmount: {
    ...typography.headline.medium,
    color: colors.primary[600],
    fontWeight: '800',
  },
  priceAmountSelected: {
    color: colors.text.inverse,
  },
  saveBadge: {
    backgroundColor: colors.success[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  saveBadgeText: {
    ...typography.label.small,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  selectedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOfferings: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  noOfferingsTitle: {
    ...typography.title.medium,
    color: colors.error[600],
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noOfferingsText: {
    ...typography.body.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.gray[50],
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  trustItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    ...shadows.lg,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  purchaseButtonText: {
    ...typography.body.large,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  restoreButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  restoreButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.primary[600],
  },
  disclaimer: {
    ...typography.body.small,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
