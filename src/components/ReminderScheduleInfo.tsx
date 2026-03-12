import React from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReminderScheduleInfo({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={gradients.purple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                style={styles.iconGradient}
              >
                <Icon name="bell" size={32} color={colors.text.inverse} />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>How Alarms Work</Text>
            <Text style={styles.headerSubtitle}>
              Reliable payment reminders that work even when the app is closed
            </Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Key Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Features</Text>
            
            <View style={styles.featuresGrid}>
              <FeatureCard
                title="Works When Closed"
                description="Native alarms trigger even if app hasn't been opened in weeks"
              />
              <FeatureCard
                title="100% Reliable"
                description="Never miss a payment with guaranteed alarm delivery"
              />
              <FeatureCard
                title="Full-Screen Alerts"
                description="Impossible to miss with full-screen alarm interface"
              />
              <FeatureCard
                title="Smart Timing"
                description="3 perfectly timed alarms per payment - no spam"
              />
            </View>
          </View>

          {/* Alarm Schedule Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alarm Schedule</Text>
            <Text style={styles.sectionDescription}>
              Each payment gets exactly 3 alarms at strategic times
            </Text>

            <AlarmCard
              time="2 Days Before"
              schedule="8:00 AM"
              title="Early Warning"
              description="Get a heads-up to prepare for the upcoming payment"
              features={[
                'Full-screen alarm notification',
                'Mark as Paid to stop all alarms',
                'Remind Tomorrow to snooze until next day',
              ]}
            />

            <AlarmCard
              time="1 Day Before"
              schedule="8:00 AM"
              title="Urgent Reminder"
              description="Final warning before payment day arrives"
              features={[
                'High-priority full-screen alarm',
                'Mark as Paid to confirm payment',
                'Remind Tomorrow for one more day',
              ]}
            />

            <AlarmCard
              time="Payment Day"
              schedule="6:00 AM"
              title="Critical Alert"
              description="Payment is due today - take action now"
              features={[
                'Maximum priority alarm',
                'Mark as Paid to confirm',
                'Snooze 2 Hours (one-time only)',
              ]}
              critical
            />
          </View>

          {/* How It Works Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary[100] }]}>
                  <Text style={[styles.stepNumberText, { color: colors.primary[700] }]}>1</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Native Android Alarms</Text>
                  <Text style={styles.infoText}>
                    We use Android's AlarmManager API - the same system used by your phone's clock app
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.success[100] }]}>
                  <Text style={[styles.stepNumberText, { color: colors.success[700] }]}>2</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Scheduled in Advance</Text>
                  <Text style={styles.infoText}>
                    All alarms are scheduled when you add a subscription - no background services needed
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.warning[100] }]}>
                  <Text style={[styles.stepNumberText, { color: colors.warning[700] }]}>3</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Guaranteed Delivery</Text>
                  <Text style={styles.infoText}>
                    Alarms trigger even in Doze mode, with app closed, or after phone restart
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trust Badge */}
          <View style={styles.trustSection}>
            <LinearGradient
              colors={[colors.success[50], colors.success[100]]}
              style={styles.trustBadge}
            >
              <Text style={styles.trustTitle}>Bulletproof Reliability</Text>
              <Text style={styles.trustText}>
                Just 3 well-timed alarms per payment. No spam, no battery drain, 100% reliable.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FeatureCard({ 
  title, 
  description 
}: { 
  title: string; 
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

function AlarmCard({
  time,
  schedule,
  title,
  description,
  features,
  critical,
}: {
  time: string;
  schedule: string;
  title: string;
  description: string;
  features: string[];
  critical?: boolean;
}) {
  return (
    <View style={[styles.alarmCard, critical && styles.alarmCardCritical]}>
      <View style={styles.alarmHeader}>
        <View style={styles.alarmHeaderText}>
          <View style={styles.alarmTimeRow}>
            <Text style={[styles.alarmTime, critical && styles.alarmTimeCritical]}>{time}</Text>
            <View style={[styles.scheduleBadge, critical && styles.scheduleBadgeCritical]}>
              <Text style={[styles.scheduleText, critical && styles.scheduleTextCritical]}>{schedule}</Text>
            </View>
          </View>
          <Text style={styles.alarmTitle}>{title}</Text>
        </View>
      </View>
      
      <Text style={styles.alarmDescription}>{description}</Text>
      
      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={[styles.featureDot, critical && styles.featureDotCritical]} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headline.large,
    color: colors.text.inverse,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.body.medium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    ...typography.title.large,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.body.medium,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  featureTitle: {
    ...typography.body.medium,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.body.small,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  alarmCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  alarmCardCritical: {
    borderColor: colors.error[200],
    borderWidth: 2,
  },
  alarmHeader: {
    marginBottom: spacing.md,
  },
  alarmHeaderText: {
    flex: 1,
  },
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  alarmTime: {
    ...typography.body.medium,
    fontWeight: '700',
    color: colors.text.primary,
  },
  alarmTimeCritical: {
    color: colors.error[600],
  },
  scheduleBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  scheduleBadgeCritical: {
    backgroundColor: colors.error[100],
  },
  scheduleText: {
    ...typography.body.small,
    fontWeight: '600',
    color: colors.text.secondary,
    fontSize: 11,
  },
  scheduleTextCritical: {
    color: colors.error[700],
  },
  alarmTitle: {
    ...typography.title.medium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  alarmDescription: {
    ...typography.body.medium,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[400],
    marginTop: 6,
  },
  featureDotCritical: {
    backgroundColor: colors.error[500],
  },
  featureText: {
    ...typography.body.small,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...typography.title.medium,
    fontWeight: '700',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body.small,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  trustSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  trustBadge: {
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success[200],
  },
  trustTitle: {
    ...typography.headline.small,
    color: colors.success[700],
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  trustText: {
    ...typography.body.medium,
    color: colors.success[700],
    textAlign: 'center',
    lineHeight: 22,
  },
});
