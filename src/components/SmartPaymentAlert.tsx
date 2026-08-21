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
  onDismiss?: () => void;
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
        colors={['#E5484D', '#C9363B']}
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
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {todayPayments.length > 0 && (
          <View style={styles.daySection}>
            <View style={styles.daySectionHeader}>
              <View style={[styles.dayBadge, { backgroundColor: '#FADADA' }]}>
                <View style={[styles.dotIndicator, { backgroundColor: '#C9363B' }]} />
                <Text style={[styles.dayBadgeText, { color: '#C9363B' }]}>Today</Text>
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
              <View style={[styles.dayBadge, { backgroundColor: '#FAE8C9' }]}>
                <View style={[styles.dotIndicator, { backgroundColor: '#BE7215' }]} />
                <Text style={[styles.dayBadgeText, { color: '#BE7215' }]}>Tomorrow</Text>
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
              <View style={[styles.dayBadge, { backgroundColor: '#CCEFDF' }]}>
                <View style={[styles.dotIndicator, { backgroundColor: '#0C8A66' }]} />
                <Text style={[styles.dayBadgeText, { color: '#0C8A66' }]}>In 2 Days</Text>
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
  return (
    <View style={styles.paymentItem}>
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
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
