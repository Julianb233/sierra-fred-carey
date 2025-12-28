/**
 * useNotificationSettings Hook
 * Manages notification settings CRUD operations with proper state management
 */

import { useState, useCallback } from 'react';

// Types for notification settings
export interface NotificationConfig {
  id: string;
  experimentName: string;
  channel: 'slack' | 'email' | 'webhook';
  enabled: boolean;
  conditions: {
    significanceThreshold?: number;
    minSampleSize?: number;
    errorRateThreshold?: number;
    latencyThreshold?: number;
  };
  recipients?: string[];
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationConfigData {
  experimentName: string;
  channel: 'slack' | 'email' | 'webhook';
  enabled?: boolean;
  conditions?: NotificationConfig['conditions'];
  recipients?: string[];
  webhookUrl?: string;
}

export interface UpdateNotificationConfigData {
  experimentName?: string;
  channel?: 'slack' | 'email' | 'webhook';
  enabled?: boolean;
  conditions?: NotificationConfig['conditions'];
  recipients?: string[];
  webhookUrl?: string;
}

export interface NotificationTestRequest {
  channel: 'slack' | 'email' | 'webhook';
  recipients?: string[];
  webhookUrl?: string;
}

export interface UseNotificationSettingsReturn {
  configs: NotificationConfig[];
  loading: boolean;
  error: Error | null;
  createConfig: (data: CreateNotificationConfigData) => Promise<NotificationConfig | null>;
  updateConfig: (id: string, data: UpdateNotificationConfigData) => Promise<NotificationConfig | null>;
  deleteConfig: (id: string) => Promise<boolean>;
  testNotification: (channel: NotificationTestRequest) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook for notification settings management
 * Provides CRUD operations and testing functionality
 */
export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all notification configurations
   */
  const fetchConfigs = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/monitoring/notifications/configs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to fetch configs: ${response.status}`);
      }

      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useNotificationSettings] fetchConfigs error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new notification configuration
   */
  const createConfig = useCallback(async (
    data: CreateNotificationConfigData
  ): Promise<NotificationConfig | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/monitoring/notifications/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to create config: ${response.status}`);
      }

      const result = await response.json();
      const newConfig = result.config;

      // Update local state
      setConfigs(prev => [...prev, newConfig]);

      return newConfig;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useNotificationSettings] createConfig error:', error);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update an existing notification configuration
   */
  const updateConfig = useCallback(async (
    id: string,
    data: UpdateNotificationConfigData
  ): Promise<NotificationConfig | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/monitoring/notifications/configs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to update config: ${response.status}`);
      }

      const result = await response.json();
      const updatedConfig = result.config;

      // Update local state
      setConfigs(prev => prev.map(config =>
        config.id === id ? updatedConfig : config
      ));

      return updatedConfig;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useNotificationSettings] updateConfig error:', error);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a notification configuration
   */
  const deleteConfig = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/monitoring/notifications/configs/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to delete config: ${response.status}`);
      }

      // Update local state
      setConfigs(prev => prev.filter(config => config.id !== id));

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useNotificationSettings] deleteConfig error:', error);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send a test notification
   */
  const testNotification = useCallback(async (
    channel: NotificationTestRequest
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/monitoring/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channel),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to send test notification: ${response.status}`);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useNotificationSettings] testNotification error:', error);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    configs,
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    testNotification,
    refetch: fetchConfigs,
  };
}
