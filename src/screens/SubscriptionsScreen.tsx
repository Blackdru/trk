import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { Subscription, AutopayTransaction } from '../types';
import { SubscriptionLogo } from '../components/SubscriptionLogo';
import { BannerAdComponent } from '../components/BannerAdComponent';
import { Card } from '../components/Card';
import { CancellationModal } from '../components/CancellationModal';
import { getSubscriptionTier } from '../services/subscriptionService';
import { useCancellationTracking } from '../hooks/useCancellationTracking';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  subscriptions: Subscription[];
  onDelete: (id: string) => void;
}

type SortOption = 'name' | 'amount' | 'date' | 'cycle';
type FilterOption = 'all' | 'monthly' | 'yearly' | 'quarterly' | 'weekly';
type ViewMode = 'grid' | 'list';

const getCycleIcon = (cycle: string) => {
  switch (cycle) {
    case 'weekly': return 'refresh-cw';
    case 'monthly': return 'calendar';
    case 'quarterly': return 'clock';
    case 'yearly': return 'repeat';
    default: return 'calendar';
  }
};

const getCycleColor = (cycle: string) => {
  switch (cycle) {
    case 'weekly': return colors.accent[500];
    case 'monthly': return colors.primary[500];
    case 'quarterly': return colors.warning[500];
    case 'yearly': return colors.success[500];
    default: return colors.gray[500];
  }
};

export function SubscriptionsScreen({ subscriptions, onDelete }: Props) {
  const tier = getSubscriptionTier();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  
  const { markAsCancelled, isCancelled } = useCancellationTracking();

  const handleCancelSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowCancellationModal(true);
  };

  const handleCancellationComplete = (transactionId: string, cancelled: boolean) => {
    if (cancelled) {
      // Delete the subscription instead of just marking as cancelled
      onDelete(transactionId);
    }
    setShowCancellationModal(false);
    setSelectedSubscription(null);
  };

  // Convert Subscription to AutopayTransaction format for modal
  const subscriptionToTransaction = (sub: Subscription): AutopayTransaction => ({
    id: sub.id,
    merchantName: sub.merchantName,
    amount: sub.amount,
    date: sub.lastPaymentDate || Date.now(),
    paymentType: 'Autopay',
    status: 'active',
    rawSms: `Subscription: ${sub.merchantName}`,
    nextPaymentDate: sub.nextRenewalDate,
    billingCycle: sub.billingCycle,
    // For subscriptions screen, default to Play Store if no payment app specified
    // This makes sense since most app subscriptions are managed through Play Store
    paymentApp: sub.paymentApp || 'playstore',
  });

  // Filter and sort subscriptions
  const filteredAndSortedSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(sub =>
        sub.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply cycle filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(sub => sub.billingCycle === filterBy);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.merchantName.localeCompare(b.merchantName);
        case 'amount':
          return b.monthlyEquivalent - a.monthlyEquivalent;
        case 'date':
          return a.nextRenewalDate - b.nextRenewalDate;
        case 'cycle':
          return a.billingCycle.localeCompare(b.billingCycle);
        default:
          return 0;
      }
    });

    return sorted;
  }, [subscriptions, searchQuery, sortBy, filterBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMonthly = subscriptions.reduce((sum, sub) => sum + sub.monthlyEquivalent, 0);
    const byCycle = subscriptions.reduce((acc, sub) => {
      acc[sub.billingCycle] = (acc[sub.billingCycle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalMonthly, byCycle };
  }, [subscriptions]);

  const renderGridItem = ({ item }: { item: Subscription }) => {
    const isCancelledSub = isCancelled(item.id);
    const isUrgent = item.nextRenewalDate 
      ? (item.nextRenewalDate - Date.now()) < 2 * 24 * 60 * 60 * 1000
      : false;

    return (
      <View style={styles.gridCard}>
        <Card padding="sm" style={[
          isUrgent && !isCancelledSub && styles.gridCardUrgent,
          isCancelledSub && styles.gridCardCancelled,
        ]}>
          {isUrgent && !isCancelledSub && (
            <View style={styles.urgentStripSmall}>
              <Icon name="alert-circle" size={10} color={colors.warning[700]} />
              <Text style={styles.urgentStripTextSmall}>Due soon</Text>
            </View>
          )}
          {isCancelledSub && (
            <View style={styles.cancelledStripSmall}>
              <Icon name="check-circle" size={10} color={colors.success[700]} />
              <Text style={styles.cancelledStripTextSmall}>Cancelled</Text>
            </View>
          )}
          <View style={styles.gridCardHeader}>
            <SubscriptionLogo merchantName={item.merchantName} size={48} />
            <View style={styles.gridActions}>
              {!isCancelledSub && (
                <TouchableOpacity
                  style={styles.gridCancelButton}
                  onPress={() => handleCancelSubscription(item)}
                  activeOpacity={0.7}
                >
                  <Icon name="x-circle" size={12} color={colors.warning[600]} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.gridDeleteButton}
                onPress={() => onDelete(item.id)}
                activeOpacity={0.7}
              >
                <Icon name="trash-2" size={12} color={colors.error[500]} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.gridMerchantName} numberOfLines={1}>{item.merchantName}</Text>
          <View style={styles.gridPriceRow}>
            <Text style={styles.gridPrice}>₹{item.amount}</Text>
            <View style={[styles.gridCycleBadge, { backgroundColor: getCycleColor(item.billingCycle) + '20' }]}>
              <Icon name={getCycleIcon(item.billingCycle)} size={10} color={getCycleColor(item.billingCycle)} />
            </View>
          </View>
          {item.billingCycle !== 'monthly' && (
            <Text style={styles.gridMonthlyEquiv}>₹{item.monthlyEquivalent.toFixed(0)}/mo</Text>
          )}
          <View style={styles.gridDateRow}>
            <Icon name="calendar" size={10} color={colors.text.tertiary} />
            <Text style={styles.gridDate}>{dayjs(item.nextRenewalDate).format('MMM D')}</Text>
          </View>
        </Card>
      </View>
    );
  };

  const renderListItem = ({ item }: { item: Subscription }) => {
    const isCancelledSub = isCancelled(item.id);
    const isUrgent = item.nextRenewalDate 
      ? (item.nextRenewalDate - Date.now()) < 2 * 24 * 60 * 60 * 1000
      : false;

    return (
      <View style={styles.listCard}>
        <Card padding="md" style={[
          isUrgent && !isCancelledSub && styles.listCardUrgent,
          isCancelledSub && styles.listCardCancelled,
        ]}>
          {isUrgent && !isCancelledSub && (
            <View style={styles.urgentStrip}>
              <Icon name="alert-circle" size={12} color={colors.warning[700]} />
              <Text style={styles.urgentStripText}>
                Payment due {dayjs(item.nextRenewalDate).fromNow()}
              </Text>
            </View>
          )}
          {isCancelledSub && (
            <View style={styles.cancelledStrip}>
              <Icon name="check-circle" size={12} color={colors.success[700]} />
              <Text style={styles.cancelledStripText}>Cancellation Initiated</Text>
            </View>
          )}
          <View style={styles.listCardContent}>
            <SubscriptionLogo merchantName={item.merchantName} size={56} />
            <View style={styles.listCardInfo}>
              <Text style={styles.listMerchantName} numberOfLines={1}>{item.merchantName}</Text>
              <View style={styles.listMetaRow}>
                <View style={[styles.listCycleBadge, { backgroundColor: getCycleColor(item.billingCycle) + '20' }]}>
                  <Icon name={getCycleIcon(item.billingCycle)} size={11} color={getCycleColor(item.billingCycle)} />
                  <Text style={[styles.listCycleText, { color: getCycleColor(item.billingCycle) }]}>
                    {item.billingCycle}
                  </Text>
                </View>
                <View style={[styles.listSourceBadge, { backgroundColor: item.source === 'sms' ? colors.success[100] : colors.gray[100] }]}>
                  <Icon
                    name={item.source === 'sms' ? 'zap' : 'edit-3'}
                    size={10}
                    color={item.source === 'sms' ? colors.success[700] : colors.text.tertiary}
                  />
                  <Text style={[styles.listSourceText, { color: item.source === 'sms' ? colors.success[700] : colors.text.tertiary }]}>
                    {item.source === 'sms' ? 'Auto' : 'Manual'}
                  </Text>
                </View>
              </View>
              <View style={styles.listDateRow}>
                <Icon name="calendar" size={12} color={colors.text.tertiary} />
                <Text style={styles.listDate}>Next: {dayjs(item.nextRenewalDate).format('MMM D, YYYY')}</Text>
              </View>
            </View>
            <View style={styles.listCardRight}>
              <View style={styles.listPriceBox}>
                <Text style={styles.listPrice}>₹{item.amount}</Text>
                {item.billingCycle !== 'monthly' && (
                  <Text style={styles.listMonthlyEquiv}>₹{item.monthlyEquivalent.toFixed(0)}/mo</Text>
                )}
              </View>
              <View style={styles.listActions}>
                {!isCancelledSub && (
                  <TouchableOpacity
                    style={styles.listCancelButton}
                    onPress={() => handleCancelSubscription(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="x-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.listCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.listDeleteButton}
                  onPress={() => onDelete(item.id)}
                  activeOpacity={0.7}
                >
                  <Icon name="trash-2" size={14} color={colors.error[500]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Subscriptions</Text>
            <Text style={styles.headerSubtitle}>
              {subscriptions.length} active • ₹{stats.totalMonthly.toFixed(0)}/mo
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Icon name={viewMode === 'list' ? 'grid' : 'list'} size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subscriptions..."
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
          <Icon name="sliders" size={18} color={showFilters ? colors.primary[600] : colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Filter and Sort Options */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.filterChips}>
              {[
                { value: 'name', label: 'Name', icon: 'type' },
                { value: 'amount', label: 'Amount', icon: 'dollar-sign' },
                { value: 'date', label: 'Date', icon: 'calendar' },
                { value: 'cycle', label: 'Cycle', icon: 'repeat' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, sortBy === option.value && styles.filterChipActive]}
                  onPress={() => setSortBy(option.value as SortOption)}
                >
                  <Icon
                    name={option.icon}
                    size={12}
                    color={sortBy === option.value ? colors.primary[700] : colors.text.secondary}
                  />
                  <Text style={[styles.filterChipText, sortBy === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by cycle</Text>
            <View style={styles.filterChips}>
              {[
                { value: 'all', label: 'All', count: subscriptions.length },
                { value: 'monthly', label: 'Monthly', count: stats.byCycle.monthly || 0 },
                { value: 'yearly', label: 'Yearly', count: stats.byCycle.yearly || 0 },
                { value: 'quarterly', label: 'Quarterly', count: stats.byCycle.quarterly || 0 },
                { value: 'weekly', label: 'Weekly', count: stats.byCycle.weekly || 0 },
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

      {/* Subscription List/Grid */}
      <FlatList
        data={filteredAndSortedSubscriptions}
        keyExtractor={item => item.id}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          viewMode === 'grid' && styles.gridContent,
        ]}
        ListHeaderComponent={
          !tier.isPro && subscriptions.length > 0 ? (
            <View style={styles.tierBanner}>
              <View style={styles.tierIcon}>
                <Icon name="info" size={15} color={colors.primary[600]} />
              </View>
              <Text style={styles.tierText}>
                {subscriptions.length}/{tier.maxSubscriptions} subscriptions • Free Plan
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          subscriptions.length > 0 ? (
            <View style={styles.adContainer}>
              <BannerAdComponent />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="inbox" size={52} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No subscriptions found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery || filterBy !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first subscription or enable SMS permission to automatically detect recurring payments'}
            </Text>
          </View>
        }
      />
      
      {/* Cancellation Modal */}
      {selectedSubscription && (
        <CancellationModal
          visible={showCancellationModal}
          onClose={() => {
            setShowCancellationModal(false);
            setSelectedSubscription(null);
          }}
          transaction={subscriptionToTransaction(selectedSubscription)}
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
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
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
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  filterChipText: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.primary[700],
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
    backgroundColor: colors.primary[200],
  },
  countBadgeText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  countBadgeTextActive: {
    color: colors.primary[700],
  },
  listContent: {
    padding: spacing.md,
  },
  gridContent: {
    paddingHorizontal: spacing.sm,
  },
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  tierIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: {
    ...typography.body.small,
    color: colors.primary[700],
    fontWeight: '600',
  },
  // Grid View Styles
  gridCard: {
    flex: 1,
    maxWidth: '50%',
    padding: spacing.xs,
  },
  gridCardUrgent: {
    borderWidth: 2,
    borderColor: colors.warning[300],
  },
  gridCardCancelled: {
    opacity: 0.7,
  },
  urgentStripSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  urgentStripTextSmall: {
    ...typography.label.small,
    color: colors.warning[700],
    fontSize: 9,
    fontWeight: '600',
  },
  cancelledStripSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  cancelledStripTextSmall: {
    ...typography.label.small,
    color: colors.success[700],
    fontSize: 9,
    fontWeight: '600',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  gridActions: {
    flexDirection: 'row',
    gap: 4,
  },
  gridCancelButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.warning[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDeleteButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridMerchantName: {
    ...typography.body.medium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  gridPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gridPrice: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '700',
  },
  gridCycleBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridMonthlyEquiv: {
    ...typography.label.small,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  gridDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridDate: {
    ...typography.label.small,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  // List View Styles
  listCard: {
    marginBottom: spacing.sm,
  },
  listCardUrgent: {
    borderWidth: 2,
    borderColor: colors.warning[300],
  },
  listCardCancelled: {
    opacity: 0.7,
  },
  urgentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xs,
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
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xs,
  },
  cancelledStripText: {
    ...typography.label.small,
    color: colors.success[700],
    fontSize: 11,
    fontWeight: '600',
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listCardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  listMerchantName: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  listMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  listCycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  listCycleText: {
    ...typography.label.small,
    textTransform: 'capitalize',
    fontSize: 10,
    fontWeight: '600',
  },
  listSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  listSourceText: {
    ...typography.label.small,
    fontSize: 10,
  },
  listDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listDate: {
    ...typography.body.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  listCardRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  listPriceBox: {
    alignItems: 'flex-end',
  },
  listPrice: {
    ...typography.title.large,
    color: colors.text.primary,
    fontWeight: '700',
  },
  listMonthlyEquiv: {
    ...typography.label.small,
    color: colors.text.tertiary,
  },
  listActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  listCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning[500],
  },
  listCancelButtonText: {
    ...typography.label.small,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  listDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  adContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
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
    ...typography.headline.small,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    ...typography.body.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
