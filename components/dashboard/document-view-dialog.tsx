"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import type { DocumentItem } from "@/components/dashboard/document-card";

// ============================================================================
// Component
// ============================================================================

interface DocumentViewDialogProps {
  doc: DocumentItem | null;
  onClose: () => void;
}

export function DocumentViewDialog({ doc, onClose }: DocumentViewDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch document details when doc changes
  useEffect(() => {
    if (!doc) {
      setContent(null);
      return;
    }

    // If the document has a fileUrl already, use it directly for PDFs
    if (doc.fileUrl && doc.fileType?.includes("pdf")) {
      setContent(doc.fileUrl);
      return;
    }

    // Otherwise fetch from the review endpoint to get content
    setLoading(true);
    fetch(`/api/document-repository/${doc.id}/review`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.content) {
          setContent(data.content);
        } else {
          setContent(null);
        }
      })
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [doc]);

  if (!doc) return null;

  const isPdf = doc.fileType?.includes("pdf") && doc.fileUrl;

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{doc.title}</DialogTitle>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-auto min-h-0 rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
            </div>
          ) : isPdf && doc.fileUrl ? (
            <iframe
              src={doc.fileUrl}
              className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700"
              title={doc.title}
            />
          ) : content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-sm">Unable to load document content.</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(doc.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="flex gap-2">
            {isPdf && doc.fileUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(doc.fileUrl!, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                New Tab
              </Button>
            )}
            <Link href={`/chat?documentId=${doc.id}`}>
              <Button
                size="sm"
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Review with Fred
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
