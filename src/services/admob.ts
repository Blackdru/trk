import { Platform } from 'react-native';

// Lazy import to prevent crashes if package not installed
let MobileAds: any = null;
let RewardedInterstitialAd: any = null;
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let TestIds: any = null;

try {
  const AdMobModule = require('react-native-google-mobile-ads');
  MobileAds = AdMobModule.default;
  RewardedInterstitialAd = AdMobModule.RewardedInterstitialAd;
  RewardedAd = AdMobModule.RewardedAd;
  RewardedAdEventType = AdMobModule.RewardedAdEventType;
  AdEventType = AdMobModule.AdEventType;
  TestIds = AdMobModule.TestIds;
} catch (error) {
  console.warn('[AdMob] Package not installed, running in mock mode');
}

// Replace with your actual AdMob ad unit IDs
const AD_UNIT_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    android: 'ca-app-pub-3990640624622013/1573507208',
  }) || (TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111'),
  interstitial: Platform.select({
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    android: 'ca-app-pub-3990640624622013/7987454154',
  }) || (TestIds?.REWARDED_INTERSTITIAL || 'ca-app-pub-3940256099942544/5354046379'),
  rewarded: Platform.select({
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  }) || (TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917'),
};

let interstitialAd: any = null;
let rewardedAd: any = null;

export async function initializeAdMob(): Promise<void> {
  if (!MobileAds) {
    console.warn('[AdMob] SDK not available, skipping initialization');
    return;
  }

  try {
    await MobileAds().initialize();
    console.log('[AdMob] Initialized successfully');

    // Preload interstitial ad
    loadInterstitialAd();

    // Preload rewarded ad
    loadRewardedAd();
  } catch (error) {
    console.error('[AdMob] Initialization error:', error);
  }
}

export function getBannerAdUnitId(): string {
  return AD_UNIT_IDS.banner;
}

export function loadInterstitialAd(): void {
  if (!RewardedInterstitialAd || !RewardedAdEventType || !AdEventType) {
    console.warn('[AdMob] Rewarded Interstitial SDK not available');
    return;
  }

  try {
    interstitialAd = RewardedInterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);

    interstitialAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[AdMob] Rewarded Interstitial ad loaded successfully');
    });

    interstitialAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
      console.log('[AdMob] User earned reward from interstitial:', reward);
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdMob] Rewarded Interstitial ad closed, auto-reloading next ad');
      // Automatically preload next ad as soon as current ad is closed
      loadInterstitialAd();
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('[AdMob] Rewarded Interstitial ad load error:', error);
      // Auto-retry loading after 10 seconds if load failed
      setTimeout(() => {
        loadInterstitialAd();
      }, 10000);
    });

    interstitialAd.load();
  } catch (error) {
    console.error('[AdMob] Error initializing/loading rewarded interstitial:', error);
  }
}

export async function showInterstitialAd(): Promise<void> {
  if (!interstitialAd) {
    console.log('[AdMob] Interstitial ad not available');
    return;
  }

  try {
    if (interstitialAd && interstitialAd.loaded) {
      await interstitialAd.show();
    } else {
      console.log('[AdMob] Interstitial ad not ready');
      loadInterstitialAd();
    }
  } catch (error) {
    console.error('[AdMob] Error showing interstitial:', error);
  }
}

// Export BannerAdSize type
export const BannerAdSize = {
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
};

export function loadRewardedAd(): void {
  if (!RewardedAd || !RewardedAdEventType) {
    console.warn('[AdMob] Rewarded Ad SDK not available');
    return;
  }

  try {
    rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);

    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[AdMob] Rewarded ad loaded');
    });

    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
      console.log('[AdMob] User earned reward:', reward);
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdMob] Rewarded ad closed');
      // Preload next ad
      loadRewardedAd();
    });

    rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('[AdMob] Rewarded ad load error:', error);
      // Auto-retry loading after 10 seconds if load failed
      setTimeout(() => {
        loadRewardedAd();
      }, 10000);
    });

    rewardedAd.load();
  } catch (error) {
    console.error('[AdMob] Error loading rewarded ad:', error);
  }
}

export async function showRewardedAd(onRewarded?: () => void): Promise<boolean> {
  if (!rewardedAd) {
    console.log('[AdMob] Rewarded ad not available');
    loadRewardedAd();
    return false;
  }

  try {
    if (rewardedAd && rewardedAd.loaded) {
      // Add one-time listener for reward
      if (onRewarded && RewardedAdEventType) {
        const unsubscribe = rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => {
            onRewarded();
            unsubscribe();
          }
        );
      }

      await rewardedAd.show();
      return true;
    } else {
      console.log('[AdMob] Rewarded ad not ready');
      loadRewardedAd();
      return false;
    }
  } catch (error) {
    console.error('[AdMob] Error showing rewarded ad:', error);
    return false;
  }
}
