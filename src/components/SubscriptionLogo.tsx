import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { getLogoUrl, getPlaceholderColor, getInitials, getFallbackLogoUrls } from '../utils/logoService';

interface Props {
  merchantName: string;
  size?: number;
  style?: any;
}

export function SubscriptionLogo({ merchantName, size = 48, style }: Props) {
  const [imageError, setImageError] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  
  const logoUrl = getLogoUrl(merchantName);
  const fallbackUrls = getFallbackLogoUrls(merchantName);
  const allUrls = logoUrl ? [logoUrl, ...fallbackUrls] : fallbackUrls;
  const currentUrl = allUrls[currentUrlIndex];

  const handleImageError = () => {
    // Try next fallback URL
    if (currentUrlIndex < allUrls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1);
    } else {
      // All URLs failed, show placeholder
      setImageError(true);
    }
  };

  // If no logo URL or all images failed to load, show placeholder
  if (!currentUrl || imageError) {
    const backgroundColor = getPlaceholderColor(merchantName);
    const initials = getInitials(merchantName);

    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius: size * 0.25,
            backgroundColor,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
            },
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.25,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: currentUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size * 0.25,
          },
        ]}
        onError={handleImageError}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F4F4F4',
  },
  image: {
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
