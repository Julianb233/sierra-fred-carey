"use client";

/**
 * Shared Document View Component
 * Phase 33-02: Collaboration & Sharing
 *
 * Generic viewer for shared resources. Renders read-only content
 * with Sahara branding. Print-friendly.
 */

import { FileText, BarChart3, Target, AlertTriangle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

interface SharedDocumentViewProps {
  /** The shared resource data */
  resource: Record<string, unknown>;
  /** The type of resource being viewed */
  resourceType: string;
  /** Optional sharer info */
  sharedBy?: string;
}

interface ResourceTypeConfig {
  label: string;
  icon: typeof FileText;
  color: string;
}

const RESOURCE_TYPE_MAP: Record<string, ResourceTypeConfig> = {
  strategy_document: {
    label: "Strategy Document",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
  },
  pitch_review: {
    label: "Pitch Review",
    icon: Target,
    color: "text-purple-600 dark:text-purple-400",
  },
  investor_readiness: {
    label: "Investor Readiness Report",
    icon: BarChart3,
    color: "text-green-600 dark:text-green-400",
  },
  red_flags_report: {
    label: "Red Flags Report",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
  },
};

// ============================================================================
// Sub-components
// ============================================================================

function SaharaHeader({ resourceType, sharedBy }: { resourceType: string; sharedBy?: string }) {
  const config = RESOURCE_TYPE_MAP[resourceType] || RESOURCE_TYPE_MAP.strategy_document;
  const Icon = config.icon;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 print:border-gray-300">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sahara branding */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-lg">
              Sahara
            </span>
          </div>

          <span className="text-gray-300 dark:text-gray-600">|</span>

          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {config.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          {sharedBy && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Shared by {sharedBy}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
    </header>
  );
}

function SaharaFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 print:border-gray-300 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">S</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Powered by Sahara &mdash; AI-Powered Founder Operating System
        </span>
      </div>
    </footer>
  );
}

// ============================================================================
// Resource-specific renderers
// ============================================================================

function StrategyDocumentView({ resource }: { resource: Record<string, unknown> }) {
  const title = (resource.title as string) || (resource.doc_type as string) || "Strategy Document";
  const content = resource.content as string | undefined;
  const sections = resource.sections as Array<{ title: string; content: string }> | undefined;
  const createdAt = resource.created_at as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>
        {createdAt && (
          <p className="text-sm text-gray-500">
            Generated on {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {content && (
        <Card>
          <CardContent className="pt-6">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          </CardContent>
        </Card>
      )}

      {sections && sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((section, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {section.content}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PitchReviewView({ resource }: { resource: Record<string, unknown> }) {
  const scores = resource.scores as Record<string, number> | undefined;
  const overallScore = (resource.overall_score as number) ?? (resource.overall as number);
  const feedback = resource.feedback as string | undefined;
  const strengths = resource.strengths as string[] | undefined;
  const weaknesses = resource.weaknesses as string[] | undefined;
  const recommendations = resource.recommendations as string[] | undefined;
  const createdAt = resource.created_at as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pitch Deck Review
        </h1>
        {createdAt && (
          <p className="text-sm text-gray-500">
            Reviewed on {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Overall score */}
      {overallScore !== undefined && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${
                overallScore >= 70 ? "text-green-600" : overallScore >= 50 ? "text-yellow-600" : "text-red-600"
              }`}>
                {overallScore}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Overall Score</p>
                <p className="text-sm text-gray-500">out of 100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category scores */}
      {scores && Object.keys(scores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(scores).map(([category, score]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {category.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{score}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {feedback && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {feedback}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strengths && strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {weaknesses && weaknesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-red-500 mt-0.5">-</span>
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {recommendations.map((r, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                  {r}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvestorReadinessView({ resource }: { resource: Record<string, unknown> }) {
  const overall = resource.overall as number | undefined;
  const categories = resource.categories as Record<string, { score: number; label?: string }> | undefined;
  const strengths = resource.strengths as string[] | undefined;
  const recommendations = resource.recommendations as Array<{ text: string; priority?: string }> | string[] | undefined;
  const createdAt = resource.created_at as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Investor Readiness Report
        </h1>
        {createdAt && (
          <p className="text-sm text-gray-500">
            Assessed on {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Overall score */}
      {overall !== undefined && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-bold ${
                overall >= 70 ? "text-green-600" : overall >= 50 ? "text-yellow-600" : "text-red-600"
              }`}>
                {overall}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Investor Readiness Score
                </p>
                <p className="text-sm text-gray-500">
                  {overall >= 70
                    ? "Strong readiness -- consider approaching investors"
                    : overall >= 50
                    ? "Moderate readiness -- address key gaps first"
                    : "Early stage -- focus on fundamentals"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category scores */}
      {categories && Object.keys(categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categories).map(([key, cat]) => {
                const score = typeof cat === "number" ? cat : cat.score;
                const label = typeof cat === "number" ? key : (cat.label || key);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {label.replace(/_/g, " ")}
                      </span>
                      <span className={`text-sm font-bold ${
                        score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {score}/100
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {strengths.map((s, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendations.map((rec, i) => {
                const text = typeof rec === "string" ? rec : rec.text;
                const priority = typeof rec === "string" ? undefined : rec.priority;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a] flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
                      {priority && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {priority}
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RedFlagsView({ resource }: { resource: Record<string, unknown> }) {
  const severity = resource.severity as string | undefined;
  const category = resource.category as string | undefined;
  const description = resource.description as string | undefined;
  const recommendation = resource.recommendation as string | undefined;
  const createdAt = resource.created_at as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Red Flag Report
        </h1>
        {createdAt && (
          <p className="text-sm text-gray-500">
            Detected on {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {severity && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Severity:</span>
              <Badge
                variant="secondary"
                className={
                  severity === "critical"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : severity === "high"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }
              >
                {severity}
              </Badge>
            </div>
          )}

          {category && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Category:</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {category.replace(/_/g, " ")}
              </span>
            </div>
          )}

          {description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          {recommendation && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Recommendation</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {recommendation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GenericResourceView({ resource }: { resource: Record<string, unknown> }) {
  // Fallback: render all safe fields
  const safeEntries = Object.entries(resource).filter(
    ([key]) => !["id", "created_at", "updated_at"].includes(key)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Shared Resource
      </h1>
      <Card>
        <CardContent className="pt-6">
          <dl className="space-y-4">
            {safeEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm font-medium text-gray-500 capitalize">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                  {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "")}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SharedDocumentView({
  resource,
  resourceType,
  sharedBy,
}: SharedDocumentViewProps) {
  const renderContent = () => {
    switch (resourceType) {
      case "strategy_document":
        return <StrategyDocumentView resource={resource} />;
      case "pitch_review":
        return <PitchReviewView resource={resource} />;
      case "investor_readiness":
        return <InvestorReadinessView resource={resource} />;
      case "red_flags_report":
        return <RedFlagsView resource={resource} />;
      default:
        return <GenericResourceView resource={resource} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 print:bg-white">
      <SaharaHeader resourceType={resourceType} sharedBy={sharedBy} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {renderContent()}
      </main>

      <SaharaFooter />
    </div>
  );
}
