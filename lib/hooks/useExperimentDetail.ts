/**
 * useExperimentDetail Hook
 * Fetches and manages single experiment details with auto-fetch on mount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExperimentDetailResponse } from '@/types/monitoring';

export interface UseExperimentDetailParams {
  experimentName: string;
  autoFetch?: boolean;
}

export interface UseExperimentDetailReturn {
  experiment: ExperimentDetailResponse['data'] | null;
  timeRange: ExperimentDetailResponse['timeRange'] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching single experiment details
 * Auto-fetches on mount or when experimentName changes
 *
 * @param experimentName - The name of the experiment to fetch
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 */
export function useExperimentDetail(
  experimentName: string,
  autoFetch: boolean = true
): UseExperimentDetailReturn {
  const [experiment, setExperiment] = useState<ExperimentDetailResponse['data'] | null>(null);
  const [timeRange, setTimeRange] = useState<ExperimentDetailResponse['timeRange'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch experiment details from API
   */
  const fetchExperiment = useCallback(async (): Promise<void> => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const encodedName = encodeURIComponent(experimentName);
      const response = await fetch(
        `/api/monitoring/experiments/${encodedName}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText
        }));
        throw new Error(
          errorData.message || `Failed to fetch experiment: ${response.status}`
        );
      }

      const data: ExperimentDetailResponse = await response.json();

      if (!data.success) {
        throw new Error('API returned unsuccessful response');
      }

      setExperiment(data.data);
      setTimeRange(data.timeRange);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);

      if (process.env.NODE_ENV === 'development') {
        console.error('[useExperimentDetail] fetchExperiment error:', error);
      }
    } finally {
      // Only set loading to false if this is still the current request
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [experimentName]);

  /**
   * Auto-fetch on mount and when experimentName changes
   */
  useEffect(() => {
    if (!experimentName) {
      setExperiment(null);
      setTimeRange(null);
      setError(null);
      return;
    }

    if (autoFetch) {
      fetchExperiment();
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [experimentName, autoFetch, fetchExperiment]);

  return {
    experiment,
    timeRange,
    loading,
    error,
    refetch: fetchExperiment,
  };
}
