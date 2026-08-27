import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { Subscription, AutopayTransaction, PassbookTransaction } from '../types';
import { getTotalMonthlySpend, getUpcomingRenewals } from '../utils/subscriptionDetector';
import { SubscriptionLogo } from '../components/SubscriptionLogo';
import { BannerAdComponent } from '../components/BannerAdComponent';
import { SmartPaymentAlert } from '../components/SmartPaymentAlert';
import { Card } from '../components/Card';
import { AllUpcomingPaymentsScreen } from './AllUpcomingPaymentsScreen';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';
import { getAutopayStats, filterNonSubscriptionAutopay } from '../utils/autopayDetector';
import { getSubscriptionTier } from '../services/subscriptionService';
import { useAppContext } from '../context/AppContext';

interface Props {
  subscriptions: Subscription[];
  autopayTransactions: AutopayTransaction[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  upcomingRenewals: {
    today: Subscription[];
    tomorrow: Subscription[];
    twoDays: Subscription[];
  };
  showRenewalAlert: boolean;
  onDismissRenewalAlert: () => void;
  onMarkSubscriptionPaid: (id: string) => void;
  onMarkAutopayPaid: (id: string) => void;
}

export function DashboardScreen({
  subscriptions,
  autopayTransactions,
  onRefresh,
  refreshing,
  upcomingRenewals,
  showRenewalAlert,
  onDismissRenewalAlert,
  onMarkSubscriptionPaid,
  onMarkAutopayPaid,
}: Props) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const tier = getSubscriptionTier();
  const { passbookTransactions } = useAppContext();

  // Subscription Analytics
  const totalMonthly = getTotalMonthlySpend(subscriptions);
  const upcoming = getUpcomingRenewals(subscriptions, 7);

  const topSubscriptions = useMemo(() => {
    return [...subscriptions]
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
      .slice(0, 3);
  }, [subscriptions]);

  // Autopay Analytics - Filter out subscription-category transactions
  const filteredAutopayTransactions = useMemo(
    () => filterNonSubscriptionAutopay(autopayTransactions),
    [autopayTransactions]
  );
  const autopayStats = getAutopayStats(filteredAutopayTransactions);
  const autopayLast30Days = useMemo(
    () =>
      tier.hasAutopayTracking
        ? filteredAutopayTransactions.filter(
            t => t.date >= Date.now() - 30 * 24 * 60 * 60 * 1000
          )
        : [],
    [filteredAutopayTransactions, tier.hasAutopayTracking]
  );
  const autopayMonthlyTotal = autopayLast30Days.reduce((sum, t) => sum + t.amount, 0);

  const recentAutopay = useMemo(() => {
    if (!tier.hasAutopayTracking) return [];
    return [...filteredAutopayTransactions].sort((a, b) => b.date - a.date).slice(0, 3);
  }, [filteredAutopayTransactions, tier.hasAutopayTracking]);

  // Combined Analytics
  const totalSpending = totalMonthly + (tier.hasAutopayTracking ? autopayMonthlyTotal : 0);
  const subscriptionPercentage =
    totalSpending > 0 ? Math.round((totalMonthly / totalSpending) * 100) : 100;
  const autopayPercentage = tier.hasAutopayTracking ? 100 - subscriptionPercentage : 0;

  // 30-Day Passbook Cashflow Preview
  const passbookTotals = useMemo(() => {
    let creditTotal = 0;
    let debitTotal = 0;
    let currencySymbol = '₹';

    for (const t of passbookTransactions) {
      if (t.currency) currencySymbol = t.currency;
      if (t.type === 'credit') {
        creditTotal += t.amount;
      } else {
        debitTotal += t.amount;
      }
    }

    return { creditTotal, debitTotal, currencySymbol, count: passbookTransactions.length };
  }, [passbookTransactions]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Standardized Constant Header */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Financial Overview</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Icon name="refresh-cw" size={20} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Smart Payment Alerts */}
        <View style={styles.section}>
          <SmartPaymentAlert
            subscriptions={subscriptions}
            autopayTransactions={autopayTransactions}
            onDismiss={onDismissRenewalAlert}
            onViewDetails={() => setShowAllUpcoming(true)}
          />
        </View>

        {/* Total Spending Overview Card */}
        <View style={styles.section}>
          <Card>
            <View style={styles.totalSpendingHeader}>
              <Text style={styles.totalSpendingTitle}>Total Monthly Run-Rate</Text>
            </View>
            <Text style={styles.totalSpendingAmount}>₹{Math.round(totalSpending).toLocaleString()}</Text>
            <View style={styles.spendingBreakdown}>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: colors.primary[500] }]} />
                <Text style={styles.breakdownLabel}>Subscriptions</Text>
                <Text style={styles.breakdownValue}>₹{Math.round(totalMonthly).toLocaleString()}</Text>
                <View style={styles.breakdownBadge}>
                  <Text style={styles.breakdownBadgeText}>{subscriptionPercentage}%</Text>
                </View>
              </View>
              {tier.hasAutopayTracking && (
                <View style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, { backgroundColor: colors.success[500] }]} />
                  <Text style={styles.breakdownLabel}>Autopay (30d)</Text>
                  <Text style={styles.breakdownValue}>₹{Math.round(autopayMonthlyTotal).toLocaleString()}</Text>
                  <View style={styles.breakdownBadge}>
                    <Text style={styles.breakdownBadgeText}>{autopayPercentage}%</Text>
                  </View>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Quick Stats Grid (2x2) */}
        <View style={styles.section}>
          <View style={styles.quickStatsGrid}>
            <Card style={styles.quickStatCard}>
              <Text style={[styles.quickStatValue, { color: colors.primary[600] }]}>
                {subscriptions.length}
              </Text>
              <Text style={styles.quickStatLabel}>Active Subs</Text>
            </Card>

            <Card style={styles.quickStatCard}>
              <Text style={[styles.quickStatValue, { color: colors.success[600] }]}>
                {tier.hasAutopayTracking ? autopayStats.total : upcoming.length}
              </Text>
              <Text style={styles.quickStatLabel}>
                {tier.hasAutopayTracking ? 'Autopay Mandates' : 'Due Soon'}
              </Text>
            </Card>
          </View>

          <View style={styles.quickStatsGrid}>
            <Card style={styles.quickStatCard}>
              <Text style={[styles.quickStatValue, { color: colors.warning[600] }]}>
                {upcoming.length}
              </Text>
              <Text style={styles.quickStatLabel}>Due in 7 Days</Text>
            </Card>

            <Card style={styles.quickStatCard}>
              <Text style={[styles.quickStatValue, { color: colors.accent[600] }]}>
                ₹{Math.round(totalMonthly).toLocaleString()}
              </Text>
              <Text style={styles.quickStatLabel}>Monthly Budget</Text>
            </Card>
          </View>
        </View>

        {/* 30-Day Passbook Cashflow Preview */}
        {passbookTotals.count > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>30-Day Cashflow Activity</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{passbookTotals.count} Transactions</Text>
              </View>
            </View>
            <Card>
              <View style={styles.cashflowPreviewRow}>
                <View style={styles.cashflowPreviewCol}>
                  <Text style={styles.cashflowPreviewLabel}>Total Inflow</Text>
                  <Text style={[styles.cashflowPreviewAmount, { color: '#10B981' }]}>
                    +{passbookTotals.currencySymbol}{Math.round(passbookTotals.creditTotal).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.cashflowDivider} />
                <View style={styles.cashflowPreviewCol}>
                  <Text style={styles.cashflowPreviewLabel}>Total Outflow</Text>
                  <Text style={[styles.cashflowPreviewAmount, { color: '#EF4444' }]}>
                    -{passbookTotals.currencySymbol}{Math.round(passbookTotals.debitTotal).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Top Subscriptions Preview */}
        {topSubscriptions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Subscriptions</Text>
            </View>
            <Card padding="none">
              {topSubscriptions.map((sub, index) => (
                <View
                  key={sub.id}
                  style={[
                    styles.listItem,
                    index === topSubscriptions.length - 1 && styles.listItemLast,
                  ]}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <SubscriptionLogo merchantName={sub.merchantName} size={40} />
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName} numberOfLines={1}>
                      {sub.merchantName}
                    </Text>
                    <Text style={styles.listItemMeta}>{sub.billingCycle}</Text>
                  </View>
                  <Text style={styles.listItemAmount}>
                    ₹{Math.round(sub.monthlyEquivalent).toLocaleString()}/mo
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Recent Autopay Preview */}
        {tier.hasAutopayTracking && recentAutopay.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Autopay</Text>
            </View>
            <Card padding="none">
              {recentAutopay.map((txn, index) => (
                <View
                  key={txn.id}
                  style={[
                    styles.listItem,
                    index === recentAutopay.length - 1 && styles.listItemLast,
                  ]}
                >
                  <SubscriptionLogo merchantName={txn.merchantName} size={40} />
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName} numberOfLines={1}>
                      {txn.merchantName}
                    </Text>
                    <Text style={styles.listItemMeta}>{dayjs(txn.date).format('MMM D, YYYY')}</Text>
                  </View>
                  <Text style={styles.listItemAmount}>₹{txn.amount.toLocaleString()}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Ad Space */}
        <View style={styles.section}>
          <BannerAdComponent />
        </View>

        {/* Empty State */}
        {subscriptions.length === 0 && autopayTransactions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="inbox" size={64} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyDescription}>
              Add subscriptions or sync your SMS to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* All Upcoming Payments Modal */}
      <Modal
        visible={showAllUpcoming}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllUpcoming(false)}
      >
        <AllUpcomingPaymentsScreen
          subscriptions={subscriptions}
          autopayTransactions={autopayTransactions}
          onClose={() => setShowAllUpcoming(false)}
          onMarkSubscriptionPaid={onMarkSubscriptionPaid}
          onMarkAutopayPaid={onMarkAutopayPaid}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headline.small,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.body.small,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.label.small,
    color: colors.primary[700],
    fontWeight: '600',
  },
  totalSpendingHeader: {
    marginBottom: spacing.xs,
  },
  totalSpendingTitle: {
    ...typography.label.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalSpendingAmount: {
    ...typography.headline.large,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  spendingBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  breakdownLabel: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  breakdownValue: {
    ...typography.body.small,
    fontWeight: '700',
    color: colors.text.primary,
  },
  breakdownBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  breakdownBadgeText: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickStatCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  quickStatValue: {
    ...typography.title.large,
    fontWeight: '800',
    marginBottom: 2,
  },
  quickStatLabel: {
    ...typography.label.small,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  cashflowPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cashflowPreviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  cashflowPreviewLabel: {
    ...typography.body.small,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  cashflowPreviewAmount: {
    ...typography.title.medium,
    fontWeight: '700',
  },
  cashflowDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border.light,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    ...typography.label.small,
    fontWeight: '700',
    color: colors.text.secondary,
    fontSize: 11,
  },
  listItemContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  listItemName: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.primary,
  },
  listItemMeta: {
    ...typography.body.small,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
    fontSize: 12,
  },
  listItemAmount: {
    ...typography.body.medium,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.body.small,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
