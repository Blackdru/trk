import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { hasPermission } from '../native/SmsModule';
import { createError, ErrorType, handleError } from '../utils/errorHandler';

export function usePermissions() {
  const [hasSmsPermission, setHasSmsPermission] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  
  const checkSmsPermission = useCallback(async () => {
    try {
      setIsCheckingPermission(true);
      const hasPermissionResult = await hasPermission();
      setHasSmsPermission(hasPermissionResult);
      return hasPermissionResult;
    } catch (error) {
      console.error('[Permissions] Failed to check SMS permission:', error);
      const appError = createError(
        ErrorType.SMS_PERMISSION_DENIED,
        'Failed to check SMS permission',
        'Could not check SMS permissions. Please try again.',
        error
      );
      handleError(appError);
      return false;
    } finally {
      setIsCheckingPermission(false);
    }
  }, []);
  
  const requestSmsPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      const readResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission Required',
          message:
            'This app needs access to your SMS to automatically detect UPI subscriptions. ' +
            'All processing happens locally on your device. No data is sent to external servers.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      const receiveResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        {
          title: 'SMS Permission Required',
          message: 'Allow receiving SMS for real-time subscription detection.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      const granted =
        readResult === PermissionsAndroid.RESULTS.GRANTED &&
        receiveResult === PermissionsAndroid.RESULTS.GRANTED;
      
      setHasSmsPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'SMS access is needed for automatic subscription detection. You can still add subscriptions manually.\n\n' +
          'To enable later, go to Settings > Apps > UPI Subscription Tracker > Permissions.',
          [{ text: 'OK' }]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('[Permissions] Failed to request SMS permission:', error);
      
      const appError = createError(
        ErrorType.SMS_PERMISSION_DENIED,
        'Failed to request SMS permission',
        'Could not request SMS permissions. Please grant permissions manually in Settings.',
        error
      );
      handleError(appError);
      
      Alert.alert(
        'Permission Error',
        appError.userMessage,
        [{ text: 'OK' }]
      );
      
      return false;
    }
  }, []);
  
  return {
    hasSmsPermission,
    isCheckingPermission,
    checkSmsPermission,
    requestSmsPermission,
  };
}
