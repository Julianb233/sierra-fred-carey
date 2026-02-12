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

  // Fetch content when doc changes
  useEffect(() => {
    if (!doc) {
      setContent(null);
      return;
    }

    if (doc.source === "uploaded") {
      // For uploaded docs, fetch the file URL from the detail endpoint
      setLoading(true);
      fetch(`/api/documents/uploaded/${doc.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.document?.fileUrl) {
            setContent(data.document.fileUrl);
          } else {
            setContent(null);
          }
        })
        .catch(() => setContent(null))
        .finally(() => setLoading(false));
    } else {
      // For generated docs, fetch full content
      setLoading(true);
      fetch(`/api/documents/${doc.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.document?.content) {
            setContent(data.document.content);
          } else {
            setContent(null);
          }
        })
        .catch(() => setContent(null))
        .finally(() => setLoading(false));
    }
  }, [doc]);

  if (!doc) return null;

  const isUploadedPdf = doc.source === "uploaded" && content;

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{doc.name}</DialogTitle>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-auto min-h-0 rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
            </div>
          ) : isUploadedPdf ? (
            <iframe
              src={content}
              className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700"
              title={doc.name}
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
            {isUploadedPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(content, "_blank")}
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
