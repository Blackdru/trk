import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

const { width, height } = Dimensions.get('window');

interface Payment {
  id: string;
  merchantName: string;
  amount: number;
  dueDate: number;
  type: 'subscription' | 'autopay';
  category?: string;
}

interface Props {
  payment: Payment;
  urgency: 'two-days' | 'one-day' | 'today';
  onMarkAsPaid: () => void;
  onRemindTomorrow: () => void;
  onSnooze?: () => void;
  currentIndex?: number;
  totalAlarms?: number;
}

export function PaymentAlarmScreen({ payment, urgency, onMarkAsPaid, onRemindTomorrow, onSnooze, currentIndex, totalAlarms }: Props) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Prevent back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shake animation for critical urgency
    if (urgency === 'today') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.delay(3000),
        ])
      ).start();
    }

    return () => {
      backHandler.remove();
    };
  }, [urgency, pulseAnim, shakeAnim]);

  const getUrgencyConfig = () => {
    switch (urgency) {
      case 'two-days':
        return {
          gradient: ['#F59E0B', '#D97706'],
          icon: 'alert-circle',
          title: 'Payment Due in 2 Days',
          message: 'Ensure you have sufficient balance',
          emoji: '⚠️',
        };
      case 'one-day':
        return {
          gradient: ['#EF4444', '#DC2626'],
          icon: 'alert-triangle',
          title: 'Payment Due Tomorrow',
          message: 'Last chance to prepare your account',
          emoji: '🚨',
        };
      case 'today':
        return {
          gradient: ['#DC2626', '#991B1B'],
          icon: 'zap',
          title: 'PAYMENT DUE TODAY',
          message: 'Payment will be processed today!',
          emoji: '🔴',
        };
    }
  };

  const config = getUrgencyConfig();
  const daysUntil = urgency === 'two-days' ? 2 : urgency === 'one-day' ? 1 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={config.gradient[0]} />
      
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: pulseAnim },
                  { translateX: urgency === 'today' ? shakeAnim : 0 },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <Icon name={config.icon} size={80} color="#FFF" />
            </View>
          </Animated.View>

          {totalAlarms != null && totalAlarms > 1 && (
            <View style={styles.alarmCounter}>
              <Text style={styles.alarmCounterText}>
                {(currentIndex ?? 0) + 1} of {totalAlarms} payments
              </Text>
            </View>
          )}

          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>
        </View>

        {/* Payment Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Icon 
              name={payment.type === 'subscription' ? 'repeat' : 'dollar-sign'} 
              size={24} 
              color={config.gradient[0]} 
            />
            <Text style={styles.detailsType}>
              {payment.type === 'subscription' ? 'Subscription' : payment.category || 'Autopay'}
            </Text>
          </View>

          <Text style={styles.merchantName}>{payment.merchantName}</Text>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amount}>₹{payment.amount}</Text>
          </View>

          <View style={styles.dateContainer}>
            <Icon name="calendar" size={16} color={colors.text.secondary} />
            <Text style={styles.dateText}>
              Due: {dayjs(payment.dueDate).format('MMM D, YYYY')}
            </Text>
          </View>

          {daysUntil > 0 && (
            <View style={styles.countdownContainer}>
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownNumber}>{daysUntil}</Text>
                <Text style={styles.countdownLabel}>day{daysUntil > 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.countdownText}>remaining</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Mark as Paid - Primary Action */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onMarkAsPaid}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Icon name="check-circle" size={24} color="#FFF" />
              <Text style={styles.primaryButtonText}>Mark as Paid</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Actions */}
          <View style={styles.secondaryActions}>
            {urgency === 'today' && onSnooze ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onSnooze}
                activeOpacity={0.7}
              >
                <Icon name="clock" size={20} color="#FFF" />
                <Text style={styles.secondaryButtonText}>Snooze 2 Hours</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onRemindTomorrow}
                activeOpacity={0.7}
              >
                <Icon name="bell" size={20} color="#FFF" />
                <Text style={styles.secondaryButtonText}>Remind Tomorrow</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <Icon name="info" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.bottomInfoText}>
            {urgency === 'today' 
              ? 'Payment will be automatically processed today'
              : 'You will be reminded again tomorrow'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  alarmCounter: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  alarmCounterText: {
    ...typography.body.medium,
    color: '#FFF',
    fontWeight: '700',
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline.large,
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    ...typography.body.large,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginVertical: spacing.lg,
    ...shadows.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailsType: {
    ...typography.body.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  merchantName: {
    ...typography.headline.medium,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  amountLabel: {
    ...typography.body.large,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  amount: {
    ...typography.headline.large,
    color: colors.text.primary,
    fontWeight: '800',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border.light,
  },
  countdownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumber: {
    ...typography.headline.medium,
    color: '#D97706',
    fontWeight: '800',
  },
  countdownLabel: {
    ...typography.label.small,
    color: '#D97706',
    fontSize: 10,
  },
  countdownText: {
    ...typography.body.large,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    ...typography.title.large,
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    ...typography.body.medium,
    color: '#FFF',
    fontWeight: '600',
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  bottomInfoText: {
    ...typography.body.small,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
