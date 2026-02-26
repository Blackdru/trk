import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { AppSettings } from '../types';
import { Card } from '../components/Card';
import { ContactScreen } from './ContactScreen';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '../theme';

interface Props {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onRequestSmsPermission: () => void;
  hasSmsPermission: boolean;
  isPro: boolean;
  onUpgradePress: () => void;
}

export function SettingsScreen({ 
  settings, 
  onSettingsChange, 
  onRequestSmsPermission,
  hasSmsPermission,
  isPro,
  onUpgradePress,
}: Props) {
  const [showContactModal, setShowContactModal] = useState(false);

  const toggleNotifications = () => {
    onSettingsChange({
      ...settings,
      notificationsEnabled: !settings.notificationsEnabled,
    });
  };

  const handleRateApp = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.budrock.upitracker';
    Linking.openURL(playStoreUrl).catch(err => console.error('Failed to open Play Store:', err));
  };

  const handlePrivacyPolicy = () => {
    const privacyUrl = 'https://www.robotpdf.com/apps/upitracker';
    Linking.openURL(privacyUrl).catch(err => console.error('Failed to open Privacy Policy:', err));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={gradients.purple}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your preferences</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Pro Status / Upgrade Card */}
      <View style={styles.section}>
        {!isPro ? (
          <TouchableOpacity onPress={onUpgradePress}>
            <LinearGradient
              colors={gradients.sunset}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.upgradeCard, shadows.md]}
            >
              <View style={styles.upgradeIconWrapper}>
                <Icon name="star" size={20} color={colors.text.inverse} />
              </View>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                <Text style={styles.upgradeSubtitle}>
                  Unlimited subscriptions • Ad-free • Autopay tracking
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.text.inverse} />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <Card gradient={[colors.success[50], colors.success[100]]}>
            <View style={styles.proContent}>
              <View style={styles.proIconWrapper}>
                <Icon name="check-circle" size={20} color={colors.success[600]} />
              </View>
              <View style={styles.proInfo}>
                <Text style={styles.proTitle}>Pro Member</Text>
                <Text style={styles.proSubtitle}>
                  You have access to all premium features
                </Text>
              </View>
            </View>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <Card>
          <View style={styles.row}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primary[100] }]}>
              <Icon name="bell" size={18} color={colors.primary[600]} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Renewal Reminders</Text>
              <Text style={styles.rowSubtitle}>Get notified 2 days before renewal</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.gray[200], true: colors.primary[200] }}
              thumbColor={settings.notificationsEnabled ? colors.primary[600] : colors.background}
              ios_backgroundColor={colors.gray[200]}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PERMISSIONS</Text>
        <Card>
          <View style={styles.row}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.success[100] }]}>
              <Icon name="message-square" size={18} color={colors.success[600]} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>SMS Access</Text>
              <Text style={[styles.rowSubtitle, hasSmsPermission && styles.permissionGranted]}>
                {hasSmsPermission ? 'Granted • Auto-detection enabled' : 'Required for auto-detection'}
              </Text>
            </View>
            {!hasSmsPermission && (
              <TouchableOpacity onPress={onRequestSmsPermission}>
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.grantButton}
                >
                  <Text style={styles.grantButtonText}>Grant</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {hasSmsPermission && (
              <View style={styles.checkIcon}>
                <Icon name="check-circle" size={20} color={colors.success[500]} />
              </View>
            )}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <TouchableOpacity onPress={handlePrivacyPolicy}>
          <Card gradient={[colors.success[50], colors.background]}>
            <View style={styles.privacyHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.success[100] }]}>
                <Icon name="shield" size={18} color={colors.success[600]} />
              </View>
              <Text style={styles.privacyTitle}>Privacy & Security</Text>
              <Icon name="external-link" size={16} color={colors.text.tertiary} style={styles.privacyLinkIcon} />
            </View>
            <Text style={styles.privacyText}>
              This app reads SMS only to detect UPI subscription payments. All processing happens locally on your device. No data is shared with any external servers or third parties.
            </Text>
            <Text style={styles.privacyText}>
              Only messages containing UPI-related keywords are analyzed. Personal messages and OTPs are automatically ignored.
            </Text>
            <Text style={styles.privacyLink}>Tap to view full Privacy Policy</Text>
          </Card>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <TouchableOpacity onPress={handleRateApp}>
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.warning[100] }]}>
                <Icon name="star" size={18} color={colors.warning[600]} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>Rate the App</Text>
                <Text style={styles.rowSubtitle}>Share your feedback on Play Store</Text>
              </View>
              <Icon name="external-link" size={18} color={colors.text.tertiary} />
            </View>
          </Card>
        </TouchableOpacity>

        <View style={styles.cardSpacing} />

        <TouchableOpacity onPress={() => setShowContactModal(true)}>
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.primary[100] }]}>
                <Icon name="mail" size={18} color={colors.primary[600]} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>Contact</Text>
                <Text style={styles.rowSubtitle}>Get in touch with us</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContactModal(false)}
      >
        <ContactScreen onClose={() => setShowContactModal(false)} />
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
  headerTitle: {
    ...typography.headline.medium,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body.small,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.label.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body.medium,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  rowSubtitle: {
    ...typography.body.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  permissionGranted: {
    color: colors.success[600],
  },
  grantButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  grantButtonText: {
    ...typography.body.small,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  privacyTitle: {
    ...typography.title.small,
    color: colors.text.primary,
    flex: 1,
  },
  privacyLinkIcon: {
    marginLeft: spacing.xs,
  },
  privacyText: {
    ...typography.body.small,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  privacyLink: {
    ...typography.body.small,
    color: colors.primary[600],
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  upgradeCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    ...typography.title.small,
    color: colors.text.inverse,
    marginBottom: 2,
  },
  upgradeSubtitle: {
    ...typography.body.small,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    fontSize: 11,
  },
  proContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  proInfo: {
    flex: 1,
  },
  proTitle: {
    ...typography.title.small,
    color: colors.success[700],
    marginBottom: 2,
  },
  proSubtitle: {
    ...typography.body.small,
    color: colors.success[600],
    lineHeight: 16,
    fontSize: 11,
  },
  cardSpacing: {
    height: spacing.sm,
  },
});
