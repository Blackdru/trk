/**
 * Centralized error handling utilities
 */

export enum ErrorType {
  SMS_PERMISSION_DENIED = 'SMS_PERMISSION_DENIED',
  SMS_SYNC_FAILED = 'SMS_SYNC_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  SUBSCRIPTION_LIMIT = 'SUBSCRIPTION_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  originalError?: any;
  retryable: boolean;
}

export function createError(
  type: ErrorType,
  message: string,
  userMessage: string,
  originalError?: any,
  retryable: boolean = false
): AppError {
  return {
    type,
    message,
    userMessage,
    originalError,
    retryable,
  };
}

export function handleError(error: AppError): void {
  // Log to console for debugging
  console.error(`[Error] ${error.type}: ${error.message}`, error.originalError);
  
  // In production, you could send to analytics/crash reporting
  // Example: Sentry.captureException(error);
}

export function getUserFriendlyMessage(error: any): string {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    return error.userMessage;
  }
  
  // Default messages based on error type
  if (error?.message?.includes('permission')) {
    return 'Permission denied. Please grant the required permissions in Settings.';
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  if (error?.message?.includes('storage') || error?.message?.includes('MMKV')) {
    return 'Storage error. Please try restarting the app.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}

export class RetryableOperation {
  private maxRetries: number;
  private retryDelay: number;
  
  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
  
  async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: any) => void
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.log(`[RetryableOperation] Attempt ${attempt}/${this.maxRetries} failed:`, error);
        
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
