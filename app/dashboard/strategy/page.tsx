"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DocumentTypeSelector,
  GenerationProgress,
  DocumentList,
  DocumentPreview,
} from "@/components/strategy";
import type {
  StrategyDocType,
  GeneratedDocument,
} from "@/lib/fred/strategy/types";
import { DOC_TYPE_LABELS } from "@/lib/fred/strategy/types";
import { TEMPLATES } from "@/lib/fred/strategy/templates";

export default function StrategyPage() {
  // Document list state
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [selectedType, setSelectedType] = useState<StrategyDocType | null>(
    null
  );
  const [generating, setGenerating] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Preview state
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(
    null
  );

  // Form state
  const [startupName, setStartupName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [description, setDescription] = useState("");

  // Progress interval ref
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/fred/strategy");
      const data = await response.json();

      if (response.status === 403) {
        setError("Pro tier required for Strategy Documents");
        return;
      }

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        setError(data.error || "Failed to load documents");
      }
    } catch {
      setError("Failed to load strategy documents");
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!selectedType || !startupName.trim()) return;

    setGenerating(true);
    setCurrentSection(0);
    setError(null);

    // Get section names for progress display
    const template = TEMPLATES[selectedType];
    const sectionCount = template?.sections.length || 5;

    // Simulate section progress (~4s per section)
    progressIntervalRef.current = setInterval(() => {
      setCurrentSection((prev) => {
        if (prev < sectionCount - 1) return prev + 1;
        return prev;
      });
    }, 4000);

    try {
      const response = await fetch("/api/fred/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          startupName: startupName.trim(),
          industry: industry || undefined,
          stage: stage || undefined,
          description: description || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.document) {
        // Set final progress
        setCurrentSection(sectionCount);

        // Add document to list and show preview
        setDocuments((prev) => [data.document, ...prev]);
        setSelectedDoc(data.document);

        // Reset form
        setSelectedType(null);
        setStartupName("");
        setIndustry("");
        setStage("");
        setDescription("");
      } else {
        setError(data.error || "Failed to generate document");
      }
    } catch {
      setError("Failed to generate strategy document");
    } finally {
      setGenerating(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [selectedType, startupName, industry, stage, description]);

  async function handleDelete(docId: string) {
    try {
      const response = await fetch(`/api/fred/strategy/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }
      } else {
        setError("Failed to delete document");
      }
    } catch {
      setError("Failed to delete document");
    }
  }

  function handleExport(docId: string) {
    window.open(`/api/fred/strategy/${docId}/export`, "_blank");
  }

  function handleView(docId: string) {
    const doc = documents.find((d) => d.id === docId);
    if (doc) setSelectedDoc(doc);
  }

  // Get section names for the selected template
  const sectionNames = selectedType
    ? TEMPLATES[selectedType]?.sections.map((s) => s.title) || []
    : [];

  // Loading state
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
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Strategy Documents
                </h1>
                <span className="px-3 py-0.5 bg-[#ff6a1a] text-white text-xs font-semibold rounded-full">
                  Pro
                </span>
              </div>
              <p className="text-sm text-gray-500">
                AI-generated strategic documents tailored to your startup
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Document Preview (when viewing) */}
        {selectedDoc && (
          <DocumentPreview
            document={selectedDoc}
            onExport={() => handleExport(selectedDoc.id!)}
            onClose={() => setSelectedDoc(null)}
          />
        )}

        {/* Section 1: Generate New Document */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type selector */}
            <DocumentTypeSelector
              onSelect={setSelectedType}
              selectedType={selectedType}
              disabled={generating}
            />

            {/* Form (shown when type is selected and not generating) */}
            {selectedType && !generating && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Startup Name *
                    </label>
                    <Input
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      placeholder="Your startup name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Industry
                    </label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g., SaaS, FinTech, HealthTech"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ff6a1a] focus:border-transparent"
                  >
                    <option value="">Select stage</option>
                    <option value="idea">Idea</option>
                    <option value="pre-seed">Pre-Seed</option>
                    <option value="seed">Seed</option>
                    <option value="series-a">Series A</option>
                    <option value="series-b+">Series B+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Brief Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does your startup do?"
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!startupName.trim()}
                  className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                  size="lg"
                >
                  Generate {DOC_TYPE_LABELS[selectedType]}
                </Button>
              </div>
            )}

            {/* Generation progress (shown while generating) */}
            {generating && selectedType && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <GenerationProgress
                  sectionNames={sectionNames}
                  currentSection={currentSection}
                  isGenerating={generating}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Your Documents */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Documents
          </h2>
          <DocumentList
            documents={documents}
            onView={handleView}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        </div>
      </main>
    </div>
  );
}
