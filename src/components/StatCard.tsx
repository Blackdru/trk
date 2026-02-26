import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  gradient?: string[];
  iconColor?: string;
}

export function StatCard({ icon, label, value, subtitle, gradient = ['#8B5CF6', '#6D28D9'], iconColor = '#FFFFFF' }: StatCardProps) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, shadows.md]}
    >
      <View style={styles.iconContainer}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    ...typography.label.small,
    color: 'rgba(255, 255, 255, 0.95)',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.headline.small,
    color: colors.text.inverse,
    marginBottom: 2,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body.small,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
  },
});
