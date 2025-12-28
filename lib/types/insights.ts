/**
 * TypeScript types for Insights Dashboard API responses
 */

export interface ABTestVariantStats {
  variantName: string;
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  conversionRate?: number;
}

export interface ABTestResult {
  experimentName: string;
  description?: string;
  variants: ABTestVariantStats[];
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

export interface AnalyzerMetrics {
  analyzer: string;
  count: number;
  avgLatency: number;
  errorRate: number;
}

export interface AIAnalytics {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  totalTokensUsed: number;
  requestsByAnalyzer: AnalyzerMetrics[];
}

export interface TopInsight {
  id: string;
  type: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
  title: string;
  content: string;
  importance: number;
  tags: string[];
  sourceType: string;
  createdAt: string;
}

// API Response types
export interface ABTestsResponse {
  success: boolean;
  data: ABTestResult[];
  error?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AIAnalytics;
  error?: string;
}

export interface TopInsightsResponse {
  success: boolean;
  data: TopInsight[];
  error?: string;
}

export interface TrendDataPoint {
  date: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  insights: number;
}

export interface TrendsResponse {
  success: boolean;
  data: TrendDataPoint[];
  error?: string;
}
