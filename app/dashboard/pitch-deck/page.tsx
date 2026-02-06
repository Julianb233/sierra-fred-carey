"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Loader2, AlertCircle, FileText, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewSummary, DeckOverview, SlideAnalysisPanel } from "@/components/pitch";
import type { PitchReview } from "@/lib/fred/pitch/types";

interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  pageCount: number | null;
  status: string;
  createdAt: string;
}

export default function PitchDeckReviewPage() {
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [review, setReview] = useState<PitchReview | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch uploaded pitch deck documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/documents/uploaded?type=pitch_deck");
      if (res.status === 403) {
        setError("Pro tier required to access Pitch Deck Review");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  // When a document is selected, check for existing review
  async function handleDocumentSelect(docId: string) {
    setSelectedDocId(docId);
    setReview(null);
    setSelectedSlideIndex(null);
    setError(null);

    try {
      const res = await fetch(`/api/fred/pitch-review?documentId=${docId}`);
      const data = await res.json();

      if (data.success && data.review) {
        setReview(data.review);
      }
    } catch {
      // No existing review -- that is fine
    }
  }

  // Max number of polling retries when document is still processing
  const MAX_POLL_RETRIES = 15;
  const POLL_INTERVAL_MS = 3000;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to get the selected document object
  const getSelectedDoc = useCallback(() => {
    return documents.find((d) => d.id === selectedDocId) ?? null;
  }, [documents, selectedDocId]);

  // Trigger AI review with automatic retry when document is still processing
  async function runReview() {
    if (!selectedDocId) return;

    // Cancel any previous polling
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setReviewing(true);
      setError(null);

      let retries = 0;

      while (retries < MAX_POLL_RETRIES) {
        if (controller.signal.aborted) return;

        const res = await fetch("/api/fred/pitch-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: selectedDocId }),
          signal: controller.signal,
        });

        const data = await res.json();

        // Success -- review is ready
        if (res.ok && data.success && data.review) {
          setReview(data.review);
          // Refresh documents list to get updated statuses
          fetchDocuments();
          return;
        }

        // 202 means the document is still processing -- wait and retry
        if (res.status === 202 && data.code === "DOCUMENT_PROCESSING") {
          retries++;
          if (retries >= MAX_POLL_RETRIES) {
            throw new Error(
              "Document is taking longer than expected to process. Please try again in a few moments."
            );
          }
          // Wait before retrying
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, POLL_INTERVAL_MS);
            controller.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
          continue;
        }

        // Any other error
        throw new Error(data.error || "Failed to review pitch deck");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to review pitch deck");
    } finally {
      setReviewing(false);
    }
  }

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6a1a]" />
      </div>
    );
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Pitch Deck Review
                </h1>
                <Badge
                  style={{ backgroundColor: "#ff6a1a" }}
                  className="text-white"
                >
                  Pro
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                AI-powered slide-by-slide analysis of your pitch deck
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Document selector */}
        <Card className="mb-8">
          <CardContent className="py-6">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Pitch Decks Found
                </h3>
                <p className="text-gray-500 mb-4">
                  Upload a pitch deck first to get AI-powered analysis.
                </p>
                <Link href="/dashboard">
                  <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:max-w-md">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Select a pitch deck to review
                  </label>
                  <Select
                    value={selectedDocId || undefined}
                    onValueChange={handleDocumentSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name}
                          {doc.pageCount ? ` (${doc.pageCount} pages)` : ""}
                          {doc.status === "processing" ? " - Processing..." : ""}
                          {doc.status === "failed" ? " - Failed" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDocId && !review && !reviewing && (() => {
                  const doc = getSelectedDoc();
                  if (doc?.status === "failed") {
                    return (
                      <div className="flex items-center gap-2 mt-4 sm:mt-6 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Processing failed. Please re-upload this document.</span>
                      </div>
                    );
                  }
                  if (doc?.status === "processing") {
                    return (
                      <div className="flex items-center gap-2 mt-4 sm:mt-6">
                        <Button
                          onClick={runReview}
                          className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Review Deck (Processing...)
                        </Button>
                        <span className="text-xs text-gray-500">
                          Will wait for processing to finish
                        </span>
                      </div>
                    );
                  }
                  return (
                    <Button
                      onClick={runReview}
                      className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white mt-4 sm:mt-6"
                    >
                      Review Deck
                    </Button>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviewing state */}
        {reviewing && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#ff6a1a] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {getSelectedDoc()?.status === "processing"
                  ? "Waiting for document processing to complete..."
                  : "FRED is analyzing your deck slide by slide..."}
              </h3>
              <p className="text-gray-500">
                {getSelectedDoc()?.status === "processing"
                  ? "Your PDF is still being processed. The review will start automatically once ready."
                  : "This may take a minute. Each slide is being classified and evaluated."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Review display */}
        {review && !reviewing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <ReviewSummary review={review} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Slide Overview
                </h3>
                <DeckOverview
                  slides={review.slides}
                  selectedIndex={selectedSlideIndex}
                  onSelectSlide={setSelectedSlideIndex}
                />
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-1">
              {selectedSlideIndex !== null && review.slides[selectedSlideIndex] ? (
                <div className="sticky top-8">
                  <SlideAnalysisPanel
                    slide={review.slides[selectedSlideIndex]}
                    onClose={() => setSelectedSlideIndex(null)}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-400">
                      Click a slide above to see detailed analysis
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
