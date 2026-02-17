"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { DocumentType, DocumentStatus } from "@/lib/documents/types";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  fileSize: number;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListProps {
  onDocumentSelect?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  refreshTrigger?: number;
  className?: string;
}

const typeLabels: Record<DocumentType, string> = {
  pitch_deck: "Pitch Deck",
  financial: "Financial",
  strategy: "Strategy",
  legal: "Legal",
  other: "Other",
};

const typeColors: Record<DocumentType, string> = {
  pitch_deck: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  financial: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  strategy: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  legal: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function DocumentList({
  onDocumentSelect,
  onDocumentDelete,
  refreshTrigger,
  className,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/documents/uploaded");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }

      setDocuments(data.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = documents.filter((d) => d.status === "processing");
    if (processingDocs.length === 0) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/uploaded/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== deleteId));
      onDocumentDelete?.(deleteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchDocuments} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded",
              viewMode === "grid"
                ? "bg-gray-100 dark:bg-gray-800"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded",
              viewMode === "list"
                ? "bg-gray-100 dark:bg-gray-800"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      <AnimatePresence mode="popLayout">
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          )}
        >
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-[#ff6a1a]/50 transition-colors",
                viewMode === "list" && "flex items-center"
              )}
            >
              {/* Card Content */}
              <div
                className={cn(
                  "flex-1 p-4 cursor-pointer",
                  viewMode === "list" && "flex items-center gap-4"
                )}
                onClick={() => onDocumentSelect?.(doc)}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "p-2 rounded-lg mb-3",
                    typeColors[doc.type],
                    viewMode === "list" && "mb-0"
                  )}
                >
                  <FileText className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className={cn("flex-1", viewMode === "list" && "min-w-0")}>
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <span className={cn("px-1.5 py-0.5 rounded text-xs", typeColors[doc.type])}>
                      {typeLabels[doc.type]}
                    </span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                    {doc.pageCount && <span>{doc.pageCount} pages</span>}
                  </div>
                </div>

                {/* Status */}
                <div
                  className={cn(
                    "flex items-center gap-1 mt-3 text-sm",
                    viewMode === "list" && "mt-0"
                  )}
                >
                  {doc.status === "processing" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#ff6a1a]" />
                      <span className="text-[#ff6a1a]">Processing...</span>
                    </>
                  )}
                  {doc.status === "ready" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Ready</span>
                    </>
                  )}
                  {doc.status === "failed" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-500">Failed</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div
                className={cn(
                  "flex items-center gap-1 p-2 border-t border-gray-100 dark:border-gray-800",
                  viewMode === "list" && "border-t-0 border-l"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDocumentSelect?.(doc)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setDeleteId(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
