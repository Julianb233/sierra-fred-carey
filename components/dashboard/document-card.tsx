"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileSpreadsheet,
  FileBarChart,
  Upload,
  Eye,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types — aligned with /api/dashboard/documents response
// ============================================================================

export type DocumentFolder = "decks" | "strategy" | "reports" | "uploads";

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  folder: DocumentFolder;
  source: string;
  status: string;
  createdAt: string;
  pageCount: number | null;
  fileUrl?: string | null;
  updatedAt?: string;
  canReviewWithFred?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const FOLDER_ICONS: Record<DocumentFolder, React.ReactNode> = {
  decks: <FileBarChart className="h-5 w-5 text-blue-500" />,
  strategy: <FileSpreadsheet className="h-5 w-5 text-emerald-500" />,
  reports: <FileText className="h-5 w-5 text-purple-500" />,
  uploads: <Upload className="h-5 w-5 text-gray-500 dark:text-gray-400" />,
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================================
// Component
// ============================================================================

interface DocumentCardProps {
  document: DocumentItem;
  onView: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

export function DocumentCard({
  document,
  onView,
  onDelete,
}: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false);
  const icon = FOLDER_ICONS[document.folder] || FOLDER_ICONS.uploads;

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(document);
    setDeleting(false);
  };

  return (
    <Card className="transition-all hover:shadow-md group">
      <CardContent className="p-4 space-y-3">
        {/* Header: icon + title */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {document.name}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(document.createdAt)}
              </span>
              {document.status === "processing" && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 px-1.5"
                >
                  Processing
                </Badge>
              )}
              {document.pageCount != null && document.pageCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {document.pageCount} pages
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(document)}
            className="flex-1 text-xs h-8"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Link href={`/chat?documentId=${document.id}`} className="flex-1">
            <Button
              size="sm"
              className={cn(
                "w-full text-xs h-8",
                "bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              )}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Review with Fred
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 shrink-0"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
