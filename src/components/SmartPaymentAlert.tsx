import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import type { Subscription, AutopayTransaction } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface Payment {
  id: string;
  merchantName: string;
  amount: number;
  dueDate: number;
  type: 'subscription' | 'autopay';
  category?: string;
}

interface Props {
  subscriptions: Subscription[];
  autopayTransactions: AutopayTransaction[];
  onDismiss: () => void;
  onViewDetails: () => void;
}

export function SmartPaymentAlert({ subscriptions, autopayTransactions, onDismiss, onViewDetails }: Props) {
  // Collect all upcoming payments
  const now = Date.now();
  const threeDaysLater = dayjs().add(3, 'day').valueOf();
  
  const payments: Payment[] = [];

  // Add subscriptions
  subscriptions.forEach(sub => {
    if (sub.nextRenewalDate >= now && sub.nextRenewalDate <= threeDaysLater) {
      payments.push({
        id: sub.id,
        merchantName: sub.merchantName,
        amount: sub.amount,
        dueDate: sub.nextRenewalDate,
        type: 'subscription',
      });
    }
  });

  // Add autopay
  autopayTransactions.forEach(autopay => {
    if (autopay.nextPaymentDate && autopay.nextPaymentDate >= now && autopay.nextPaymentDate <= threeDaysLater) {
      payments.push({
        id: autopay.id,
        merchantName: autopay.merchantName,
        amount: autopay.amount,
        dueDate: autopay.nextPaymentDate,
        type: 'autopay',
        category: autopay.category,
      });
    }
  });

  // Sort by due date
  payments.sort((a, b) => a.dueDate - b.dueDate);

  // Group by day
  const today = dayjs().startOf('day');
  const tomorrow = today.add(1, 'day');
  const twoDays = today.add(2, 'day');

  const todayPayments = payments.filter(p => dayjs(p.dueDate).isSame(today, 'day'));
  const tomorrowPayments = payments.filter(p => dayjs(p.dueDate).isSame(tomorrow, 'day'));
  const twoDaysPayments = payments.filter(p => dayjs(p.dueDate).isSame(twoDays, 'day'));

  if (payments.length === 0) return null;

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Icon name="alert-circle" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Upcoming Payments</Text>
              <Text style={styles.headerSubtitle}>
                {payments.length} payment{payments.length > 1 ? 's' : ''} • ₹{totalAmount}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Icon name="x" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {todayPayments.length > 0 && (
          <View style={styles.daySection}>
            <View style={styles.daySectionHeader}>
              <View style={[styles.dayBadge, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="alert-circle" size={14} color="#DC2626" />
                <Text style={[styles.dayBadgeText, { color: '#DC2626' }]}>Today</Text>
              </View>
              <Text style={styles.dayAmount}>₹{todayPayments.reduce((s, p) => s + p.amount, 0)}</Text>
            </View>
            {todayPayments.map(payment => (
              <PaymentItem key={payment.id} payment={payment} />
            ))}
          </View>
        )}

        {tomorrowPayments.length > 0 && (
          <View style={styles.daySection}>
            <View style={styles.daySectionHeader}>
              <View style={[styles.dayBadge, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="clock" size={14} color="#D97706" />
                <Text style={[styles.dayBadgeText, { color: '#D97706' }]}>Tomorrow</Text>
              </View>
              <Text style={styles.dayAmount}>₹{tomorrowPayments.reduce((s, p) => s + p.amount, 0)}</Text>
            </View>
            {tomorrowPayments.map(payment => (
              <PaymentItem key={payment.id} payment={payment} />
            ))}
          </View>
        )}

        {twoDaysPayments.length > 0 && (
          <View style={styles.daySection}>
            <View style={styles.daySectionHeader}>
              <View style={[styles.dayBadge, { backgroundColor: '#CCFBF1' }]}>
                <Icon name="calendar" size={14} color="#0D9488" />
                <Text style={[styles.dayBadgeText, { color: '#0D9488' }]}>In 2 Days</Text>
              </View>
              <Text style={styles.dayAmount}>₹{twoDaysPayments.reduce((s, p) => s + p.amount, 0)}</Text>
            </View>
            {twoDaysPayments.map(payment => (
              <PaymentItem key={payment.id} payment={payment} />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={onViewDetails} activeOpacity={0.7}>
          <Text style={styles.actionButtonText}>View All Payments</Text>
          <Icon name="arrow-right" size={16} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PaymentItem({ payment }: { payment: Payment }) {
  const getTypeIcon = () => {
    if (payment.type === 'subscription') return 'repeat';
    switch (payment.category) {
      case 'utility': return 'zap';
      case 'insurance': return 'shield';
      case 'loan': return 'credit-card';
      case 'telecom': return 'smartphone';
      case 'investment': return 'trending-up';
      default: return 'dollar-sign';
    }
  };

  const getTypeColor = () => {
    if (payment.type === 'subscription') return colors.primary[500];
    switch (payment.category) {
      case 'utility': return '#F59E0B';
      case 'insurance': return '#8B5CF6';
      case 'loan': return '#EF4444';
      case 'telecom': return '#3B82F6';
      case 'investment': return '#10B981';
      default: return colors.gray[500];
    }
  };

  return (
    <View style={styles.paymentItem}>
      <View style={[styles.paymentIcon, { backgroundColor: getTypeColor() + '20' }]}>
        <Icon name={getTypeIcon()} size={16} color={getTypeColor()} />
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentName} numberOfLines={1}>{payment.merchantName}</Text>
        <Text style={styles.paymentType}>
          {payment.type === 'subscription' ? 'Subscription' : payment.category || 'Autopay'}
        </Text>
      </View>
      <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    padding: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.title.medium,
    color: '#FFF',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.body.small,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  daySection: {
    gap: spacing.xs,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  dayBadgeText: {
    ...typography.label.small,
    fontWeight: '600',
    fontSize: 11,
  },
  dayAmount: {
    ...typography.title.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    ...typography.body.medium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentType: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  paymentAmount: {
    ...typography.title.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginTop: spacing.xs,
  },
  actionButtonText: {
    ...typography.body.medium,
    color: colors.primary[600],
    fontWeight: '600',
  },
});
