"use client";

/**
 * Uploaded Documents List
 * Phase 03: Pro Tier Features
 *
 * Displays user's uploaded PDF documents with status and actions.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DocumentType, DocumentStatus } from "@/lib/documents/types";

interface UploadedDocument {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  pageCount: number | null;
  fileSize: number;
  createdAt: string;
  errorMessage?: string | null;
}

interface UploadedDocumentListProps {
  onDocumentSelect?: (documentId: string) => void;
  className?: string;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pitch_deck: "Pitch Deck",
  financial: "Financial",
  strategy: "Strategy",
  legal: "Legal",
  other: "Other",
};

const STATUS_CONFIG: Record<
  DocumentStatus,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  processing: {
    icon: Clock,
    label: "Processing",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ready: {
    icon: CheckCircle2,
    label: "Ready",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function UploadedDocumentList({
  onDocumentSelect,
  className,
}: UploadedDocumentListProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents/uploaded");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }

      setDocuments(data.documents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();

    // Poll for status updates on processing documents
    const interval = setInterval(() => {
      if (documents.some((doc) => doc.status === "processing")) {
        fetchDocuments();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDocuments, documents]);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const response = await fetch(`/api/documents/uploaded/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete document");
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Uploaded Documents</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {documents.length > 0 && (
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10">
            {error}
          </div>
        )}

        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              {searchQuery
                ? "No documents match your search"
                : "No documents uploaded yet"}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map((doc, index) => {
                const status = STATUS_CONFIG[doc.status];
                const StatusIcon = status.icon;

                return (
                  <motion.li
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                        onDocumentSelect && doc.status === "ready" && "cursor-pointer"
                      )}
                      onClick={() => {
                        if (onDocumentSelect && doc.status === "ready") {
                          onDocumentSelect(doc.id);
                        }
                      }}
                    >
                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{DOCUMENT_TYPE_LABELS[doc.type]}</span>
                          <span>·</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.pageCount && (
                            <>
                              <span>·</span>
                              <span>{doc.pageCount} pages</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                        {doc.status === "failed" && doc.errorMessage && (
                          <p className="text-xs text-destructive mt-1 truncate">
                            {doc.errorMessage}
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant="secondary"
                        className={cn("shrink-0", status.className)}
                      >
                        {doc.status === "processing" ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <StatusIcon className="h-3 w-3 mr-1" />
                        )}
                        {status.label}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {confirmDelete === doc.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(doc.id);
                                setConfirmDelete(null);
                              }}
                              disabled={deletingId === doc.id}
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Delete"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(doc.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}

                        {onDocumentSelect && doc.status === "ready" && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
