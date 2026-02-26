import { TextStyle } from 'react-native';

export const typography = {
  // Display styles
  display: {
    large: {
      fontSize: 57,
      lineHeight: 64,
      fontWeight: '700' as TextStyle['fontWeight'],
      letterSpacing: -0.25,
    },
    medium: {
      fontSize: 45,
      lineHeight: 52,
      fontWeight: '700' as TextStyle['fontWeight'],
    },
    small: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700' as TextStyle['fontWeight'],
    },
  },
  
  // Headline styles
  headline: {
    large: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700' as TextStyle['fontWeight'],
    },
    medium: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    small: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
  },
  
  // Title styles
  title: {
    large: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    medium: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600' as TextStyle['fontWeight'],
      letterSpacing: 0.15,
    },
    small: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600' as TextStyle['fontWeight'],
      letterSpacing: 0.1,
    },
  },
  
  // Body styles
  body: {
    large: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as TextStyle['fontWeight'],
      letterSpacing: 0.5,
    },
    medium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as TextStyle['fontWeight'],
      letterSpacing: 0.25,
    },
    small: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as TextStyle['fontWeight'],
      letterSpacing: 0.4,
    },
  },
  
  // Label styles
  label: {
    large: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as TextStyle['fontWeight'],
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as TextStyle['fontWeight'],
      letterSpacing: 0.5,
    },
    small: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500' as TextStyle['fontWeight'],
      letterSpacing: 0.5,
    },
  },
};
