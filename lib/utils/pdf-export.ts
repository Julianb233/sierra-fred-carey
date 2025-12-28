import type { AIAnalytics, TopInsight, ABTestResult, TrendDataPoint } from "@/lib/types/insights";

export interface InsightsDashboardData {
  analytics: AIAnalytics | null;
  insights: TopInsight[];
  abTests: ABTestResult[];
  trends: TrendDataPoint[];
}

/**
 * Generate a comprehensive PDF report of insights dashboard
 * Uses browser's native PDF generation capabilities
 */
export function generateInsightsPDF(data: InsightsDashboardData, dateRange: string) {
  const { analytics, insights, abTests, trends } = data;
  const generatedDate = new Date().toLocaleDateString();

  // Create a new window with printable content
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download the PDF report");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>AI Insights Report - ${generatedDate}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 3px solid #ff6a1a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #ff6a1a;
            font-size: 32px;
          }
          .header .subtitle {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
          }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 24px;
          }
          .section h3 {
            color: #374151;
            font-size: 18px;
            margin-bottom: 10px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          }
          .metric-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            background: #f9fafb;
          }
          .metric-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .metric-value {
            font-size: 28px;
            font-weight: bold;
            color: #ff6a1a;
          }
          .insight-card {
            border-left: 4px solid #ff6a1a;
            padding: 15px;
            margin-bottom: 15px;
            background: #f9fafb;
            page-break-inside: avoid;
          }
          .insight-card.breakthrough { border-left-color: #8b5cf6; }
          .insight-card.warning { border-left-color: #ef4444; }
          .insight-card.opportunity { border-left-color: #10b981; }
          .insight-card.pattern { border-left-color: #3b82f6; }
          .insight-card.recommendation { border-left-color: #f59e0b; }
          .insight-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .insight-title {
            font-weight: bold;
            font-size: 16px;
            color: #1f2937;
          }
          .insight-type {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
          }
          .insight-type.breakthrough { background: #f3e8ff; color: #7c3aed; }
          .insight-type.warning { background: #fee2e2; color: #dc2626; }
          .insight-type.opportunity { background: #d1fae5; color: #059669; }
          .insight-type.pattern { background: #dbeafe; color: #2563eb; }
          .insight-type.recommendation { background: #fef3c7; color: #d97706; }
          .insight-content {
            color: #4b5563;
            font-size: 14px;
            line-height: 1.5;
          }
          .tags {
            margin-top: 10px;
          }
          .tag {
            display: inline-block;
            padding: 2px 8px;
            background: #e5e7eb;
            color: #4b5563;
            font-size: 11px;
            border-radius: 3px;
            margin-right: 5px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .table th, .table td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
          }
          .table th {
            background: #f3f4f6;
            font-weight: bold;
            color: #1f2937;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Insights Dashboard Report</h1>
          <div class="subtitle">
            Generated on ${generatedDate} | Date Range: ${dateRange}
          </div>
        </div>

        ${
          analytics
            ? `
        <div class="section">
          <h2>Key Performance Metrics</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total AI Requests</div>
              <div class="metric-value">${analytics.totalRequests.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Avg Response Time</div>
              <div class="metric-value">${analytics.avgResponseTime.toFixed(0)}ms</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Success Rate</div>
              <div class="metric-value">${(analytics.successRate * 100).toFixed(1)}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Tokens Used</div>
              <div class="metric-value">${(analytics.totalTokensUsed / 1000000).toFixed(2)}M</div>
            </div>
          </div>

          <h3>Performance by Analyzer</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Analyzer</th>
                <th>Requests</th>
                <th>Avg Latency</th>
                <th>Error Rate</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.requestsByAnalyzer
                .map(
                  (a) => `
                <tr>
                  <td style="text-transform: capitalize;">${a.analyzer.replace(/_/g, " ")}</td>
                  <td>${a.count}</td>
                  <td>${a.avgLatency.toFixed(0)}ms</td>
                  <td style="color: ${a.errorRate > 0.05 ? "#dc2626" : "#059669"}">
                    ${(a.errorRate * 100).toFixed(2)}%
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          insights.length > 0
            ? `
        <div class="section">
          <h2>Top Insights (${insights.length})</h2>
          ${insights
            .map(
              (insight) => `
            <div class="insight-card ${insight.type}">
              <div class="insight-header">
                <div class="insight-title">${insight.title}</div>
                <span class="insight-type ${insight.type}">${insight.type}</span>
              </div>
              <div class="insight-content">${insight.content}</div>
              <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                Importance: ${insight.importance}/10 | Source: ${insight.sourceType} |
                Date: ${new Date(insight.createdAt).toLocaleDateString()}
              </div>
              ${
                insight.tags.length > 0
                  ? `
                <div class="tags">
                  ${insight.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
                </div>
              `
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
        `
            : ""
        }

        ${
          abTests.length > 0
            ? `
        <div class="section">
          <h2>A/B Test Results</h2>
          ${abTests
            .map(
              (test) => `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
              <h3>${test.experimentName} ${test.isActive ? "(Active)" : ""}</h3>
              ${
                test.description
                  ? `<p style="color: #6b7280; font-size: 14px;">${test.description}</p>`
                  : ""
              }
              <table class="table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Requests</th>
                    <th>Avg Latency</th>
                    <th>Error Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${test.variants
                    .map(
                      (v) => `
                    <tr>
                      <td><strong>${v.variantName}</strong></td>
                      <td>${v.totalRequests}</td>
                      <td>${v.avgLatency.toFixed(0)}ms</td>
                      <td style="color: ${v.errorRate > 0.05 ? "#dc2626" : "#059669"}">
                        ${(v.errorRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
            )
            .join("")}
        </div>
        `
            : ""
        }

        ${
          trends.length > 0
            ? `
        <div class="section">
          <h2>Trend Summary</h2>
          <p style="color: #6b7280; margin-bottom: 15px;">
            Data points collected over the selected time period
          </p>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Requests</th>
                <th>Success Rate</th>
                <th>Avg Response</th>
                <th>Insights</th>
              </tr>
            </thead>
            <tbody>
              ${trends
                .slice(-14)
                .map(
                  (point) => `
                <tr>
                  <td>${new Date(point.date).toLocaleDateString()}</td>
                  <td>${point.totalRequests}</td>
                  <td>${point.successRate.toFixed(1)}%</td>
                  <td>${point.avgResponseTime}ms</td>
                  <td>${point.insights}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        <div class="footer">
          <p>This report was automatically generated by AI Insights Dashboard</p>
          <p>For more detailed analytics, visit your dashboard</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
