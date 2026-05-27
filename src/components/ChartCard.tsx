import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Card } from './Card';
import { colors, typography, spacing } from '../theme';

const { width } = Dimensions.get('window');
const chartWidth = width - 64;

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: 'pie' | 'bar' | 'line' | 'area';
  data: any[];
  colorScale?: string[];
}

export function ChartCard({ title, subtitle }: ChartCardProps) {
  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.chartContainer}>
        <Text style={styles.placeholder}>
          Chart component requires victory-native v41 configuration
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholder: {
    ...typography.body.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
