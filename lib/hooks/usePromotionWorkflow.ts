/**
 * usePromotionWorkflow Hook
 * Manages promotion eligibility checking and execution workflow
 */

import { useState, useCallback } from 'react';

// Types for promotion workflow
export interface PromotionEligibility {
  experimentName: string;
  isEligible: boolean;
  winner?: string;
  winnerVariantId?: string;
  confidence?: number;
  improvement?: number;
  reasons: string[];
  warnings: string[];
  safetyChecks: {
    minSampleSize: boolean;
    minConfidence: boolean;
    minImprovement: boolean;
    minRuntime: boolean;
    errorRateAcceptable: boolean;
  };
}

export interface PromotionOptions {
  dryRun?: boolean;
  notifyChannels?: string[];
  rolloutPercentage?: number;
  backupBeforePromotion?: boolean;
}

export interface RollbackReason {
  reason: string;
  details?: string;
  severity?: 'critical' | 'major' | 'minor';
}

export interface PromotionResult {
  success: boolean;
  experimentName: string;
  promotedVariant: string;
  previousWinner?: string;
  timestamp: string;
  backupId?: string;
  message: string;
}

export interface RollbackResult {
  success: boolean;
  experimentName: string;
  rolledBackFrom: string;
  restoredTo?: string;
  timestamp: string;
  message: string;
}

export interface UsePromotionWorkflowReturn {
  eligibility: PromotionEligibility | null;
  loading: boolean;
  promoting: boolean;
  error: Error | null;
  checkEligibility: (experimentName: string) => Promise<PromotionEligibility | null>;
  promoteWinner: (
    experimentName: string,
    options?: PromotionOptions
  ) => Promise<PromotionResult | null>;
  rollbackPromotion: (
    experimentName: string,
    reason: RollbackReason
  ) => Promise<RollbackResult | null>;
}

/**
 * Hook for promotion eligibility and execution
 * Provides methods to check eligibility, promote winners, and rollback promotions
 */
export function usePromotionWorkflow(): UsePromotionWorkflowReturn {
  const [eligibility, setEligibility] = useState<PromotionEligibility | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [promoting, setPromoting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Check if an experiment is eligible for promotion
   * GET /api/monitoring/experiments/[name]/promote
   */
  const checkEligibility = useCallback(async (
    experimentName: string
  ): Promise<PromotionEligibility | null> => {
    setLoading(true);
    setError(null);

    try {
      const encodedName = encodeURIComponent(experimentName);
      const response = await fetch(
        `/api/monitoring/experiments/${encodedName}/promote`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText
        }));
        throw new Error(
          errorData.message || `Failed to check eligibility: ${response.status}`
        );
      }

      const data = await response.json();
      const eligibilityData: PromotionEligibility = data.eligibility || data;

      setEligibility(eligibilityData);
      return eligibilityData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);

      if (process.env.NODE_ENV === 'development') {
        console.error('[usePromotionWorkflow] checkEligibility error:', error);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Execute promotion of winning variant
   * POST /api/monitoring/experiments/[name]/promote
   */
  const promoteWinner = useCallback(async (
    experimentName: string,
    options: PromotionOptions = {}
  ): Promise<PromotionResult | null> => {
    setPromoting(true);
    setError(null);

    try {
      const encodedName = encodeURIComponent(experimentName);
      const response = await fetch(
        `/api/monitoring/experiments/${encodedName}/promote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            experimentName,
            options: {
              dryRun: options.dryRun ?? false,
              notifyChannels: options.notifyChannels ?? [],
              rolloutPercentage: options.rolloutPercentage ?? 100,
              backupBeforePromotion: options.backupBeforePromotion ?? true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText
        }));
        throw new Error(
          errorData.message || `Failed to promote winner: ${response.status}`
        );
      }

      const data = await response.json();
      const result: PromotionResult = data.result || data;

      // Clear eligibility after successful promotion
      if (result.success) {
        setEligibility(null);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);

      if (process.env.NODE_ENV === 'development') {
        console.error('[usePromotionWorkflow] promoteWinner error:', error);
      }

      return null;
    } finally {
      setPromoting(false);
    }
  }, []);

  /**
   * Rollback a promotion
   * DELETE /api/monitoring/experiments/[name]/promote
   */
  const rollbackPromotion = useCallback(async (
    experimentName: string,
    reason: RollbackReason
  ): Promise<RollbackResult | null> => {
    setPromoting(true);
    setError(null);

    try {
      const encodedName = encodeURIComponent(experimentName);
      const response = await fetch(
        `/api/monitoring/experiments/${encodedName}/promote`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: reason.reason,
            details: reason.details,
            severity: reason.severity ?? 'major',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText
        }));
        throw new Error(
          errorData.message || `Failed to rollback promotion: ${response.status}`
        );
      }

      const data = await response.json();
      const result: RollbackResult = data.result || data;

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);

      if (process.env.NODE_ENV === 'development') {
        console.error('[usePromotionWorkflow] rollbackPromotion error:', error);
      }

      return null;
    } finally {
      setPromoting(false);
    }
  }, []);

  return {
    eligibility,
    loading,
    promoting,
    error,
    checkEligibility,
    promoteWinner,
    rollbackPromotion,
  };
}
