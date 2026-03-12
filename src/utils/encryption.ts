/**
 * Simple encryption utilities for sensitive data
 * Uses MMKV's built-in encryption for storage
 * 
 * Note: For production, consider using:
 * - react-native-keychain for secure key storage
 * - More robust encryption libraries
 */

import { getStorage } from '../storage';

const ENCRYPTION_KEY = 'encryption_enabled';

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return getStorage().getBoolean(ENCRYPTION_KEY) || false;
}

/**
 * Enable encryption for future data
 * Note: MMKV encryption must be set at initialization
 */
export function enableEncryption(): void {
  getStorage().set(ENCRYPTION_KEY, true);
  console.log('[Encryption] Encryption enabled for future data');
}

/**
 * Disable encryption
 */
export function disableEncryption(): void {
  getStorage().set(ENCRYPTION_KEY, false);
  console.log('[Encryption] Encryption disabled');
}

/**
 * Sanitize SMS data before logging
 * Removes sensitive information like account numbers, UPI IDs
 */
export function sanitizeSmsForLogging(smsBody: string): string {
  return smsBody
    // Mask account numbers
    .replace(/A\/c\s*(?:No\.?|Number)?\s*:?\s*[X\d]{4,}/gi, 'A/c: XXXX')
    .replace(/account\s*(?:no\.?|number)?\s*:?\s*[X\d]{4,}/gi, 'Account: XXXX')
    // Mask UPI IDs
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+/gi, 'xxx@xxx')
    // Mask reference numbers
    .replace(/(?:ref|reference|umn|upi)\s*(?:no\.?|number)?\s*:?\s*[a-z0-9]{10,}/gi, 'Ref: XXXX')
    // Mask phone numbers
    .replace(/\d{10}/g, 'XXXXXXXXXX')
    // Keep first 50 chars for context
    .substring(0, 100);
}

/**
 * Hash sensitive data for comparison without storing plaintext
 */
export function hashSensitiveData(data: string): string {
  // Simple hash function - for production use crypto library
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Mask sensitive parts of merchant names
 * Useful for displaying in logs
 */
export function maskMerchantName(name: string): string {
  if (name.length <= 4) {
    return name;
  }
  
  const visibleChars = Math.min(4, Math.floor(name.length / 2));
  const masked = name.substring(0, visibleChars) + '***';
  
  return masked;
}

/**
 * Check if SMS contains sensitive personal information
 */
export function containsSensitiveInfo(smsBody: string): boolean {
  const sensitivePatterns = [
    /\b\d{16}\b/, // Card numbers
    /\b\d{12}\b/, // Aadhaar-like numbers
    /pan\s*:?\s*[a-z]{5}\d{4}[a-z]/i, // PAN numbers
    /cvv\s*:?\s*\d{3}/i, // CVV
    /pin\s*:?\s*\d{4,6}/i, // PIN
    /password/i, // Password mentions
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(smsBody));
}

/**
 * Redact sensitive information from SMS body
 */
export function redactSensitiveInfo(smsBody: string): string {
  return smsBody
    // Redact card numbers
    .replace(/\b\d{16}\b/g, 'XXXX-XXXX-XXXX-XXXX')
    // Redact Aadhaar-like numbers
    .replace(/\b\d{12}\b/g, 'XXXX-XXXX-XXXX')
    // Redact PAN numbers
    .replace(/pan\s*:?\s*[a-z]{5}\d{4}[a-z]/gi, 'PAN: XXXXX9999X')
    // Redact CVV
    .replace(/cvv\s*:?\s*\d{3}/gi, 'CVV: XXX')
    // Redact PIN
    .replace(/pin\s*:?\s*\d{4,6}/gi, 'PIN: XXXX');
}
