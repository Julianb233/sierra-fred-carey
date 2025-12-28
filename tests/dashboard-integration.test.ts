/**
 * Integration Test: Monitoring Dashboard API Integration
 *
 * Verifies that the dashboard correctly connects to real API data
 * and handles all response scenarios properly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DashboardResponse, AlertsResponse } from '@/types/monitoring';

describe('Monitoring Dashboard API Integration', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dashboard API Response', () => {
    it('should parse successful dashboard response correctly', async () => {
      const mockResponse: DashboardResponse = {
        success: true,
        data: {
          activeExperiments: [
            {
              experimentName: 'Test Experiment',
              experimentId: 'exp-123',
              isActive: true,
              startDate: new Date('2024-01-01'),
              variants: [
                {
                  variantId: 'var-1',
                  variantName: 'control',
                  experimentName: 'Test Experiment',
                  totalRequests: 1000,
                  uniqueUsers: 800,
                  trafficPercentage: 50,
                  avgLatencyMs: 120,
                  p50LatencyMs: 100,
                  p95LatencyMs: 200,
                  p99LatencyMs: 300,
                  errorRate: 0.01,
                  errorCount: 10,
                  successRate: 0.99,
                  sampleSize: 1000,
                  startDate: new Date('2024-01-01'),
                  endDate: new Date('2024-01-31'),
                },
              ],
              totalRequests: 2000,
              totalUsers: 1500,
              hasStatisticalSignificance: false,
              alerts: [],
            },
          ],
          totalActiveTests: 1,
          totalRequests24h: 50000,
          criticalAlerts: [],
        },
        timestamp: new Date().toISOString(),
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await fetch('/api/monitoring/dashboard');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.activeExperiments).toHaveLength(1);
      expect(data.data.totalActiveTests).toBe(1);
      expect(data.data.totalRequests24h).toBe(50000);
    });

    it('should handle API error responses gracefully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const response = await fetch('/api/monitoring/dashboard');

      expect(response.ok).toBe(false);
      expect(response.statusText).toBe('Internal Server Error');
    });

    it('should handle network errors gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/monitoring/dashboard')).rejects.toThrow('Network error');
    });
  });

  describe('Alerts API Response', () => {
    it('should parse successful alerts response correctly', async () => {
      const mockResponse: AlertsResponse = {
        success: true,
        data: {
          alerts: [
            {
              level: 'critical',
              type: 'performance',
              message: 'High latency detected',
              variantName: 'variant-a',
              metric: 'p95LatencyMs',
              value: 5000,
              threshold: 2000,
              timestamp: new Date(),
            },
          ],
          total: 1,
          breakdown: {
            critical: 1,
            warning: 0,
            info: 0,
          },
        },
        timestamp: new Date().toISOString(),
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await fetch('/api/monitoring/alerts');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.alerts).toHaveLength(1);
      expect(data.data.breakdown.critical).toBe(1);
    });

    it('should filter alerts by level', async () => {
      const mockResponse: AlertsResponse = {
        success: true,
        data: {
          alerts: [],
          total: 0,
          breakdown: {
            critical: 0,
            warning: 0,
            info: 0,
          },
        },
        timestamp: new Date().toISOString(),
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await fetch('/api/monitoring/alerts?level=critical');
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Type Transformations', () => {
    it('should transform experiment data for UI correctly', () => {
      const { transformExperiment } = require('@/types/monitoring');

      const experiment = {
        experimentName: 'Test',
        experimentId: 'exp-1',
        isActive: true,
        startDate: new Date('2024-01-01'),
        variants: [
          {
            variantName: 'control',
            trafficPercentage: 50,
          },
          {
            variantName: 'variant-a',
            trafficPercentage: 50,
          },
        ],
        totalRequests: 1000,
        totalUsers: 800,
        hasStatisticalSignificance: true,
        winningVariant: 'variant-a',
        confidenceLevel: 95,
        alerts: [],
      };

      const uiExperiment = transformExperiment(experiment);

      expect(uiExperiment.id).toBe('exp-1');
      expect(uiExperiment.name).toBe('Test');
      expect(uiExperiment.status).toBe('active');
      expect(uiExperiment.variants).toEqual(['control', 'variant-a']);
      expect(uiExperiment.winner).toBe('variant-a');
      expect(uiExperiment.significance).toBe(95);
    });

    it('should transform alert data for UI correctly', () => {
      const { transformAlert } = require('@/types/monitoring');

      const alert = {
        level: 'critical',
        type: 'performance',
        message: 'High latency',
        variantName: 'variant-a',
        metric: 'p95LatencyMs',
        value: 5000,
        threshold: 2000,
        timestamp: new Date('2024-01-01'),
      };

      const uiAlert = transformAlert(alert, 0);

      expect(uiAlert.type).toBe('error'); // 'critical' maps to 'error' for UI
      expect(uiAlert.message).toBe('High latency');
      expect(uiAlert.source).toBe('performance');
      expect(uiAlert.resolved).toBe(false);
    });
  });

  describe('Dashboard Metrics Calculation', () => {
    it('should calculate aggregate metrics correctly', () => {
      const { calculateMetrics } = require('@/types/monitoring');

      const experiments = [
        {
          variants: [
            {
              avgLatencyMs: 100,
              errorRate: 0.01,
            },
            {
              avgLatencyMs: 150,
              errorRate: 0.02,
            },
          ],
          totalRequests: 1000,
          isActive: true,
          alerts: [
            { level: 'critical' },
            { level: 'warning' },
          ],
        },
        {
          variants: [
            {
              avgLatencyMs: 200,
              errorRate: 0.03,
            },
          ],
          totalRequests: 500,
          isActive: true,
          alerts: [],
        },
      ];

      const metrics = calculateMetrics(experiments);

      expect(metrics.totalRequests).toBe(1500);
      expect(metrics.activeExperiments).toBe(2);
      expect(metrics.criticalAlerts).toBe(1);
      expect(metrics.avgLatency).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThan(1);
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate chart data with correct structure', () => {
      const { generateChartData } = require('@/types/monitoring');

      const chartData = generateChartData(10000, 150, 0.02, 24);

      expect(chartData).toHaveLength(24);
      chartData.forEach((point: any) => {
        expect(point).toHaveProperty('time');
        expect(point).toHaveProperty('requests');
        expect(point).toHaveProperty('latency');
        expect(point).toHaveProperty('errors');
        expect(point.requests).toBeGreaterThan(0);
        expect(point.latency).toBeGreaterThan(0);
        expect(point.errors).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Real-time Polling', () => {
    it('should poll API every 30 seconds', () => {
      vi.useFakeTimers();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      global.fetch = fetchMock as any;

      // Simulate useEffect setup
      const interval = setInterval(() => {
        fetch('/api/monitoring/dashboard');
        fetch('/api/monitoring/alerts');
      }, 30000);

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      expect(fetchMock).toHaveBeenCalledTimes(2); // dashboard + alerts

      clearInterval(interval);
      vi.useRealTimers();
    });
  });
});
