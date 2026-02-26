import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { getBannerAdUnitId, BannerAdSize } from '../services/admob';
import { getSubscriptionTier } from '../services/subscriptionService';

// Lazy import to prevent crashes
let BannerAd: any = null;
let BannerAdSizeType: any = null;
try {
  const AdMobModule = require('react-native-google-mobile-ads');
  BannerAd = AdMobModule.BannerAd;
  BannerAdSizeType = AdMobModule.BannerAdSize;
} catch (error) {
  console.warn('[BannerAd] AdMob package not installed');
}

interface Props {
  size?: string;
  style?: any;
}

export function BannerAdComponent({ size = BannerAdSize.ADAPTIVE_BANNER, style }: Props) {
  const tier = getSubscriptionTier();
  const [adError, setAdError] = useState<string | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  console.log('[BannerAd] Component render - tier:', tier);

  // Don't show ads for pro users
  if (!tier.hasAds) {
    console.log('[BannerAd] Not showing ads - user is Pro');
    return null;
  }

  // If AdMob not available, show placeholder in development
  if (!BannerAd) {
    console.warn('[BannerAd] AdMob SDK not available');
    if (__DEV__) {
      return (
        <View style={[styles.placeholder, style]}>
          <Text style={styles.placeholderText}>Ad Placeholder (AdMob not installed)</Text>
        </View>
      );
    }
    return null;
  }

  const adUnitId = getBannerAdUnitId();
  console.log('[BannerAd] Rendering banner ad with unit ID:', adUnitId);
  console.log('[BannerAd] BannerAdSizeType available:', !!BannerAdSizeType);

  // Show placeholder if ad failed to load (no-fill is common with test ads)
  if (adError && !adLoaded) {
    if (__DEV__) {
      return (
        <View style={[styles.placeholder, style]}>
          <Text style={styles.placeholderText}>Ad Space (No inventory available)</Text>
          <Text style={styles.errorText}>{adError}</Text>
        </View>
      );
    }
    return null; // Don't show anything in production if ad fails
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSizeType?.BANNER || 'BANNER'}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('[BannerAd] Ad loaded successfully');
          setAdLoaded(true);
          setAdError(null);
        }}
        onAdFailedToLoad={(error: any) => {
          const errorMsg = error?.message || 'Failed to load ad';
          console.error('[BannerAd] Ad load failed:', errorMsg, error);
          
          // No-fill is normal and expected, especially with test ads
          if (errorMsg.includes('no-fill') || errorMsg.includes('no ad')) {
            console.log('[BannerAd] No ad inventory available (this is normal)');
          }
          
          setAdError(errorMsg);
          setAdLoaded(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    paddingVertical: 10,
    minHeight: 60,
    borderRadius: 8,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4E4E7',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 10,
  },
  placeholderText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
});
