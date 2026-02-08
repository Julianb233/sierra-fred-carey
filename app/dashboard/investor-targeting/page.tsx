"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Target,
  Users,
  Loader2,
  AlertCircle,
  FileText,
  ChevronRight,
  Sparkles,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

// ============================================================================
// Types
// ============================================================================

interface InvestorList {
  id: string;
  name: string;
  source: string;
  investor_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Main Page
// ============================================================================

export default function InvestorTargetingPage() {
  const { tier, isLoading: isTierLoading } = useUserTier();

  if (isTierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
  }

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={tier}
      featureName="Investor Targeting"
      description="Upload investor lists and get AI-powered match recommendations."
    >
      <InvestorTargetingContent />
    </FeatureLock>
  );
}

// ============================================================================
// Content Component
// ============================================================================

function InvestorTargetingContent() {
  const [lists, setLists] = useState<InvestorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // File input ref
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [listName, setListName] = useState("");

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/investors/match?_lists=true");

      // If we get matches, we also need lists -- use a simple fetch to our supabase
      // For simplicity, we'll use the upload endpoint to list (or create a separate endpoint later)
      // Actually, let's fetch lists from the match GET which returns investor data
      // For now, fetch lists by querying the upload endpoint
      const listsRes = await fetch("/api/investors/upload");

      if (listsRes.ok) {
        const data = await listsRes.json();
        setLists(data.lists || []);
      } else {
        // If endpoint doesn't support GET, fetch is still okay
        setLists([]);
      }
    } catch {
      // Lists may not be available yet
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please select a CSV file to upload");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadErrors([]);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", listName || selectedFile.name.replace(/\.csv$/i, ""));

      const res = await fetch("/api/investors/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        if (data.errors) setUploadErrors(data.errors);
        return;
      }

      setSuccessMessage(
        `Successfully uploaded ${data.investorCount} investors${data.errors?.length ? ` (${data.errors.length} rows had issues)` : ""}`
      );
      if (data.errors) setUploadErrors(data.errors);

      // Reset form
      setSelectedFile(null);
      setListName("");

      // Refresh lists
      await fetchLists();
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function handleRunMatching(listId: string) {
    try {
      setMatching(listId);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/investors/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Matching failed");
        return;
      }

      trackEvent(ANALYTICS_EVENTS.FEATURES.INVESTOR_READINESS_USED, { featureName: "investor_targeting" });
      setSuccessMessage(
        `AI matching complete! Found ${data.count} investor matches. View results below.`
      );
    } catch {
      setError("Failed to run investor matching");
    } finally {
      setMatching(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Investor Targeting
              </h1>
              <p className="text-sm text-gray-500">
                Upload lists and get AI-powered investor recommendations
              </p>
            </div>
          </div>

          <Link href="/dashboard/investor-targeting/matches">
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" />
              View Matches
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Status messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-700 dark:text-red-400">{error}</p>
              {uploadErrors.length > 0 && (
                <ul className="mt-2 text-sm text-red-600 dark:text-red-500 space-y-1">
                  {uploadErrors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {uploadErrors.length > 5 && (
                    <li>...and {uploadErrors.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-green-700 dark:text-green-400">{successMessage}</p>
          </motion.div>
        )}

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#ff6a1a]" />
              Upload Investor List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload a CSV file with investor data. The parser supports common
              column names like &quot;Name&quot;, &quot;Firm&quot;, &quot;Stage&quot;, &quot;Sector&quot;,
              &quot;Check Size&quot;, etc.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  List Name (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  placeholder="e.g., Y Combinator Alumni, Angel List"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#ff6a1a]/10 file:text-[#ff6a1a] file:text-sm file:font-medium"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="bg-[#ff6a1a] hover:bg-[#ea580c]"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Upload CSV"}
              </Button>

              {selectedFile && (
                <span className="text-sm text-gray-500">
                  <FileText className="h-4 w-4 inline mr-1" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lists Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#ff6a1a]" />
            Your Investor Lists
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : lists.length === 0 ? (
            /* Empty State */
            <Card>
              <CardContent className="py-16 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center"
                >
                  <Target className="h-8 w-8 text-[#ff6a1a]" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Upload Your First Investor List
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-4">
                  Get started by uploading a CSV file with investor contacts.
                  Our AI will analyze and score each investor for fit with your
                  startup.
                </p>
              </CardContent>
            </Card>
          ) : (
            /* List Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {list.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {list.investor_count} investors
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {new Date(list.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            list.source === "upload"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : list.source === "admin"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {list.source}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleRunMatching(list.id)}
                          disabled={matching === list.id}
                          className="bg-[#ff6a1a] hover:bg-[#ea580c] flex-1"
                        >
                          {matching === list.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {matching === list.id ? "Matching..." : "Run Matching"}
                        </Button>
                        <Link
                          href={`/dashboard/investor-targeting/matches?listId=${list.id}`}
                        >
                          <Button size="sm" variant="outline" className="gap-1">
                            View
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
