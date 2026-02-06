"use client";

import { Eye, Download, Trash2, FileText, Clock } from "lucide-react";
import { DOC_TYPE_LABELS } from "@/lib/fred/strategy/types";
import type { GeneratedDocument, StrategyDocType } from "@/lib/fred/strategy/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DocumentListProps {
  documents: GeneratedDocument[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago").
 */
function formatTimeAgo(date: Date | string | undefined): string {
  if (!date) return "Unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7)
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? "s" : ""} ago`;
  return d.toLocaleDateString();
}

/**
 * Map document types to badge colors.
 */
const TYPE_BADGE_COLORS: Record<StrategyDocType, string> = {
  executive_summary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  market_analysis: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "30_60_90_plan": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  competitive_analysis: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  gtm_plan: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export function DocumentList({
  documents,
  onView,
  onDelete,
  onExport,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No strategy documents yet.</p>
          <p className="text-sm text-gray-400">
            Choose a type above to generate your first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const docType = doc.type as StrategyDocType;
        const badgeColor = TYPE_BADGE_COLORS[docType] || "bg-gray-100 text-gray-700";
        const label = DOC_TYPE_LABELS[docType] || doc.type;

        return (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {doc.metadata.wordCount.toLocaleString()} words
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(doc.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(doc.id!)}
                    title="View document"
                    className="h-8 w-8 text-gray-500 hover:text-[#ff6a1a]"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onExport(doc.id!)}
                    title="Export as PDF"
                    className="h-8 w-8 text-gray-500 hover:text-[#ff6a1a]"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm("Delete this document?")) {
                        onDelete(doc.id!);
                      }
                    }}
                    title="Delete document"
                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
