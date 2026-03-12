import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { Subscription, AutopayTransaction } from '../types';
import { SubscriptionLogo } from '../components/SubscriptionLogo';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface UpcomingItem {
  id: string;
  merchantName: string;
  amount: number;
  dueDate: number;
  type: 'subscription' | 'autopay';
  category?: string;
  billingCycle?: string;
}

interface Props {
  subscriptions: Subscription[];
  autopayTransactions: AutopayTransaction[];
  onClose: () => void;
  onMarkSubscriptionPaid: (id: string) => void;
  onMarkAutopayPaid: (id: string) => void;
}

const DAYS_AHEAD = 30;

export function AllUpcomingPaymentsScreen({
  subscriptions,
  autopayTransactions,
  onClose,
  onMarkSubscriptionPaid,
  onMarkAutopayPaid,
}: Props) {
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  const allUpcoming = useMemo(() => {
    const now = Date.now();
    const cutoff = dayjs().add(DAYS_AHEAD, 'day').valueOf();
    const items: UpcomingItem[] = [];

    subscriptions.forEach(sub => {
      if (sub.nextRenewalDate >= now && sub.nextRenewalDate <= cutoff) {
        items.push({
          id: sub.id,
          merchantName: sub.merchantName,
          amount: sub.amount,
          dueDate: sub.nextRenewalDate,
          type: 'subscription',
          billingCycle: sub.billingCycle,
        });
      }
    });

    autopayTransactions.forEach(ap => {
      if (ap.nextPaymentDate && ap.nextPaymentDate >= now && ap.nextPaymentDate <= cutoff) {
        items.push({
          id: ap.id,
          merchantName: ap.merchantName,
          amount: ap.amount,
          dueDate: ap.nextPaymentDate,
          type: 'autopay',
          category: ap.category,
        });
      }
    });

    return items
      .filter(item => !paidIds.has(item.id))
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [subscriptions, autopayTransactions, paidIds]);

  const grouped = useMemo(() => {
    const today = dayjs().startOf('day');
    const groups: { label: string; labelColor: string; bgColor: string; iconName: string; items: UpcomingItem[] }[] = [];

    const todayItems = allUpcoming.filter(p => dayjs(p.dueDate).startOf('day').isSame(today, 'day'));
    const tomorrowItems = allUpcoming.filter(p => dayjs(p.dueDate).startOf('day').isSame(today.add(1, 'day'), 'day'));
    const thisWeekItems = allUpcoming.filter(p => {
      const d = dayjs(p.dueDate).startOf('day');
      return d.isAfter(today.add(1, 'day')) && d.isBefore(today.add(8, 'day'));
    });
    const laterItems = allUpcoming.filter(p => {
      const d = dayjs(p.dueDate).startOf('day');
      return d.isAfter(today.add(7, 'day'));
    });

    if (todayItems.length > 0) {
      groups.push({ label: 'Today', labelColor: '#DC2626', bgColor: '#FEE2E2', iconName: 'alert-circle', items: todayItems });
    }
    if (tomorrowItems.length > 0) {
      groups.push({ label: 'Tomorrow', labelColor: '#D97706', bgColor: '#FEF3C7', iconName: 'clock', items: tomorrowItems });
    }
    if (thisWeekItems.length > 0) {
      groups.push({ label: 'This Week', labelColor: '#0D9488', bgColor: '#CCFBF1', iconName: 'calendar', items: thisWeekItems });
    }
    if (laterItems.length > 0) {
      groups.push({ label: 'Later This Month', labelColor: colors.primary[700], bgColor: colors.primary[100], iconName: 'calendar', items: laterItems });
    }

    return groups;
  }, [allUpcoming]);

  const totalAmount = allUpcoming.reduce((sum, p) => sum + p.amount, 0);

  const handleMarkPaid = (item: UpcomingItem) => {
    Alert.alert(
      'Mark as Paid',
      `Mark ${item.merchantName} (₹${item.amount}) as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: () => {
            setPaidIds(prev => new Set([...prev, item.id]));
            if (item.type === 'subscription') {
              onMarkSubscriptionPaid(item.id);
            } else {
              onMarkAutopayPaid(item.id);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (item: UpcomingItem) => {
    if (item.type === 'subscription') return 'repeat';
    switch (item.category) {
      case 'utility': return 'zap';
      case 'insurance': return 'shield';
      case 'loan': return 'credit-card';
      case 'telecom': return 'smartphone';
      case 'investment': return 'trending-up';
      default: return 'dollar-sign';
    }
  };

  const getTypeColor = (item: UpcomingItem) => {
    if (item.type === 'subscription') return colors.primary[500];
    switch (item.category) {
      case 'utility': return '#F59E0B';
      case 'insurance': return '#8B5CF6';
      case 'loan': return '#EF4444';
      case 'telecom': return '#3B82F6';
      case 'investment': return '#10B981';
      default: return colors.gray[500];
    }
  };

  const getDateLabel = (dueDate: number) => {
    const d = dayjs(dueDate);
    const today = dayjs().startOf('day');
    if (d.startOf('day').isSame(today, 'day')) return 'Today';
    if (d.startOf('day').isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
    return d.format('MMM D');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-left" size={22} color={colors.text.inverse} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Upcoming Payments</Text>
            <Text style={styles.headerSubtitle}>
              {allUpcoming.length} payment{allUpcoming.length !== 1 ? 's' : ''} · ₹{Math.round(totalAmount)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {allUpcoming.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="check-circle" size={64} color={colors.success[400]} />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyDescription}>
              No upcoming payments in the next {DAYS_AHEAD} days.
            </Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.label} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupBadge, { backgroundColor: group.bgColor }]}>
                  <Icon name={group.iconName} size={14} color={group.labelColor} />
                  <Text style={[styles.groupLabel, { color: group.labelColor }]}>{group.label}</Text>
                </View>
                <Text style={styles.groupTotal}>
                  ₹{group.items.reduce((s, p) => s + p.amount, 0)}
                </Text>
              </View>

              <View style={styles.groupCard}>
                {group.items.map((item, index) => {
                  const typeColor = getTypeColor(item);
                  return (
                    <View
                      key={item.id}
                      style={[styles.paymentItem, index === group.items.length - 1 && styles.paymentItemLast]}
                    >
                      <SubscriptionLogo merchantName={item.merchantName} size={44} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.merchantName}</Text>
                        <View style={styles.itemMeta}>
                          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                            <Icon name={getTypeIcon(item)} size={11} color={typeColor} />
                            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                              {item.type === 'subscription' ? (item.billingCycle ?? 'Subscription') : (item.category ?? 'Autopay')}
                            </Text>
                          </View>
                          <Text style={styles.dueDateLabel}>{getDateLabel(item.dueDate)}</Text>
                        </View>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemAmount}>₹{item.amount}</Text>
                        <TouchableOpacity
                          style={styles.markPaidBtn}
                          onPress={() => handleMarkPaid(item)}
                          activeOpacity={0.7}
                        >
                          <Icon name="check" size={13} color={colors.success[700]} />
                          <Text style={styles.markPaidText}>Paid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headline.medium,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.body.medium,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  group: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  groupLabel: {
    ...typography.label.small,
    fontWeight: '700',
    fontSize: 12,
  },
  groupTotal: {
    ...typography.title.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  paymentItemLast: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.body.large,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dueDateLabel: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  itemAmount: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.success[100],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success[300],
  },
  markPaidText: {
    ...typography.label.small,
    color: colors.success[700],
    fontWeight: '600',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.headline.small,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body.large,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
