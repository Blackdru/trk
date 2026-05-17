import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import type { AutopayTransaction } from '../types';
import {
  groupAutopayByMerchant,
  getAutopayStats,
  getCategoryIcon,
  getCategoryColor,
  filterNonSubscriptionAutopay,
} from '../utils/autopayDetector';
import { SubscriptionLogo } from '../components/SubscriptionLogo';
import { BannerAdComponent } from '../components/BannerAdComponent';
import { Card } from '../components/Card';
import { CancellationModal } from '../components/CancellationModal';
import { getSubscriptionTier } from '../services/subscriptionService';
import { useCancellationTracking } from '../hooks/useCancellationTracking';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  transactions: AutopayTransaction[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  onUpgradePress: () => void;
  onDelete: (id: string) => void;
}

type FilterOption = 'all' | 'active' | 'inactive';
type SortOption = 'date' | 'amount' | 'merchant';

export function AutopayScreen({ transactions, onRefresh, refreshing, onUpgradePress, onDelete }: Props) {
  const tier = getSubscriptionTier();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AutopayTransaction | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  
  const { markAsCancelled, isCancelled } = useCancellationTracking();
  
  const filteredTransactions = useMemo(() => filterNonSubscriptionAutopay(transactions), [transactions]);
  
  const stats = useMemo(() => getAutopayStats(filteredTransactions), [filteredTransactions]);
  const grouped = useMemo(() => groupAutopayByMerchant(filteredTransactions), [filteredTransactions]);

  // Filter and sort transactions
  const processedTransactions = useMemo(() => {
    let processed = [...filteredTransactions];

    // Apply search
    if (searchQuery) {
      processed = processed.filter(txn =>
        txn.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      processed = processed.filter(txn => txn.status === filterBy);
    }

    // Apply category filter
    if (selectedCategory) {
      processed = processed.filter(txn => txn.category === selectedCategory);
    }

    // Apply sorting
    processed.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.date - a.date;
        case 'amount':
          return b.amount - a.amount;
        case 'merchant':
          return a.merchantName.localeCompare(b.merchantName);
        default:
          return 0;
      }
    });

    return processed;
  }, [filteredTransactions, searchQuery, filterBy, selectedCategory, sortBy]);

  const categoryStats = useMemo(() => {
    return Object.entries(stats.byCategory).map(([category, count]) => ({
      category,
      count,
      percentage: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [stats]);

  const last30DaysTransactions = useMemo(() => 
    filteredTransactions.filter(t => t.date >= Date.now() - (30 * 24 * 60 * 60 * 1000)),
    [filteredTransactions]
  );
  const last30DaysTotal = last30DaysTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Apply free tier limit
  const displayTransactions = useMemo(() => {
    if (tier.isPro) {
      return processedTransactions;
    }
    // For free users, show only the first 3 transactions
    return processedTransactions.slice(0, tier.maxAutopay);
  }, [processedTransactions, tier.isPro, tier.maxAutopay]);

  const isLimitReached = !tier.isPro && filteredTransactions.length > tier.maxAutopay;

  const handleCancelSubscription = (transaction: AutopayTransaction) => {
    setSelectedTransaction(transaction);
    setShowCancellationModal(true);
  };

  const handleCancellationComplete = (transactionId: string, cancelled: boolean) => {
    if (cancelled) {
      // Delete the transaction instead of just marking as cancelled
      onDelete(transactionId);
    }
    setShowCancellationModal(false);
    setSelectedTransaction(null);
  };

  const formatDueDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = timestamp - now;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
  };

  if (false) { // Removed pro-only restriction
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.success}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Autopay Tracker</Text>
              <Text style={styles.headerSubtitle}>Pro Feature</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <BannerAdComponent />
          </View>

          <View style={styles.section}>
            <Card>
              <View style={styles.proContent}>
                <View style={styles.proIcon}>
                  <Icon name="lock" size={40} color={colors.primary[500]} />
                </View>
                <Text style={styles.proTitle}>Upgrade to Pro</Text>
                <Text style={styles.proText}>
                  Track all your autopay and e-mandate transactions with Pro
                </Text>
                <View style={styles.proFeatures}>
                  <View style={styles.proFeature}>
                    <Icon name="check-circle" size={16} color={colors.success[500]} />
                    <Text style={styles.proFeatureText}>Unlimited autopay tracking</Text>
                  </View>
                  <View style={styles.proFeature}>
                    <Icon name="check-circle" size={16} color={colors.success[500]} />
                    <Text style={styles.proFeatureText}>Category breakdown</Text>
                  </View>
                  <View style={styles.proFeature}>
                    <Icon name="check-circle" size={16} color={colors.success[500]} />
                    <Text style={styles.proFeatureText}>Merchant grouping</Text>
                  </View>
                </View>
                
                <TouchableOpacity onPress={onUpgradePress}>
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.proBtn}
                  >
                    <Icon name="star" size={16} color={colors.text.inverse} />
                    <Text style={styles.proBtnText}>Upgrade Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={gradients.success}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Autopay Tracker</Text>
            <Text style={styles.headerSubtitle}>
              {filteredTransactions.length} transactions • ₹{last30DaysTotal.toFixed(0)} (30d)
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="x" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="sliders" size={18} color={showFilters ? colors.success[600] : colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Filter and Sort Options */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.filterChips}>
              {[
                { value: 'date', label: 'Date', icon: 'calendar' },
                { value: 'amount', label: 'Amount', icon: 'dollar-sign' },
                { value: 'merchant', label: 'Merchant', icon: 'type' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, sortBy === option.value && styles.filterChipActive]}
                  onPress={() => setSortBy(option.value as SortOption)}
                >
                  <Icon
                    name={option.icon}
                    size={12}
                    color={sortBy === option.value ? colors.success[700] : colors.text.secondary}
                  />
                  <Text style={[styles.filterChipText, sortBy === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChips}>
              {[
                { value: 'all', label: 'All', count: filteredTransactions.length },
                { value: 'active', label: 'Active', count: stats.active },
                { value: 'inactive', label: 'Inactive', count: filteredTransactions.length - stats.active },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, filterBy === option.value && styles.filterChipActive]}
                  onPress={() => setFilterBy(option.value as FilterOption)}
                >
                  <Text style={[styles.filterChipText, filterBy === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                  <View style={[styles.countBadge, filterBy === option.value && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, filterBy === option.value && styles.countBadgeTextActive]}>
                      {option.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.success[500]]} 
            tintColor={colors.success[500]} 
          />
        }
      >
        <View style={styles.section}>
          <BannerAdComponent />
        </View>

        {/* Stats Overview */}
        <View style={styles.section}>
          <Card>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.success[100] }]}>
                  <Icon name="refresh-cw" size={20} color={colors.success[600]} />
                </View>
                <Text style={styles.statNum}>{stats.total}</Text>
                <Text style={styles.statText}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.primary[100] }]}>
                  <Icon name="check-circle" size={20} color={colors.primary[600]} />
                </View>
                <Text style={styles.statNum}>{stats.active}</Text>
                <Text style={styles.statText}>Active</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.warning[100] }]}>
                  <Icon name="calendar" size={20} color={colors.warning[600]} />
                </View>
                <Text style={styles.statNum}>{stats.lastMonth}</Text>
                <Text style={styles.statText}>Last 30d</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Category Breakdown */}
        {categoryStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="pie-chart" size={18} color={colors.success[600]} />
              <Text style={styles.sectionHead}>Categories</Text>
            </View>
            <View style={styles.catGrid}>
              {categoryStats.map((item) => (
                <TouchableOpacity
                  key={item.category}
                  style={[
                    styles.catBox,
                    selectedCategory === item.category && styles.catBoxActive,
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === item.category ? null : item.category)}
                >
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: getCategoryColor(item.category) + '20' },
                    ]}
                  >
                    <Icon
                      name={getCategoryIcon(item.category)}
                      size={18}
                      color={getCategoryColor(item.category)}
                    />
                  </View>
                  <Text style={styles.catName}>{item.category}</Text>
                  <Text style={styles.catCount}>{item.count}</Text>
                  <View style={styles.catPercentage}>
                    <Text style={styles.catPercentageText}>{item.percentage}%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Transactions List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="list" size={18} color={colors.success[600]} />
            <Text style={styles.sectionHead}>Transactions</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {tier.isPro ? processedTransactions.length : `${displayTransactions.length}/${tier.maxAutopay}`}
              </Text>
            </View>
          </View>

          {/* Free tier limit banner */}
          {isLimitReached && (
            <Card style={{ marginBottom: spacing.md }}>
              <View style={styles.limitBanner}>
                <View style={styles.limitIcon}>
                  <Icon name="lock" size={20} color={colors.warning[600]} />
                </View>
                <View style={styles.limitContent}>
                  <Text style={styles.limitTitle}>
                    Showing {tier.maxAutopay} of {filteredTransactions.length} transactions
                  </Text>
                  <Text style={styles.limitText}>
                    Upgrade to Pro for unlimited autopay tracking
                  </Text>
                </View>
                <TouchableOpacity onPress={onUpgradePress} style={styles.limitButton}>
                  <Text style={styles.limitButtonText}>Upgrade</Text>
                  <Icon name="arrow-right" size={14} color={colors.primary[600]} />
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {processedTransactions.length === 0 ? (
            <Card>
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="inbox" size={40} color={colors.text.tertiary} />
                </View>
                <Text style={styles.emptyTitle}>No Transactions</Text>
                <Text style={styles.emptyText}>
                  {searchQuery || selectedCategory || filterBy !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Autopay and mandate transactions will show here'}
                </Text>
              </View>
            </Card>
          ) : (
            <View style={styles.txnList}>
              {displayTransactions.map((txn, index) => {
                const isUrgent = txn.nextPaymentDate 
                  ? (txn.nextPaymentDate - Date.now()) < 2 * 24 * 60 * 60 * 1000
                  : false;
                const isCancelledTxn = isCancelled(txn.id);
                
                return (
                  <Card 
                    key={txn.id} 
                    style={[
                      styles.txnCard,
                      isUrgent && !isCancelledTxn && styles.txnCardUrgent,
                      isCancelledTxn && styles.txnCardCancelled,
                    ]}
                  >
                    {/* Urgent Banner */}
                    {isUrgent && !isCancelledTxn && (
                      <View style={styles.urgentStrip}>
                        <Icon name="alert-circle" size={12} color={colors.warning[700]} />
                        <Text style={styles.urgentStripText}>
                          Payment due {formatDueDate(txn.nextPaymentDate!)}
                        </Text>
                      </View>
                    )}

                    {/* Cancelled Banner */}
                    {isCancelledTxn && (
                      <View style={styles.cancelledStrip}>
                        <Icon name="check-circle" size={12} color={colors.success[700]} />
                        <Text style={styles.cancelledStripText}>Cancellation Initiated</Text>
                      </View>
                    )}

                    <View style={styles.txnCardContent}>
                      {/* Left: Logo and Info */}
                      <View style={styles.txnLeft}>
                        <SubscriptionLogo merchantName={txn.merchantName} size={48} />
                        <View style={styles.txnInfo}>
                          <Text style={styles.txnName}>{txn.merchantName}</Text>
                          <View style={styles.txnMeta}>
                            <View style={[styles.txnTypeBadge, txn.status === 'active' && styles.txnTypeBadgeActive]}>
                              <Text style={[styles.txnType, txn.status === 'active' && styles.txnTypeActive]}>
                                {txn.paymentType}
                              </Text>
                            </View>
                            {txn.category && (
                              <View style={[styles.txnCatBadge, { backgroundColor: getCategoryColor(txn.category) + '20' }]}>
                                <Icon name={getCategoryIcon(txn.category)} size={10} color={getCategoryColor(txn.category)} />
                                <Text style={[styles.txnCat, { color: getCategoryColor(txn.category) }]}>{txn.category}</Text>
                              </View>
                            )}
                          </View>
                          {txn.nextPaymentDate ? (
                            <View style={styles.nextDueBadge}>
                              <Icon name="calendar" size={10} color={colors.text.tertiary} />
                              <Text style={styles.nextDueText}>
                                Next: {dayjs(txn.nextPaymentDate).format('MMM D')}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.txnDate}>
                              {dayjs(txn.date).format('MMM D, YYYY')}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Right: Amount and Actions */}
                      <View style={styles.txnRight}>
                        <Text style={styles.txnAmount}>₹{txn.amount}</Text>
                        
                        {/* Action Buttons */}
                        <View style={styles.txnActions}>
                          {!isCancelledTxn && txn.status === 'active' && (
                            <TouchableOpacity
                              style={styles.txnCancelButton}
                              onPress={() => handleCancelSubscription(txn)}
                              activeOpacity={0.7}
                            >
                              <Icon name="x-circle" size={16} color="#FFFFFF" />
                              <Text style={styles.txnCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.txnDeleteButton}
                            onPress={() => onDelete(txn.id)}
                            activeOpacity={0.7}
                          >
                            <Icon name="trash-2" size={14} color={colors.error[500]} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cancellation Modal */}
      {selectedTransaction && (
        <CancellationModal
          visible={showCancellationModal}
          onClose={() => {
            setShowCancellationModal(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onCancellationComplete={handleCancellationComplete}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headline.medium,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body.small,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    ...typography.body.medium,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[200],
  },
  filtersContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterLabel: {
    ...typography.label.small,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[300],
  },
  filterChipText: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.success[700],
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: colors.success[200],
  },
  countBadgeText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  countBadgeTextActive: {
    color: colors.success[700],
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionHead: {
    ...typography.title.medium,
    color: colors.text.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  badgeText: {
    ...typography.label.small,
    color: colors.success[700],
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border.light,
  },
  statNum: {
    ...typography.headline.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
  statText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontSize: 10,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  catBox: {
    minWidth: 100,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  catBoxActive: {
    borderColor: colors.success[300],
    backgroundColor: colors.success[50],
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  catName: {
    ...typography.body.small,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
    fontSize: 11,
  },
  catCount: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  catPercentage: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  catPercentageText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  txnList: {
    gap: spacing.md,
  },
  txnCard: {
    padding: 0,
    overflow: 'hidden',
  },
  txnCardUrgent: {
    borderWidth: 2,
    borderColor: colors.warning[300],
  },
  txnCardCancelled: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: colors.success[200],
  },
  urgentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning[200],
  },
  urgentStripText: {
    ...typography.label.small,
    color: colors.warning[700],
    fontSize: 11,
    fontWeight: '600',
  },
  cancelledStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.success[200],
  },
  cancelledStripText: {
    ...typography.label.small,
    color: colors.success[700],
    fontSize: 11,
    fontWeight: '600',
  },
  txnCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  txnLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  txnItemLast: {
    borderBottomWidth: 0,
  },
  txnInfo: {
    flex: 1,
  },
  txnName: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  txnMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  txnTypeBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  txnTypeBadgeActive: {
    backgroundColor: colors.success[100],
  },
  txnType: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 9,
  },
  txnTypeActive: {
    color: colors.success[700],
  },
  txnDate: {
    ...typography.body.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  nextDueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextDueText: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  txnCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  txnCat: {
    ...typography.label.small,
    textTransform: 'capitalize',
    fontSize: 9,
    fontWeight: '600',
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  txnAmount: {
    ...typography.title.medium,
    fontWeight: '700',
    color: colors.text.primary,
  },
  txnActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  txnCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning[500],
    ...shadows.sm,
  },
  txnCancelButtonText: {
    ...typography.label.small,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  txnDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.body.small,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  proContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  proFeatures: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  proBtnText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  limitIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitContent: {
    flex: 1,
  },
  limitTitle: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  limitText: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  limitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
  },
  limitButtonText: {
    ...typography.body.small,
    fontWeight: '600',
    color: colors.primary[600],
  },
});
