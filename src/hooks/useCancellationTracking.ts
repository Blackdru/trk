import { useState, useEffect, useCallback } from 'react';
import { getStorage } from '../storage';
import type { AppTarget } from '../utils/deepLinkService';

interface CancellationRecord {
  transactionId: string;
  appTarget: AppTarget;
  success: boolean;
  timestamp: number;
}

interface CancellationStats {
  appTarget: AppTarget;
  successful: number;
  total: number;
  successRate: number;
}

/**
 * Hook for tracking and analyzing subscription cancellations
 * 
 * Provides:
 * - Cancellation history
 * - Success rates by app
 * - Learning system for improving UX
 */
export function useCancellationTracking() {
  const [cancellations, setCancellations] = useState<CancellationRecord[]>([]);
  const [stats, setStats] = useState<CancellationStats[]>([]);

  useEffect(() => {
    loadCancellationData();
  }, []);

  const loadCancellationData = useCallback(() => {
    try {
      const storage = getStorage();
      // Load all cancellation records
      const allKeys = storage.getAllKeys();
      const cancellationKeys = allKeys.filter(key => key.startsWith('cancellation_'));
      
      const records: CancellationRecord[] = [];
      const statsMap = new Map<AppTarget, { successful: number; total: number }>();

      for (const key of cancellationKeys) {
        if (key.startsWith('cancellation_stats_')) continue;
        
        const data = storage.getString(key);
        if (data) {
          const record = JSON.parse(data) as CancellationRecord;
          records.push(record);
          
          // Aggregate stats
          const existing = statsMap.get(record.appTarget) || { successful: 0, total: 0 };
          existing.total += 1;
          if (record.success) {
            existing.successful += 1;
          }
          statsMap.set(record.appTarget, existing);
        }
      }

      // Sort by timestamp (most recent first)
      records.sort((a, b) => b.timestamp - a.timestamp);
      setCancellations(records);

      // Convert stats map to array
      const statsArray: CancellationStats[] = Array.from(statsMap.entries()).map(
        ([appTarget, data]) => ({
          appTarget,
          successful: data.successful,
          total: data.total,
          successRate: data.total > 0 ? data.successful / data.total : 0,
        })
      );
      
      // Sort by success rate (highest first)
      statsArray.sort((a, b) => b.successRate - a.successRate);
      setStats(statsArray);
    } catch (error) {
      console.error('[CancellationTracking] Error loading data:', error);
    }
  }, []);

  const markAsCancelled = useCallback((transactionId: string) => {
    try {
      const storage = getStorage();
      const key = `cancelled_${transactionId}`;
      storage.set(key, 'true');
    } catch (error) {
      console.error('[CancellationTracking] Error marking as cancelled:', error);
    }
  }, []);

  const isCancelled = useCallback((transactionId: string): boolean => {
    try {
      const storage = getStorage();
      const key = `cancelled_${transactionId}`;
      return storage.getString(key) === 'true';
    } catch (error) {
      console.error('[CancellationTracking] Error checking cancellation:', error);
      return false;
    }
  }, []);

  const getCancellationHistory = useCallback((transactionId: string): CancellationRecord | null => {
    try {
      const storage = getStorage();
      const key = `cancellation_${transactionId}`;
      const data = storage.getString(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[CancellationTracking] Error getting history:', error);
      return null;
    }
  }, []);

  const getRecommendedApp = useCallback((merchantName: string): AppTarget | null => {
    // Simple learning: recommend the app with highest success rate for similar merchants
    if (stats.length === 0) return null;
    
    // For now, just return the app with highest overall success rate
    // In future, could use ML to match merchant patterns
    const bestApp = stats[0];
    return bestApp.successRate > 0.5 ? bestApp.appTarget : null;
  }, [stats]);

  const clearOldRecords = useCallback((daysToKeep: number = 90) => {
    try {
      const storage = getStorage();
      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
      const allKeys = storage.getAllKeys();
      const cancellationKeys = allKeys.filter(key => key.startsWith('cancellation_'));
      
      for (const key of cancellationKeys) {
        if (key.startsWith('cancellation_stats_')) continue;
        
        const data = storage.getString(key);
        if (data) {
          const record = JSON.parse(data) as CancellationRecord;
          if (record.timestamp < cutoffTime) {
            storage.delete(key);
          }
        }
      }
      
      loadCancellationData();
    } catch (error) {
      console.error('[CancellationTracking] Error clearing old records:', error);
    }
  }, [loadCancellationData]);

  return {
    cancellations,
    stats,
    markAsCancelled,
    isCancelled,
    getCancellationHistory,
    getRecommendedApp,
    clearOldRecords,
    refresh: loadCancellationData,
  };
}
