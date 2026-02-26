import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { Subscription, BillingCycle, AutopayTransaction } from '../types';
import { calculateMonthlyEquivalent } from '../utils/subscriptionDetector';
import { showRewardedAd } from '../services/admob';
import { getSubscriptionTier } from '../services/subscriptionService';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

dayjs.extend(relativeTime);

interface Props {
  onAdd: (subscription: Subscription) => boolean;
  onAddAutopay?: (autopay: AutopayTransaction) => boolean;
}

const CYCLES: { label: string; value: BillingCycle; icon: string }[] = [
  { label: 'Weekly', value: 'weekly', icon: 'refresh-cw' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar' },
  { label: 'Quarterly', value: 'quarterly', icon: 'clock' },
  { label: 'Yearly', value: 'yearly', icon: 'repeat' },
];

const AUTOPAY_CATEGORIES = [
  { label: 'Telecom', value: 'telecom', icon: 'phone' },
  { label: 'Utility', value: 'utility', icon: 'power' },
  { label: 'Loan/EMI', value: 'loan', icon: 'credit-card' },
  { label: 'Insurance', value: 'insurance', icon: 'shield' },
  { label: 'Investment', value: 'investment', icon: 'trending-up' },
  { label: 'Other', value: 'other', icon: 'dollar-sign' },
];

export function AddSubscriptionScreen({ onAdd, onAddAutopay }: Props) {
  const navigation = useNavigation();
  const [mode, setMode] = useState<'subscription' | 'autopay'>('subscription');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [nextDate, setNextDate] = useState(dayjs().add(1, 'month').format('YYYY-MM-DD'));
  const [autopayCategory, setAutopayCategory] = useState('other');

  const tier = getSubscriptionTier();

  const resetForm = () => {
    setName('');
    setAmount('');
    setCycle('monthly');
    setNextDate(dayjs().add(1, 'month').format('YYYY-MM-DD'));
    setAutopayCategory('other');
  };

  const handleModeChange = (newMode: 'subscription' | 'autopay') => {
    if (newMode === 'autopay') {
      if (!tier.hasAutopayTracking) {
        Alert.alert(
          '⭐ Pro Feature',
          'Autopay tracking is available for Pro users. Upgrade to track unlimited autopay transactions and enjoy ad-free experience.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Learn More', onPress: () => navigation.navigate('Settings' as never) },
          ]
        );
        return;
      }
    }
    setMode(newMode);
    resetForm();
  };

  const getMonthlyEquivalent = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return null;
    
    if (mode === 'subscription' && cycle !== 'monthly') {
      return calculateMonthlyEquivalent(parsedAmount, cycle);
    }
    return null;
  };

  const monthlyEquiv = getMonthlyEquivalent();

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', `Please enter ${mode === 'subscription' ? 'subscription' : 'merchant'} name`);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const parsedDate = dayjs(nextDate);
    if (!parsedDate.isValid()) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
      return;
    }

    if (mode === 'subscription') {
      const subscription: Subscription = {
        id: `manual-${Date.now()}`,
        merchantName: name.trim(),
        amount: parsedAmount,
        billingCycle: cycle,
        nextRenewalDate: parsedDate.valueOf(),
        source: 'manual',
        monthlyEquivalent: calculateMonthlyEquivalent(parsedAmount, cycle),
        notificationEnabled: true,
      };

      const success = onAdd(subscription);
      
      if (success) {
        resetForm();
        Alert.alert('Success', 'Subscription added successfully', [
          { text: 'OK', onPress: () => navigation.navigate('Subscriptions' as never) }
        ]);
        
        const tier = getSubscriptionTier();
        if (!tier.isPro) {
          setTimeout(() => {
            showRewardedAd(() => {
              console.log('[AddSubscription] User watched rewarded ad');
            });
          }, 500);
        }
      }
    } else {
      const tier = getSubscriptionTier();
      
      if (!tier.hasAutopayTracking) {
        Alert.alert(
          'Pro Feature',
          'Autopay tracking is a Pro feature. Upgrade to Pro to track unlimited autopay transactions.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => navigation.navigate('Settings' as never) },
          ]
        );
        return;
      }
      
      if (!onAddAutopay) {
        Alert.alert('Error', 'Autopay feature not available');
        return;
      }

      const autopay: AutopayTransaction = {
        id: `manual-autopay-${Date.now()}`,
        merchantName: name.trim(),
        amount: parsedAmount,
        date: parsedDate.valueOf(),
        paymentType: 'Autopay',
        status: 'active',
        category: autopayCategory,
        rawSms: `Manual autopay entry: ${name.trim()}`,
      };

      const success = onAddAutopay(autopay);
      
      if (success) {
        resetForm();
        navigation.navigate('Autopay' as never);
        setTimeout(() => {
          Alert.alert('✅ Success', `Autopay transaction added: ${name.trim()} - ₹${parsedAmount}`);
        }, 300);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={mode === 'subscription' ? gradients.primary : gradients.success}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {mode === 'subscription' ? 'Add Subscription' : 'Add Autopay'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'subscription' ? 'Track recurring payments' : 'Track one-time autopay'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollPadding}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Mode Toggle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Transaction Type</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'subscription' && styles.modeButtonActive]}
                onPress={() => handleModeChange('subscription')}
                activeOpacity={0.7}
              >
                <View style={[styles.modeIconWrapper, mode === 'subscription' && styles.modeIconWrapperActive]}>
                  <Icon 
                    name="layers" 
                    size={20} 
                    color={mode === 'subscription' ? colors.primary[600] : colors.text.tertiary} 
                  />
                </View>
                <View style={styles.modeTextWrapper}>
                  <Text style={[styles.modeTitle, mode === 'subscription' && styles.modeTitleActive]}>
                    Subscription
                  </Text>
                  <Text style={styles.modeDesc}>Recurring payments</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'autopay' && styles.modeButtonActive]}
                onPress={() => handleModeChange('autopay')}
                activeOpacity={0.7}
              >
                <View style={[styles.modeIconWrapper, mode === 'autopay' && styles.modeIconWrapperActive]}>
                  <Icon 
                    name="refresh-cw" 
                    size={20} 
                    color={mode === 'autopay' ? colors.success[600] : colors.text.tertiary} 
                  />
                </View>
                <View style={styles.modeTextWrapper}>
                  <Text style={[styles.modeTitle, mode === 'autopay' && styles.modeTitleActive]}>
                    Autopay
                  </Text>
                  <Text style={styles.modeDesc}>E-mandate/UPI</Text>
                </View>
                {!tier.hasAutopayTracking && (
                  <View style={styles.proBadge}>
                    <Icon name="star" size={10} color={colors.warning[600]} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {mode === 'subscription' ? 'Subscription Name' : 'Merchant Name'}
            </Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Icon name="tag" size={18} color={colors.primary[500]} />
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={mode === 'subscription' ? 'e.g., Netflix, Spotify, Prime' : 'e.g., Jio, Airtel, HDFC Bank'}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (₹)</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Icon name="dollar-sign" size={18} color={colors.success[500]} />
              </View>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            {monthlyEquiv && (
              <View style={styles.infoBox}>
                <Icon name="info" size={14} color={colors.primary[600]} />
                <Text style={styles.infoText}>
                  Monthly equivalent: ₹{monthlyEquiv.toFixed(0)}
                </Text>
              </View>
            )}
          </View>

          {mode === 'subscription' ? (
            <>
              {/* Billing Cycle */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Billing Cycle</Text>
                <View style={styles.cycleGrid}>
                  {CYCLES.map(c => (
                    <TouchableOpacity
                      key={c.value}
                      style={[styles.cycleButton, cycle === c.value && styles.cycleButtonActive]}
                      onPress={() => setCycle(c.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.cycleIconWrapper, cycle === c.value && styles.cycleIconWrapperActive]}>
                        <Icon 
                          name={c.icon} 
                          size={18} 
                          color={cycle === c.value ? colors.primary[600] : colors.text.tertiary} 
                        />
                      </View>
                      <Text style={[styles.cycleText, cycle === c.value && styles.cycleTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Next Billing Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Next Billing Date</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconWrapper}>
                    <Icon name="calendar" size={18} color={colors.warning[500]} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={nextDate}
                    onChangeText={setNextDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                <View style={styles.infoBox}>
                  <Icon name="info" size={14} color={colors.primary[600]} />
                  <Text style={styles.infoText}>
                    {dayjs(nextDate).isValid() 
                      ? `${dayjs(nextDate).fromNow()} (${dayjs(nextDate).format('MMM D, YYYY')})`
                      : 'Enter date in YYYY-MM-DD format'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {AUTOPAY_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.categoryButton, autopayCategory === cat.value && styles.categoryButtonActive]}
                      onPress={() => setAutopayCategory(cat.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.categoryIconWrapper, autopayCategory === cat.value && styles.categoryIconWrapperActive]}>
                        <Icon 
                          name={cat.icon} 
                          size={16} 
                          color={autopayCategory === cat.value ? colors.success[600] : colors.text.tertiary} 
                        />
                      </View>
                      <Text style={[styles.categoryText, autopayCategory === cat.value && styles.categoryTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Transaction Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transaction Date</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconWrapper}>
                    <Icon name="calendar" size={18} color={colors.warning[500]} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={nextDate}
                    onChangeText={setNextDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>
            </>
          )}

          {/* Add Button */}
          <TouchableOpacity 
            style={[
              styles.addButton,
              mode === 'autopay' && styles.addButtonAutopay,
            ]} 
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={mode === 'subscription' ? gradients.primary : gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButtonGradient}
            >
              <Icon name="plus-circle" size={22} color={colors.text.inverse} />
              <Text style={styles.addButtonText}>
                Add {mode === 'subscription' ? 'Subscription' : 'Autopay Transaction'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  headerContent: {
    marginTop: spacing.xs,
  },
  headerTitle: {
    ...typography.headline.medium,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.body.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    paddingBottom: spacing.xxxl,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.title.small,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  inputIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body.large,
    color: colors.text.primary,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  infoText: {
    ...typography.body.small,
    color: colors.text.secondary,
    flex: 1,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.sm,
  },
  modeButtonActive: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
    ...shadows.md,
  },
  modeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconWrapperActive: {
    backgroundColor: colors.primary[100],
  },
  modeTextWrapper: {
    flex: 1,
  },
  modeTitle: {
    ...typography.body.medium,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  modeTitleActive: {
    color: colors.primary[700],
  },
  modeDesc: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  cycleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cycleButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cycleButtonActive: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
    ...shadows.md,
  },
  cycleIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleIconWrapperActive: {
    backgroundColor: colors.primary[100],
  },
  cycleText: {
    ...typography.body.medium,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  cycleTextActive: {
    color: colors.primary[700],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    minWidth: '30%',
    ...shadows.sm,
  },
  categoryButtonActive: {
    borderColor: colors.success[300],
    backgroundColor: colors.success[50],
    ...shadows.md,
  },
  categoryIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapperActive: {
    backgroundColor: colors.success[100],
  },
  categoryText: {
    ...typography.label.medium,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.success[700],
  },
  addButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  addButtonAutopay: {
    ...shadows.lg,
  },
  addButtonGradient: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addButtonText: {
    color: colors.text.inverse,
    ...typography.title.medium,
    fontWeight: '700',
    fontSize: 17,
  },
  proBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.warning[100],
    borderRadius: borderRadius.full,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.warning[400],
    ...shadows.sm,
  },
});
