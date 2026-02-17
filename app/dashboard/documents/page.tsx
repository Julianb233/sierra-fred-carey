"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Search, FileText, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import {
  DocumentCard,
  type DocumentItem,
  type DocumentFolder,
} from "@/components/dashboard/document-card";
import { DocumentUpload } from "@/components/dashboard/document-upload";
import { DocumentViewDialog } from "@/components/dashboard/document-view-dialog";

// ============================================================================
// Folder Config
// ============================================================================

const FOLDERS: {
  key: DocumentFolder;
  label: string;
  emptyMessage: string;
  emptyCta?: { text: string; href: string };
}[] = [
  {
    key: "decks",
    label: "Decks",
    emptyMessage:
      "No pitch decks yet. Upload your first deck to get Fred's feedback.",
  },
  {
    key: "strategy",
    label: "Strategy Docs",
    emptyMessage:
      "No strategy docs yet. Generate one from the Strategy page or upload your own.",
    emptyCta: { text: "Generate a Strategy Doc", href: "/dashboard/strategy" },
  },
  {
    key: "reports",
    label: "Reports",
    emptyMessage:
      "No reports yet. Generate a financial model or investor memo to get started.",
    emptyCta: { text: "Generate a Report", href: "/dashboard/strategy" },
  },
  {
    key: "uploads",
    label: "Uploaded Files",
    emptyMessage:
      "No uploaded files yet. Drag and drop a PDF to upload it for review.",
  },
];

// ============================================================================
// Page
// ============================================================================

export default function DocumentsPage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div data-testid="documents-page">
      <FeatureLock
        requiredTier={UserTier.PRO}
        currentTier={tier}
        featureName="Document Repository"
        description="Organize and review all your documents with FRED. Available on Pro tier."
      >
        <DocumentsContent />
      </FeatureLock>
    </div>
  );
}

// ============================================================================
// Content
// ============================================================================

function DocumentsContent() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DocumentFolder>("decks");
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);

  // Fetch all documents from the dashboard documents API
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/dashboard/documents");
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Failed to load documents");
        return;
      }

      // Normalize nested response into flat DocumentItem[]
      const data = json.data;
      const normalize = (
        items: Record<string, unknown>[],
        folder: DocumentFolder
      ): DocumentItem[] =>
        items.map((d) => ({
          ...(d as unknown as DocumentItem),
          folder,
        }));

      const allDocs: DocumentItem[] = [
        ...normalize(data.decks || [], "decks"),
        ...normalize(data.strategyDocs || [], "strategy"),
        ...normalize(data.reports || [], "reports"),
        ...normalize(data.uploadedFiles || [], "uploads"),
      ];

      setDocuments(allDocs);
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle View action — open inline dialog
  const handleView = useCallback((doc: DocumentItem) => {
    setViewDoc(doc);
  }, []);

  // Handle Delete action
  const handleDelete = useCallback(
    async (doc: DocumentItem) => {
      try {
        setError(null);
        const res = await fetch(`/api/document-repository/${doc.id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          if (viewDoc?.id === doc.id) setViewDoc(null);
        } else {
          setError("Failed to delete document");
        }
      } catch {
        setError("Failed to delete document");
      }
    },
    [viewDoc]
  );

  // Filter documents by active folder and search query
  const filteredDocuments = useMemo(() => {
    let filtered = (documents ?? []).filter((d) => d.folder === activeTab);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        d.name.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [documents, activeTab, searchQuery]);

  // Folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<DocumentFolder, number> = {
      decks: 0,
      strategy: 0,
      reports: 0,
      uploads: 0,
    };
    for (const doc of documents ?? []) {
      counts[doc.folder]++;
    }
    return counts;
  }, [documents]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Documents
            </h1>
            <span className="px-3 py-0.5 bg-[#ff6a1a] text-white text-xs font-semibold rounded-full">
              Pro
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All your pitch decks, strategy documents, reports, and uploaded
            files in one place.
          </p>
        </div>
        <Link href="/dashboard/strategy">
          <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            <FileText className="h-4 w-4 mr-2" />
            Generate Doc
          </Button>
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Upload zone */}
      <DocumentUpload onUploadComplete={fetchDocuments} />

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Folder tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as DocumentFolder)}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {FOLDERS.map((folder) => (
            <TabsTrigger
              key={folder.key}
              value={folder.key}
              className="gap-1"
            >
              {folder.label}
              {folderCounts[folder.key] > 0 && (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                  ({folderCounts[folder.key]})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {FOLDERS.map((folder) => (
          <TabsContent key={folder.key} value={folder.key}>
            <div className="mt-4">
              {filteredDocuments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onView={handleView}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  folder={folder.key}
                  message={folder.emptyMessage}
                  cta={folder.emptyCta}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Document View Dialog */}
      <DocumentViewDialog doc={viewDoc} onClose={() => setViewDoc(null)} />
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({
  folder,
  message,
  cta,
}: {
  folder: DocumentFolder;
  message: string;
  cta?: { text: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-[#ff6a1a]/10 p-4 mb-4">
        <FolderOpen className="h-8 w-8 text-[#ff6a1a]" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No documents yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
        {message}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors"
        >
          <FileText className="h-4 w-4" />
          {cta.text}
        </Link>
      )}
    </div>
  );
}
