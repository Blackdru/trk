import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import type { PassbookTransaction, TransactionType } from '../types';
import { Card } from '../components/Card';
import { SubscriptionLogo } from '../components/SubscriptionLogo';
import { BannerAdComponent } from '../components/BannerAdComponent';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  transactions: PassbookTransaction[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

type FilterType = 'all' | 'debit' | 'credit';

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': 'coffee',
  'Shopping': 'shopping-bag',
  'Travel & Fuel': 'navigation',
  'Bills & Utilities': 'zap',
  'Entertainment': 'film',
  'Investment': 'trending-up',
  'Health & Medical': 'activity',
  'Housing & Rent': 'home',
  'Salary': 'dollar-sign',
  'Rewards': 'gift',
  'Refund': 'rotate-ccw',
  'Income': 'arrow-down-left',
  'General Expense': 'credit-card',
  'EMI & Loans': 'repeat',
  'Insurance': 'shield',
  'ATM Withdrawal': 'inbox',
};

/**
 * Hermes-safe number formatter with Indian-style grouping
 * toLocaleString() is unreliable on Hermes without full ICU
 */
function formatNumber(num: number): string {
  const str = Math.round(num).toString();
  // Indian grouping: last 3 digits, then groups of 2
  if (str.length <= 3) return str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${last3}`;
}

/**
 * Skeleton shimmer component for loading state
 */
function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: typeof width === 'string' ? width as any : width,
          height,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.gray[200],
          opacity,
        },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {/* Summary card skeleton */}
      <Card style={styles.summaryCard}>
        <SkeletonBlock width={120} height={14} />
        <View style={{ flexDirection: 'row', marginTop: spacing.md, justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width={80} height={12} />
            <SkeletonBlock width={100} height={24} style={{ marginTop: 6 }} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <SkeletonBlock width={80} height={12} />
            <SkeletonBlock width={100} height={24} style={{ marginTop: 6 }} />
          </View>
        </View>
      </Card>

      {/* Search bar skeleton */}
      <SkeletonBlock width="100%" height={44} style={{ marginVertical: spacing.sm, borderRadius: borderRadius.lg }} />

      {/* Transaction skeletons */}
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
          <SkeletonBlock width={42} height={42} style={{ borderRadius: 10, marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonBlock width={120} height={14} />
              <SkeletonBlock width={70} height={14} />
            </View>
            <SkeletonBlock width={80} height={11} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Check if a merchant name is generic (fallback name)
 */
function isGenericMerchant(name: string): boolean {
  const generic = [
    'UPI Payment',
    'Incoming Transfer',
    'Outgoing Transfer',
    'ATM Withdrawal',
    'Bill Payment',
    'EMI Payment',
    'Loan Payment',
    'Insurance Premium',
    'Rent Payment',
    'Investment',
    'Auto-Debit Payment',
    'Salary Deposit',
    'Refund',
    'Cashback Reward',
    'Payment Reversal',
    'Loan Disbursement',
    'Interest Credit',
  ];
  return generic.includes(name);
}

export function PassbookScreen({ transactions, onRefresh, refreshing }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<PassbookTransaction | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark initial load complete once we have transactions or refreshing finishes
  useEffect(() => {
    if (transactions.length > 0 || !refreshing) {
      // Small delay so skeleton doesn't flash
      const timer = setTimeout(() => setIsInitialLoad(false), 300);
      return () => clearTimeout(timer);
    }
  }, [transactions.length, refreshing]);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

  // Filter counts (for tab badges)
  const filterCounts = useMemo(() => {
    let debitCount = 0;
    let creditCount = 0;
    for (const t of transactions) {
      if (t.type === 'debit') debitCount++;
      else creditCount++;
    }
    return { all: transactions.length, debit: debitCount, credit: creditCount };
  }, [transactions]);

  // Categories present in current transactions
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Type filter
      if (filterType !== 'all' && t.type !== filterType) {
        return false;
      }
      // Category filter
      if (selectedCategory && t.category !== selectedCategory) {
        return false;
      }
      // Search query (uses debounced value to avoid lag)
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchesMerchant = t.merchantName.toLowerCase().includes(query);
        const matchesBank = t.bankName?.toLowerCase().includes(query) ?? false;
        const matchesRef = t.referenceNumber?.toLowerCase().includes(query) ?? false;
        const matchesAccount = t.accountNumber?.toLowerCase().includes(query) ?? false;
        const matchesCategory = t.category?.toLowerCase().includes(query) ?? false;
        const matchesAmount = t.amount.toString().includes(query);
        return matchesMerchant || matchesBank || matchesRef || matchesAccount || matchesCategory || matchesAmount;
      }
      return true;
    });
  }, [transactions, filterType, selectedCategory, debouncedSearch]);

  // Totals now use filteredTransactions so they respect active filters
  const totals = useMemo(() => {
    let creditTotal = 0;
    let debitTotal = 0;
    let currencySymbol = '₹';

    for (const t of filteredTransactions) {
      if (t.currency) currencySymbol = t.currency;
      if (t.type === 'credit') {
        creditTotal += t.amount;
      } else {
        debitTotal += t.amount;
      }
    }

    const net = creditTotal - debitTotal;
    return { creditTotal, debitTotal, net, currencySymbol };
  }, [filteredTransactions]);

  // SectionList data — pre-compute today/yesterday boundaries once
  const sections = useMemo(() => {
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    const todayTs = today.valueOf();
    const yesterdayTs = yesterday.valueOf();
    const weekAgoTs = today.subtract(6, 'day').valueOf();

    const groupMap = new Map<string, PassbookTransaction[]>();
    const groupOrder: string[] = [];

    for (const item of filteredTransactions) {
      const itemTs = dayjs(item.date).startOf('day').valueOf();
      let title: string;

      if (itemTs >= todayTs) {
        title = 'Today';
      } else if (itemTs >= yesterdayTs) {
        title = 'Yesterday';
      } else if (itemTs >= weekAgoTs) {
        title = dayjs(item.date).format('dddd, D MMM');
      } else {
        title = dayjs(item.date).format('D MMMM YYYY');
      }

      if (!groupMap.has(title)) {
        groupMap.set(title, []);
        groupOrder.push(title);
      }
      groupMap.get(title)!.push(item);
    }

    return groupOrder.map(title => ({
      title,
      data: groupMap.get(title)!,
    }));
  }, [filteredTransactions]);

  const renderTransactionItem = useCallback(({ item, index, section }: { item: PassbookTransaction; index: number; section: { data: PassbookTransaction[] } }) => {
    const isCredit = item.type === 'credit';
    // Fixed: credit = incoming (arrow-down-left), debit = outgoing (arrow-up-right)
    const amountColor = isCredit ? '#10B981' : '#EF4444';
    const sign = isCredit ? '+' : '-';
    const categoryIcon = (item.category && CATEGORY_ICONS[item.category]) || 'credit-card';
    const isLast = index === section.data.length - 1;
    const showCategoryFallback = isGenericMerchant(item.merchantName);

    return (
      <TouchableOpacity
        style={[styles.txItem, isLast && styles.txItemLast]}
        onPress={() => setSelectedTransaction(item)}
        activeOpacity={0.7}
      >
        <View style={styles.txIconContainer}>
          {showCategoryFallback ? (
            <View style={[styles.categoryIconContainer, { backgroundColor: isCredit ? '#10B98115' : '#EF444415' }]}>
              <Icon name={categoryIcon} size={20} color={isCredit ? '#10B981' : '#EF4444'} />
            </View>
          ) : (
            <SubscriptionLogo merchantName={item.merchantName} size={42} />
          )}
          <View style={[styles.typeBadge, { backgroundColor: isCredit ? '#10B981' : '#EF4444' }]}>
            <Icon
              name={isCredit ? 'arrow-down-left' : 'arrow-up-right'}
              size={10}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.txContent}>
          <View style={styles.txMainRow}>
            <Text style={styles.txMerchantName} numberOfLines={1}>
              {item.merchantName}
            </Text>
            <Text style={[styles.txAmount, { color: amountColor }]}>
              {sign}{item.currency || '₹'}{formatNumber(item.amount)}
            </Text>
          </View>

          <View style={styles.txSubRow}>
            <View style={styles.txMetaLeft}>
              <Text style={styles.txTime}>{dayjs(item.date).format('hh:mm A')}</Text>
              {item.bankName && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.txBank}>{item.bankName}</Text>
                </>
              )}
              {item.accountNumber && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.txAccount}>{item.accountNumber}</Text>
                </>
              )}
            </View>
            {item.balance !== undefined && (
              <Text style={styles.txBalance}>
                Bal: {item.currency || '₹'}{formatNumber(item.balance)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text style={styles.groupTitle}>{section.title}</Text>
  ), []);

  // Show skeleton on initial load with no data
  if (isInitialLoad && transactions.length === 0 && refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Passbook</Text>
              <Text style={styles.headerSubtitle}>Last 30 Days Transactions</Text>
            </View>
          </View>
        </LinearGradient>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Passbook</Text>
            <Text style={styles.headerSubtitle}>Last 30 Days Transactions</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Icon name="refresh-cw" size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderTransactionItem}
        renderSectionHeader={renderSectionHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        ListHeaderComponent={
          <>
            {/* 30-Day Net Cashflow Summary Card — now respects active filters */}
            <View style={styles.summaryCardWrapper}>
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>
                  {filterType === 'all' && !selectedCategory ? '30-Day Cashflow' : 'Filtered Cashflow'}
                </Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <View style={styles.summaryLabelRow}>
                      <View style={[styles.indicatorDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.summaryLabel}>Total Inflow</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: '#10B981' }]}>
                      +{totals.currencySymbol}{formatNumber(totals.creditTotal)}
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryCol}>
                    <View style={styles.summaryLabelRow}>
                      <View style={[styles.indicatorDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.summaryLabel}>Total Outflow</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
                      -{totals.currencySymbol}{formatNumber(totals.debitTotal)}
                    </Text>
                  </View>
                </View>

                <View style={styles.netCashflowRow}>
                  <Text style={styles.netCashflowLabel}>Net Activity:</Text>
                  <Text
                    style={[
                      styles.netCashflowValue,
                      { color: totals.net >= 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {totals.net >= 0 ? '+' : '-'}{totals.currencySymbol}{formatNumber(Math.abs(totals.net))}
                  </Text>
                </View>
              </Card>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={18} color={colors.text.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search merchant, bank, amount, UTR..."
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedSearch(''); }}>
                  <Icon name="x" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs (All / Debits / Credits) — now with counts on all tabs */}
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
                  All ({filterCounts.all})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, filterType === 'debit' && styles.filterTabActiveDebit]}
                onPress={() => setFilterType('debit')}
              >
                <Text style={[styles.filterTabText, filterType === 'debit' && styles.filterTabTextActiveDebit]}>
                  Debits ({filterCounts.debit})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, filterType === 'credit' && styles.filterTabActiveCredit]}
                onPress={() => setFilterType('credit')}
              >
                <Text style={[styles.filterTabText, filterType === 'credit' && styles.filterTabTextActiveCredit]}>
                  Credits ({filterCounts.credit})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            {availableCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsContainer}
              >
                <TouchableOpacity
                  style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextActive]}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {availableCategories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    {CATEGORY_ICONS[cat] && (
                      <Icon
                        name={CATEGORY_ICONS[cat]}
                        size={12}
                        color={selectedCategory === cat ? colors.text.inverse : colors.text.secondary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="book-open" size={48} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterType !== 'all' || selectedCategory
                ? 'No transactions match your search filters.'
                : 'Transactions from the last 30 days will appear here automatically when SMS messages are received.'}
            </Text>
            {!searchQuery && filterType === 'all' && !selectedCategory && (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={onRefresh}
                activeOpacity={0.7}
              >
                <Icon name="refresh-cw" size={16} color={colors.primary[600]} />
                <Text style={styles.emptyActionText}>Sync Now</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          transactions.length > 0 ? (
            <View style={styles.adContainer}>
              <BannerAdComponent />
            </View>
          ) : null
        }
      />

      {/* Transaction Details Modal */}
      <Modal
        visible={selectedTransaction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTransaction(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedTransaction(null)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalAmountSection}>
                  <Text
                    style={[
                      styles.modalAmount,
                      { color: selectedTransaction.type === 'credit' ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {selectedTransaction.type === 'credit' ? '+' : '-'}
                    {selectedTransaction.currency || '₹'}
                    {formatNumber(selectedTransaction.amount)}
                  </Text>
                  <View
                    style={[
                      styles.modalTypeBadge,
                      {
                        backgroundColor:
                          selectedTransaction.type === 'credit' ? '#10B98120' : '#EF444420',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalTypeBadgeText,
                        {
                          color:
                            selectedTransaction.type === 'credit' ? '#10B981' : '#EF4444',
                        },
                      ]}
                    >
                      {selectedTransaction.type === 'credit' ? 'CREDIT / INFLOW' : 'DEBIT / OUTFLOW'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Party / Merchant</Text>
                  <Text style={styles.modalInfoValue}>{selectedTransaction.merchantName}</Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Date & Time</Text>
                  <Text style={styles.modalInfoValue}>
                    {dayjs(selectedTransaction.date).format('D MMMM YYYY, hh:mm A')}
                  </Text>
                </View>

                {selectedTransaction.bankName && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Bank</Text>
                    <Text style={styles.modalInfoValue}>{selectedTransaction.bankName}</Text>
                  </View>
                )}

                {selectedTransaction.accountNumber && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Account / Card</Text>
                    <Text style={styles.modalInfoValue}>{selectedTransaction.accountNumber}</Text>
                  </View>
                )}

                {selectedTransaction.category && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Category</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {CATEGORY_ICONS[selectedTransaction.category] && (
                        <Icon
                          name={CATEGORY_ICONS[selectedTransaction.category]}
                          size={14}
                          color={colors.text.primary}
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text style={styles.modalInfoValue}>{selectedTransaction.category}</Text>
                    </View>
                  </View>
                )}

                {selectedTransaction.referenceNumber && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Reference / UTR</Text>
                    <Text style={styles.modalInfoValue}>{selectedTransaction.referenceNumber}</Text>
                  </View>
                )}

                {selectedTransaction.balance !== undefined && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Available Balance</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedTransaction.currency || '₹'}{formatNumber(selectedTransaction.balance)}
                    </Text>
                  </View>
                )}

                {selectedTransaction.rawSms && (
                  <View style={styles.modalSmsSection}>
                    <Text style={styles.modalSmsLabel}>Raw SMS</Text>
                    <Text style={styles.modalSmsText}>{selectedTransaction.rawSms}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
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
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  skeletonContainer: {
    padding: spacing.md,
  },
  summaryCardWrapper: {
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  summaryTitle: {
    ...typography.label.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: 6,
  },
  summaryLabel: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  summaryAmount: {
    ...typography.title.large,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.md,
  },
  netCashflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  netCashflowLabel: {
    ...typography.body.small,
    color: colors.text.tertiary,
  },
  netCashflowValue: {
    ...typography.label.large,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body.medium,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  filterTabActiveDebit: {
    backgroundColor: '#EF444415',
  },
  filterTabActiveCredit: {
    backgroundColor: '#10B98115',
  },
  filterTabText: {
    ...typography.label.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.primary[600],
  },
  filterTabTextActiveDebit: {
    color: '#EF4444',
  },
  filterTabTextActiveCredit: {
    color: '#10B981',
  },
  categoryChipsContainer: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  categoryChipText: {
    ...typography.label.small,
    color: colors.text.secondary,
  },
  categoryChipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  groupTitle: {
    ...typography.label.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  txItemLast: {
    borderBottomWidth: 0,
  },
  txIconContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  categoryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  txContent: {
    flex: 1,
  },
  txMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  txMerchantName: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },
  txAmount: {
    ...typography.body.large,
    fontWeight: '700',
  },
  txSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txTime: {
    ...typography.body.small,
    color: colors.text.tertiary,
    fontSize: 12,
  },
  metaDot: {
    color: colors.text.tertiary,
    marginHorizontal: 4,
    fontSize: 10,
  },
  txBank: {
    ...typography.body.small,
    color: colors.text.secondary,
    fontSize: 12,
  },
  txAccount: {
    ...typography.body.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  txBalance: {
    ...typography.body.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
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
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  emptyActionText: {
    ...typography.label.medium,
    color: colors.primary[600],
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    ...typography.title.medium,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: spacing.md,
  },
  modalAmountSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: spacing.md,
  },
  modalAmount: {
    ...typography.headline.medium,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  modalTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  modalTypeBadgeText: {
    ...typography.label.small,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalInfoLabel: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  modalInfoValue: {
    ...typography.body.small,
    fontWeight: '600',
    color: colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalSmsSection: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  modalSmsLabel: {
    ...typography.label.small,
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalSmsText: {
    ...typography.body.small,
    color: colors.text.secondary,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  adContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
