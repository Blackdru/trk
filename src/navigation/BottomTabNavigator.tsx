import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Modal } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import {
  DashboardScreen,
  SubscriptionsScreen,
  AddSubscriptionScreen,
  AutopayScreen,
  PassbookScreen,
  SettingsScreen,
} from '../screens';
import type { Subscription, AppSettings, AutopayTransaction, PassbookTransaction } from '../types';
import { colors, spacing, borderRadius, shadows, typography, gradients } from '../theme';

const Tab = createBottomTabNavigator();

interface Props {
  subscriptions: Subscription[];
  autopayTransactions: AutopayTransaction[];
  passbookTransactions: PassbookTransaction[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  onDeleteSubscription: (id: string) => void;
  onDeleteAutopay: (id: string) => void;
  onAddSubscription: (sub: Subscription) => boolean;
  onAddAutopay: (autopay: AutopayTransaction) => boolean;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onRequestSmsPermission: () => void;
  hasSmsPermission: boolean;
  isPro: boolean;
  onUpgradePress: () => void;
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

export function BottomTabNavigator({
  subscriptions,
  autopayTransactions,
  passbookTransactions,
  onRefresh,
  refreshing,
  onDeleteSubscription,
  onDeleteAutopay,
  onAddSubscription,
  onAddAutopay,
  settings,
  onSettingsChange,
  onRequestSmsPermission,
  hasSmsPermission,
  isPro,
  onUpgradePress,
  upcomingRenewals,
  showRenewalAlert,
  onDismissRenewalAlert,
  onMarkSubscriptionPaid,
  onMarkAutopayPaid,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
            height: Platform.OS === 'ios' ? 84 : 60,
            paddingBottom: Platform.OS === 'ios' ? 24 : 4,
            paddingTop: 4,
            ...shadows.md,
          },
          tabBarLabelStyle: {
            ...typography.label.small,
            fontWeight: '600',
            fontSize: 10.5,
            marginTop: 0,
            marginBottom: 2,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'home';

            switch (route.name) {
              case 'Dashboard':
                iconName = 'home';
                break;
              case 'Passbook':
                iconName = 'book-open';
                break;
              case 'Autopay':
                iconName = 'refresh-cw';
                break;
              case 'Subscriptions':
                iconName = 'layers';
                break;
              case 'Settings':
                iconName = 'settings';
                break;
            }

            return (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <Icon name={iconName} size={size} color={color} />
              </View>
            );
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Dashboard"
          options={{
            tabBarLabel: 'Home',
          }}
        >
          {() => (
            <DashboardScreen
              subscriptions={subscriptions}
              autopayTransactions={autopayTransactions}
              onRefresh={onRefresh}
              refreshing={refreshing}
              upcomingRenewals={upcomingRenewals}
              showRenewalAlert={showRenewalAlert}
              onDismissRenewalAlert={onDismissRenewalAlert}
              onMarkSubscriptionPaid={onMarkSubscriptionPaid}
              onMarkAutopayPaid={onMarkAutopayPaid}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Passbook"
          options={{
            tabBarLabel: 'Passbook',
          }}
        >
          {() => (
            <PassbookScreen
              transactions={passbookTransactions}
              onRefresh={onRefresh}
              refreshing={refreshing}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Autopay"
          options={{
            tabBarLabel: 'Autopay',
          }}
        >
          {() => (
            <AutopayScreen
              transactions={autopayTransactions}
              onRefresh={onRefresh}
              refreshing={refreshing}
              onUpgradePress={onUpgradePress}
              onDelete={onDeleteAutopay}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Subscriptions"
          options={{
            tabBarLabel: 'Subscriptions',
          }}
        >
          {() => (
            <SubscriptionsScreen
              subscriptions={subscriptions}
              onDelete={onDeleteSubscription}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Settings"
          options={{
            tabBarLabel: 'Settings',
          }}
        >
          {() => (
            <SettingsScreen
              settings={settings}
              onSettingsChange={onSettingsChange}
              onRequestSmsPermission={onRequestSmsPermission}
              hasSmsPermission={hasSmsPermission}
              isPro={isPro}
              onUpgradePress={onUpgradePress}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Floating Action Button (FAB) on Bottom-Right above Bottom Nav */}
      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabButton}
        >
          <Icon name="plus" size={26} color={colors.text.inverse} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Manual Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAddModal(false)}
          >
            <Icon name="x" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <AddSubscriptionScreen
          onAdd={sub => {
            const added = onAddSubscription(sub);
            if (added) setShowAddModal(false);
            return added;
          }}
          onAddAutopay={autopay => {
            const added = onAddAutopay(autopay);
            if (added) setShowAddModal(false);
            return added;
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerFocused: {
    transform: [{ scale: 1.1 }],
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 74,
    right: 18,
    zIndex: 999,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
});
