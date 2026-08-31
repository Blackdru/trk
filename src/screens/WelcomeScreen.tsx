import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  onComplete: (smsPermissionGranted: boolean) => void;
  onRequestSmsPermission?: () => Promise<boolean>;
}

export function WelcomeScreen({ onComplete, onRequestSmsPermission }: Props) {
  const [smsStatus, setSmsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  const handleAction = async () => {
    if (smsStatus === 'requesting') return;

    if (smsStatus === 'granted') {
      onComplete(true);
      return;
    }

    if (!onRequestSmsPermission) {
      onComplete(true);
      return;
    }

    setSmsStatus('requesting');
    try {
      const granted = await onRequestSmsPermission();
      if (granted) {
        setSmsStatus('granted');
        setTimeout(() => {
          onComplete(true);
        }, 400);
      } else {
        setSmsStatus('denied');
      }
    } catch (error) {
      console.error('[WelcomeScreen] Permission error:', error);
      setSmsStatus('denied');
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(err => console.warn('Could not open settings', err));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Brand Header with App Logo */}
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/app_logo.png')}
              style={styles.appLogo}
              resizeMode="cover"
            />
          </View>

          <View style={styles.badgePill}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgePillText}>UPI TRACKER & AUTOPAY MANAGER</Text>
          </View>

          <Text style={styles.heroTitle}>Track Your Money,{'\n'}Effortlessly</Text>
          <Text style={styles.heroSubtitle}>
            Automatically discover UPI subscriptions, recurring autopays & daily expenses straight from your messages.
          </Text>
        </View>

        {/* Feature Highlights Cards */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.primary[50] }]}>
              <Icon name="refresh-cw" size={17} color={colors.primary[600]} />
            </View>
            <View style={styles.featureTextContent}>
              <Text style={styles.featureTitle}>Auto-Sync From SMS</Text>
              <Text style={styles.featureDescription}>
                Instant detection of UPI subscriptions, recurring mandates & bank transactions.
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.warning[50] }]}>
              <Icon name="bell" size={17} color={colors.warning[500]} />
            </View>
            <View style={styles.featureTextContent}>
              <Text style={styles.featureTitle}>Smart Renewal Reminders</Text>
              <Text style={styles.featureDescription}>
                Get timely advance alerts before renewals to avoid unexpected bank debits.
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.success[50] }]}>
              <Icon name="shield" size={17} color={colors.success[600]} />
            </View>
            <View style={styles.featureTextContent}>
              <Text style={styles.featureTitle}>100% On-Device & Private</Text>
              <Text style={styles.featureDescription}>
                SMS processing stays strictly on your phone. No personal data or OTPs ever leave your device.
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy & Permission Callout */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionHeader}>
            <Icon name="lock" size={15} color={colors.primary[600]} />
            <Text style={styles.permissionCardTitle}>Read-Only SMS Access</Text>
          </View>
          <Text style={styles.permissionCardDesc}>
            Used strictly to parse bank debit notifications locally. We never read OTPs, personal chats, or share any data.
          </Text>
        </View>

        {/* Denied Feedback Banner */}
        {smsStatus === 'denied' && (
          <View style={styles.deniedBanner}>
            <View style={styles.deniedHeader}>
              <Icon name="alert-circle" size={18} color={colors.error[500]} />
              <Text style={styles.deniedTitle}>SMS Permission Required</Text>
            </View>
            <Text style={styles.deniedDesc}>
              Track needs SMS permission to detect your subscriptions and passbook transactions.
            </Text>
            <View style={styles.deniedActionRow}>
              <TouchableOpacity style={styles.deniedRetryBtn} onPress={handleAction}>
                <Text style={styles.deniedRetryText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deniedSettingsBtn} onPress={handleOpenSettings}>
                <Text style={styles.deniedSettingsText}>Open App Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButtonWrapper}
          onPress={handleAction}
          disabled={smsStatus === 'requesting'}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={smsStatus === 'granted' ? gradients.success : gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            {smsStatus === 'requesting' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.text.inverse} size="small" />
                <Text style={styles.primaryButtonText}>Requesting Access...</Text>
              </View>
            ) : smsStatus === 'granted' ? (
              <View style={styles.loadingRow}>
                <Icon name="check" size={20} color={colors.text.inverse} />
                <Text style={styles.primaryButtonText}>Access Granted! Starting...</Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <Text style={styles.primaryButtonText}>Enable SMS & Get Started</Text>
                <Icon name="arrow-right" size={18} color={colors.text.inverse} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Local on-device parsing • Bank-grade privacy • No account required
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoWrapper: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.md,
  },
  appLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
    marginRight: 6,
  },
  badgePillText: {
    ...typography.label.small,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary[700],
    letterSpacing: 0.6,
  },
  heroTitle: {
    ...typography.headline.large,
    fontSize: 25,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 31,
    marginBottom: 6,
  },
  heroSubtitle: {
    ...typography.body.medium,
    fontSize: 13.5,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.xs,
  },
  featuresContainer: {
    gap: spacing.sm + 1,
    marginBottom: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureTextContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body.medium,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 1,
  },
  featureDescription: {
    ...typography.body.small,
    fontSize: 11.5,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.xs,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  permissionCardTitle: {
    ...typography.body.small,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary[700],
  },
  permissionCardDesc: {
    ...typography.body.small,
    fontSize: 11.5,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  deniedBanner: {
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error[200],
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  deniedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deniedTitle: {
    ...typography.body.small,
    fontWeight: '700',
    color: colors.error[700],
  },
  deniedDesc: {
    ...typography.body.small,
    fontSize: 12,
    color: colors.error[800],
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  deniedActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deniedRetryBtn: {
    backgroundColor: colors.error[600],
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  deniedRetryText: {
    ...typography.label.small,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  deniedSettingsBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error[300],
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  deniedSettingsText: {
    ...typography.label.small,
    color: colors.error[700],
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    ...shadows.md,
  },
  primaryButtonWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.label.large,
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 15,
  },
  footerNote: {
    ...typography.label.small,
    fontSize: 10.5,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs + 2,
  },
});
