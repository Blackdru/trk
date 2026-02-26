import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { Subscription, AutopayTransaction } from '../types';
import { getTotalMonthlySpend, getUpcomingRenewals } from '../utils/subscriptionDetector';
import { SubscriptionLogo } from '../components/SubscriptionLogo';
import { BannerAdComponent } from '../components/BannerAdComponent';
import { RenewalAlertBanner } from '../components/RenewalAlertBanner';
import { StatCard } from '../components/StatCard';
import { Card } from '../components/Card';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';
import { getAutopayStats, getCategoryIcon, getCategoryColor } from '../utils/autopayDetector';
import { getSubscriptionTier } from '../services/subscriptionService';

const { width } = Dimensions.get('window');

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
}

export function DashboardScreen({ 
  subscriptions, 
  autopayTransactions,
  onRefresh, 
  refreshing,
  upcomingRenewals,
  showRenewalAlert,
  onDismissRenewalAlert,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'autopay'>('overview');
  const tier = getSubscriptionTier();
  
  // Subscription Analytics
  const totalMonthly = getTotalMonthlySpend(subscriptions);
  const totalYearly = totalMonthly * 12;
  const upcoming = getUpcomingRenewals(subscriptions, 7);
  
  const avgSubscriptionCost = subscriptions.length > 0 
    ? totalMonthly / subscriptions.length 
    : 0;
  
  const subscriptionsByCategory = useMemo(() => {
    const categories: { [key: string]: { count: number; total: number; subs: Subscription[] } } = {};
    subscriptions.forEach(sub => {
      const category = sub.category || 'Other';
      if (!categories[category]) {
        categories[category] = { count: 0, total: 0, subs: [] };
      }
      categories[category].count += 1;
      categories[category].total += sub.monthlyEquivalent;
      categories[category].subs.push(sub);
    });
    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: Math.round(data.total),
        percentage: totalMonthly > 0 ? Math.round((data.total / totalMonthly) * 100) : 0,
        subscriptions: data.subs,
      }))
      .sort((a, b) => b.total - a.total);
  }, [subscriptions, totalMonthly]);

  const subscriptionsByBillingCycle = useMemo(() => {
    const cycles: { [key: string]: { count: number; total: number } } = {};
    subscriptions.forEach(sub => {
      const cycle = sub.billingCycle;
      if (!cycles[cycle]) {
        cycles[cycle] = { count: 0, total: 0 };
      }
      cycles[cycle].count += 1;
      cycles[cycle].total += sub.monthlyEquivalent;
    });
    return Object.entries(cycles).map(([name, data]) => ({
      name,
      count: data.count,
      total: Math.round(data.total),
      percentage: totalMonthly > 0 ? Math.round((data.total / totalMonthly) * 100) : 0,
    }));
  }, [subscriptions, totalMonthly]);

  const topSubscriptions = useMemo(() => {
    return subscriptions
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
      .slice(0, 2);
  }, [subscriptions]);

  // Autopay Analytics
  const autopayStats = getAutopayStats(autopayTransactions);
  const autopayLast30Days = useMemo(() => 
    tier.hasAutopayTracking ? autopayTransactions.filter(t => t.date >= Date.now() - (30 * 24 * 60 * 60 * 1000)) : [],
    [autopayTransactions, tier.hasAutopayTracking]
  );
  const autopayMonthlyTotal = autopayLast30Days.reduce((sum, t) => sum + t.amount, 0);
  const avgAutopayAmount = autopayLast30Days.length > 0 
    ? autopayMonthlyTotal / autopayLast30Days.length 
    : 0;

  const autopayByCategory = useMemo(() => {
    if (!tier.hasAutopayTracking) return [];
    return Object.entries(autopayStats.byCategory)
      .map(([category, count]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count,
        percentage: autopayStats.total > 0 ? Math.round((count / autopayStats.total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [autopayStats, tier.hasAutopayTracking]);

  const recentAutopay = useMemo(() => {
    if (!tier.hasAutopayTracking) return [];
    return [...autopayTransactions]
      .sort((a, b) => b.date - a.date)
      .slice(0, 3);
  }, [autopayTransactions, tier.hasAutopayTracking]);

  // Combined Analytics
  const totalSpending = totalMonthly + (tier.hasAutopayTracking ? (autopayMonthlyTotal / 30) * 30 : 0);
  const subscriptionPercentage = totalSpending > 0 ? Math.round((totalMonthly / totalSpending) * 100) : 100;
  const autopayPercentage = tier.hasAutopayTracking ? (100 - subscriptionPercentage) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Header */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Dashboard</Text>
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

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.tabActive]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.tabTextActive]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'autopay' && styles.tabActive]}
          onPress={() => setActiveTab('autopay')}
        >
          <Text style={[styles.tabText, activeTab === 'autopay' && styles.tabTextActive]}>
            Autopay
          </Text>
        </TouchableOpacity>
      </View>

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
        {/* Renewal Alerts */}
        {showRenewalAlert && (
          <View style={styles.section}>
            <RenewalAlertBanner
              today={upcomingRenewals.today}
              tomorrow={upcomingRenewals.tomorrow}
              twoDays={upcomingRenewals.twoDays}
              onDismiss={onDismissRenewalAlert}
            />
          </View>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Total Spending Card */}
            <View style={styles.section}>
              <Card>
                <View style={styles.totalSpendingHeader}>
                  <Icon name="trending-up" size={24} color={colors.primary[600]} />
                  <Text style={styles.totalSpendingTitle}>Total Monthly Spending</Text>
                </View>
                <Text style={styles.totalSpendingAmount}>₹{Math.round(totalSpending)}</Text>
                <View style={styles.spendingBreakdown}>
                  <View style={styles.breakdownItem}>
                    <View style={[styles.breakdownDot, { backgroundColor: colors.primary[500] }]} />
                    <Text style={styles.breakdownLabel}>Subscriptions</Text>
                    <Text style={styles.breakdownValue}>₹{Math.round(totalMonthly)}</Text>
                    <View style={styles.breakdownBadge}>
                      <Text style={styles.breakdownBadgeText}>{subscriptionPercentage}%</Text>
                    </View>
                  </View>
                  {tier.hasAutopayTracking && (
                    <View style={styles.breakdownItem}>
                      <View style={[styles.breakdownDot, { backgroundColor: colors.success[500] }]} />
                      <Text style={styles.breakdownLabel}>Autopay (30d)</Text>
                      <Text style={styles.breakdownValue}>₹{Math.round(autopayMonthlyTotal)}</Text>
                      <View style={styles.breakdownBadge}>
                        <Text style={styles.breakdownBadgeText}>{autopayPercentage}%</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.section}>
              <View style={styles.quickStatsGrid}>
                <Card style={styles.quickStatCard}>
                  <View style={[styles.quickStatIcon, { backgroundColor: colors.primary[100] }]}>
                    <Icon name="layers" size={20} color={colors.primary[600]} />
                  </View>
                  <Text style={styles.quickStatValue}>{subscriptions.length}</Text>
                  <Text style={styles.quickStatLabel}>Subscriptions</Text>
                </Card>
                {tier.hasAutopayTracking ? (
                  <Card style={styles.quickStatCard}>
                    <View style={[styles.quickStatIcon, { backgroundColor: colors.success[100] }]}>
                      <Icon name="refresh-cw" size={20} color={colors.success[600]} />
                    </View>
                    <Text style={styles.quickStatValue}>{autopayStats.total}</Text>
                    <Text style={styles.quickStatLabel}>Autopay</Text>
                  </Card>
                ) : (
                  <Card style={styles.quickStatCard}>
                    <View style={[styles.quickStatIcon, { backgroundColor: colors.warning[100] }]}>
                      <Icon name="clock" size={20} color={colors.warning[600]} />
                    </View>
                    <Text style={styles.quickStatValue}>{upcoming.length}</Text>
                    <Text style={styles.quickStatLabel}>Due Soon</Text>
                  </Card>
                )}
              </View>
              <View style={styles.quickStatsGrid}>
                <Card style={styles.quickStatCard}>
                  <View style={[styles.quickStatIcon, { backgroundColor: colors.warning[100] }]}>
                    <Icon name="clock" size={20} color={colors.warning[600]} />
                  </View>
                  <Text style={styles.quickStatValue}>{upcoming.length}</Text>
                  <Text style={styles.quickStatLabel}>Due Soon</Text>
                </Card>
                {tier.hasAutopayTracking ? (
                  <Card style={styles.quickStatCard}>
                    <View style={[styles.quickStatIcon, { backgroundColor: colors.accent[100] }]}>
                      <Icon name="activity" size={20} color={colors.accent[600]} />
                    </View>
                    <Text style={styles.quickStatValue}>{autopayLast30Days.length}</Text>
                    <Text style={styles.quickStatLabel}>Last 30d</Text>
                  </Card>
                ) : (
                  <Card style={styles.quickStatCard}>
                    <View style={[styles.quickStatIcon, { backgroundColor: colors.success[100] }]}>
                      <Icon name="dollar-sign" size={20} color={colors.success[600]} />
                    </View>
                    <Text style={styles.quickStatValue}>₹{Math.round(totalMonthly)}</Text>
                    <Text style={styles.quickStatLabel}>Monthly</Text>
                  </Card>
                )}
              </View>
            </View>

            {/* Top Subscriptions Preview */}
            {topSubscriptions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="star" size={18} color={colors.primary[600]} />
                  <Text style={styles.sectionTitle}>Top Subscriptions</Text>
                </View>
                <Card padding="sm">
                  {topSubscriptions.map((sub, index) => (
                    <View key={sub.id} style={[styles.listItem, index === topSubscriptions.length - 1 && styles.listItemLast]}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <SubscriptionLogo merchantName={sub.merchantName} size={40} />
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemName} numberOfLines={1}>{sub.merchantName}</Text>
                        <Text style={styles.listItemMeta}>{sub.billingCycle}</Text>
                      </View>
                      <Text style={styles.listItemAmount}>₹{Math.round(sub.monthlyEquivalent)}/mo</Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* Recent Autopay Preview */}
            {tier.hasAutopayTracking && recentAutopay.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="refresh-cw" size={18} color={colors.success[600]} />
                  <Text style={styles.sectionTitle}>Recent Autopay</Text>
                </View>
                <Card padding="sm">
                  {recentAutopay.map((txn, index) => (
                    <View key={txn.id} style={[styles.listItem, index === recentAutopay.length - 1 && styles.listItemLast]}>
                      <SubscriptionLogo merchantName={txn.merchantName} size={40} />
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemName} numberOfLines={1}>{txn.merchantName}</Text>
                        <Text style={styles.listItemMeta}>{dayjs(txn.date).format('MMM D, YYYY')}</Text>
                      </View>
                      <Text style={styles.listItemAmount}>₹{txn.amount}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <>
            {/* Subscription Stats */}
            <View style={styles.section}>
              <View style={styles.statsGrid}>
                <View style={styles.statCardWrapper}>
                  <StatCard
                    icon="trending-up"
                    label="Monthly Spend"
                    value={`₹${totalMonthly.toFixed(0)}`}
                    subtitle={`₹${totalYearly.toFixed(0)}/year`}
                    gradient={gradients.primary}
                  />
                </View>
                <View style={styles.statCardWrapper}>
                  <StatCard
                    icon="dollar-sign"
                    label="Average Cost"
                    value={`₹${avgSubscriptionCost.toFixed(0)}`}
                    subtitle={`per subscription`}
                    gradient={gradients.success}
                  />
                </View>
              </View>
            </View>

            {/* By Category */}
            {subscriptionsByCategory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="grid" size={18} color={colors.primary[600]} />
                  <Text style={styles.sectionTitle}>By Category</Text>
                </View>
                <Card>
                  {subscriptionsByCategory.map((item, index) => (
                    <View key={item.name} style={[styles.analyticsRow, index === subscriptionsByCategory.length - 1 && styles.analyticsRowLast]}>
                      <View style={styles.analyticsLeft}>
                        <View style={[styles.analyticsDot, { backgroundColor: colors.chart.blue }]} />
                        <Text style={styles.analyticsLabel}>{item.name}</Text>
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{item.count}</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsRight}>
                        <Text style={styles.analyticsValue}>₹{item.total}</Text>
                        <View style={styles.percentageBadge}>
                          <Text style={styles.percentageBadgeText}>{item.percentage}%</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* By Billing Cycle */}
            {subscriptionsByBillingCycle.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="calendar" size={18} color={colors.primary[600]} />
                  <Text style={styles.sectionTitle}>By Billing Cycle</Text>
                </View>
                <Card>
                  {subscriptionsByBillingCycle.map((item, index) => (
                    <View key={item.name} style={[styles.analyticsRow, index === subscriptionsByBillingCycle.length - 1 && styles.analyticsRowLast]}>
                      <View style={styles.analyticsLeft}>
                        <View style={[styles.analyticsDot, { backgroundColor: colors.chart.purple }]} />
                        <Text style={styles.analyticsLabel}>{item.name}</Text>
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{item.count}</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsRight}>
                        <Text style={styles.analyticsValue}>₹{item.total}</Text>
                        <View style={styles.percentageBadge}>
                          <Text style={styles.percentageBadgeText}>{item.percentage}%</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* Upcoming Renewals */}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="clock" size={18} color={colors.warning[600]} />
                  <Text style={styles.sectionTitle}>Upcoming Renewals</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Next 7 days</Text>
                  </View>
                </View>
                <Card padding="sm">
                  {upcoming.map((sub, index) => (
                    <View key={sub.id} style={[styles.listItem, index === upcoming.length - 1 && styles.listItemLast]}>
                      <SubscriptionLogo merchantName={sub.merchantName} size={40} />
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemName}>{sub.merchantName}</Text>
                        <Text style={styles.listItemMeta}>
                          {dayjs(sub.nextRenewalDate).format('MMM D, YYYY')}
                        </Text>
                      </View>
                      <Text style={styles.listItemAmount}>₹{sub.amount}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
        )}

        {/* Autopay Tab */}
        {activeTab === 'autopay' && (
          <>
            {/* Autopay Stats */}
            <View style={styles.section}>
              <View style={styles.statsGrid}>
                <View style={styles.statCardWrapper}>
                  <StatCard
                    icon="zap"
                    label="Last 30 Days"
                    value={`₹${autopayMonthlyTotal.toFixed(0)}`}
                    subtitle={`${autopayLast30Days.length} transactions`}
                    gradient={gradients.success}
                  />
                </View>
                <View style={styles.statCardWrapper}>
                  <StatCard
                    icon="activity"
                    label="Average Amount"
                    value={`₹${avgAutopayAmount.toFixed(0)}`}
                    subtitle={`per transaction`}
                    gradient={gradients.cyan}
                  />
                </View>
              </View>
            </View>

            {/* Autopay Overview */}
            <View style={styles.section}>
              <Card>
                <View style={styles.autopayOverview}>
                  <View style={styles.autopayOverviewItem}>
                    <Text style={styles.autopayOverviewLabel}>Total Transactions</Text>
                    <Text style={styles.autopayOverviewValue}>{autopayStats.total}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.autopayOverviewItem}>
                    <Text style={styles.autopayOverviewLabel}>Active</Text>
                    <Text style={styles.autopayOverviewValue}>{autopayStats.active}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.autopayOverviewItem}>
                    <Text style={styles.autopayOverviewLabel}>Last Month</Text>
                    <Text style={styles.autopayOverviewValue}>{autopayStats.lastMonth}</Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* By Category */}
            {autopayByCategory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="pie-chart" size={18} color={colors.success[600]} />
                  <Text style={styles.sectionTitle}>By Category</Text>
                </View>
                <Card>
                  {autopayByCategory.map((item, index) => (
                    <View key={item.category} style={[styles.analyticsRow, index === autopayByCategory.length - 1 && styles.analyticsRowLast]}>
                      <View style={styles.analyticsLeft}>
                        <View style={[styles.categoryIconWrapper, { backgroundColor: getCategoryColor(item.category.toLowerCase()) + '20' }]}>
                          <Icon name={getCategoryIcon(item.category.toLowerCase())} size={16} color={getCategoryColor(item.category.toLowerCase())} />
                        </View>
                        <Text style={styles.analyticsLabel}>{item.category}</Text>
                      </View>
                      <View style={styles.analyticsRight}>
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{item.count}</Text>
                        </View>
                        <View style={styles.percentageBadge}>
                          <Text style={styles.percentageBadgeText}>{item.percentage}%</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* Recent Transactions */}
            {recentAutopay.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="list" size={18} color={colors.success[600]} />
                  <Text style={styles.sectionTitle}>Recent Transactions</Text>
                </View>
                <Card padding="sm">
                  {recentAutopay.map((txn, index) => (
                    <View key={txn.id} style={[styles.autopayItem, index === recentAutopay.length - 1 && styles.listItemLast]}>
                      <SubscriptionLogo merchantName={txn.merchantName} size={40} />
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemName}>{txn.merchantName}</Text>
                        <View style={styles.autopayMeta}>
                          <Text style={styles.listItemMeta}>{dayjs(txn.date).format('MMM D')}</Text>
                          {txn.category && (
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{txn.category}</Text>
                            </View>
                          )}
                          <View style={[styles.statusBadge, txn.status === 'active' && styles.statusBadgeActive]}>
                            <Text style={[styles.statusBadgeText, txn.status === 'active' && styles.statusBadgeTextActive]}>
                              {txn.paymentType}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.listItemAmount}>₹{txn.amount}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreeting: {
    ...typography.headline.medium,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.primary[600],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.label.small,
    color: colors.primary[700],
  },
  totalSpendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  totalSpendingTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
  },
  totalSpendingAmount: {
    ...typography.display.small,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  spendingBreakdown: {
    gap: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  breakdownLabel: {
    ...typography.body.medium,
    color: colors.text.secondary,
    flex: 1,
  },
  breakdownValue: {
    ...typography.body.large,
    color: colors.text.primary,
    fontWeight: '600',
  },
  breakdownBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  breakdownBadgeText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickStatValue: {
    ...typography.headline.small,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  quickStatLabel: {
    ...typography.label.small,
    color: colors.text.secondary,
  },
  statsGrid: {
    gap: spacing.md,
  },
  statCardWrapper: {
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    ...typography.body.large,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  listItemMeta: {
    ...typography.body.small,
    color: colors.text.tertiary,
  },
  listItemAmount: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    ...typography.label.medium,
    color: colors.primary[700],
    fontWeight: '700',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  analyticsRowLast: {
    borderBottomWidth: 0,
  },
  analyticsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  analyticsDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  analyticsLabel: {
    ...typography.body.medium,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  analyticsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  analyticsValue: {
    ...typography.body.large,
    color: colors.text.primary,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  percentageBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  percentageBadgeText: {
    ...typography.label.small,
    color: colors.primary[700],
    fontWeight: '700',
  },
  categoryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autopayOverview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autopayOverviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  autopayOverviewLabel: {
    ...typography.label.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  autopayOverviewValue: {
    ...typography.headline.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  autopayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  autopayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  categoryBadgeText: {
    ...typography.label.small,
    color: colors.primary[700],
    fontSize: 10,
  },
  statusBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  statusBadgeActive: {
    backgroundColor: colors.success[100],
  },
  statusBadgeText: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  statusBadgeTextActive: {
    color: colors.success[700],
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
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.body.large,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  proContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  proIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  proTitle: {
    ...typography.headline.small,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  proText: {
    ...typography.body.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  proFeatures: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  proFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proFeatureText: {
    ...typography.body.medium,
    color: colors.text.primary,
  },
});
