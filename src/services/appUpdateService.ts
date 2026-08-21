import { Platform } from 'react-native';
import SpInAppUpdates, {
  IAUUpdateKind,
  StartUpdateOptions,
} from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(
  false // debug mode flag
);

/**
 * Checks Google Play Store (Android) or App Store (iOS) for app updates.
 * Prompts user with Google Play's native in-app update UI when an update is available.
 * 
 * @param forceImmediate If true, forces an immediate non-dismissible update modal.
 */
export async function checkAndPromptAppUpdate(forceImmediate: boolean = false): Promise<void> {
  try {
    const result = await inAppUpdates.checkNeedsUpdate();

    if (result.shouldUpdate) {
      let updateOptions: StartUpdateOptions = {};

      if (Platform.OS === 'android') {
        updateOptions = {
          updateType: forceImmediate ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE,
        };
      }

      console.log('[InAppUpdate] Update available. Prompting user...');
      await inAppUpdates.startUpdate(updateOptions);
    } else {
      console.log('[InAppUpdate] App is up to date.');
    }
  } catch (error: any) {
    const errorStr = String(error?.message || error);
    if (errorStr.includes('Install Error(-6)') || errorStr.includes('InstallErrorCode#ERROR_INSTALL_NOT_ALLOWED')) {
      console.log('[InAppUpdate] In-app update not allowed on this device/state (e.g. emulator, low battery, or not logged in):', errorStr);
    } else {
      console.warn('[InAppUpdate] Error checking/starting in-app update:', error);
    }
  }
}
