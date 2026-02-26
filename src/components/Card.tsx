import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, shadows, borderRadius, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: string[];
  elevated?: boolean;
  padding?: keyof typeof spacing;
}

export function Card({ children, style, gradient, elevated = true, padding = 'md' }: CardProps) {
  const containerStyle = [
    styles.card,
    elevated && shadows.md,
    { padding: spacing[padding] },
    style,
  ];

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
