import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import {
  DashboardScreen,
  SubscriptionsScreen,
  AddSubscriptionScreen,
  AutopayScreen,
  SettingsScreen,
} from '../screens';
import type { Subscription, AppSettings, AutopayTransaction } from '../types';
import { colors, spacing, borderRadius, shadows, typography, gradients } from '../theme';

const Tab = createBottomTabNavigator();

interface Props {
  subscriptions: Subscription[];
  autopayTransactions: AutopayTransaction[];
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border.light,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : spacing.sm,
          paddingTop: spacing.sm,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          ...typography.label.small,
          fontWeight: '600',
          marginTop: spacing.xs,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          
          switch (route.name) {
            case 'Dashboard':
              iconName = 'home';
              break;
            case 'Subscriptions':
              iconName = 'layers';
              break;
            case 'Add':
              iconName = 'plus-circle';
              break;
            case 'Autopay':
              iconName = 'refresh-cw';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
          }

          if (route.name === 'Add') {
            return (
              <View style={styles.addButtonContainer}>
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addButton}
                >
                  <Icon name={iconName} size={28} color={colors.text.inverse} />
                </LinearGradient>
              </View>
            );
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
        name="Subscriptions"
        options={{
          tabBarLabel: 'Subs',
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
        name="Add"
        options={{
          tabBarLabel: '',
        }}
      >
        {() => <AddSubscriptionScreen onAdd={onAddSubscription} onAddAutopay={onAddAutopay} />}
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
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerFocused: {
    transform: [{ scale: 1.1 }],
  },
  addButtonContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
