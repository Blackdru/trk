import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import type { Subscription } from '../types';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  today: Subscription[];
  tomorrow: Subscription[];
  twoDays: Subscription[];
  onDismiss: () => void;
}

export function RenewalAlertBanner({ today, tomorrow, twoDays, onDismiss }: Props) {
  const hasAlerts = today.length > 0 || tomorrow.length > 0 || twoDays.length > 0;

  if (!hasAlerts) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="bell" size={20} color="#EF4444" />
          <Text style={styles.headerTitle}>Upcoming Renewals</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Icon name="x" size={18} color="#A1A1AA" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}
      >
        {today.length > 0 && (
          <View style={[styles.alertCard, styles.alertToday]}>
            <View style={styles.alertHeader}>
              <Icon name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.alertTitle}>Renewing Today</Text>
            </View>
            {today.map((sub, index) => (
              <View key={sub.id} style={styles.subItem}>
                <Text style={styles.subName} numberOfLines={1}>
                  {sub.merchantName}
                </Text>
                <Text style={styles.subAmount}>₹{sub.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {tomorrow.length > 0 && (
          <View style={[styles.alertCard, styles.alertTomorrow]}>
            <View style={styles.alertHeader}>
              <Icon name="clock" size={16} color="#F59E0B" />
              <Text style={styles.alertTitle}>Tomorrow</Text>
            </View>
            {tomorrow.map((sub, index) => (
              <View key={sub.id} style={styles.subItem}>
                <Text style={styles.subName} numberOfLines={1}>
                  {sub.merchantName}
                </Text>
                <Text style={styles.subAmount}>₹{sub.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {twoDays.length > 0 && (
          <View style={[styles.alertCard, styles.alertTwoDays]}>
            <View style={styles.alertHeader}>
              <Icon name="calendar" size={16} color="#0D9488" />
              <Text style={styles.alertTitle}>In 2 Days</Text>
            </View>
            {twoDays.map((sub, index) => (
              <View key={sub.id} style={styles.subItem}>
                <Text style={styles.subName} numberOfLines={1}>
                  {sub.merchantName}
                </Text>
                <Text style={styles.subAmount}>₹{sub.amount}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.title.small,
    color: colors.text.primary,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  cardsContainer: {
    gap: spacing.xs,
  },
  alertCard: {
    minWidth: 160,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  alertToday: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[400],
  },
  alertTomorrow: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[400],
  },
  alertTwoDays: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[400],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  alertTitle: {
    ...typography.label.medium,
    color: colors.text.primary,
  },
  subItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  subName: {
    ...typography.body.small,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.xs,
  },
  subAmount: {
    ...typography.body.small,
    color: colors.text.primary,
    fontWeight: '700',
  },
});
