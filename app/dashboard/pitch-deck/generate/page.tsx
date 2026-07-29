"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Loader2, Sparkles, Download, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  SLIDE_TYPES,
  SLIDE_LABELS,
  SLIDE_DESCRIPTIONS,
  type SlideType,
} from "@/lib/fred/pitch/types";

// Slide sections for the generator (excluding appendix/unknown)
const GENERATOR_SLIDES: SlideType[] = SLIDE_TYPES.filter(
  (t) => t !== "appendix"
);

interface GeneratedSlide {
  type: SlideType;
  title: string;
  bullets: string[];
  speakerNotes: string;
}

interface DeckDraft {
  companyName: string;
  tagline: string;
  slides: GeneratedSlide[];
  investorReadinessScore: number | null;
  generatedAt: string;
}

export default function PitchDeckGeneratePage() {
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
      requiredTier={UserTier.PRO}
      currentTier={tier}
      featureName="Pitch Deck Generator"
      description="Generate an investor-grade pitch deck from your startup profile."
    >
      <PitchDeckGeneratorContent />
    </FeatureLock>
  );
}

function PitchDeckGeneratorContent() {
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<DeckDraft | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/fred/pitch-deck/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalContext: context.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate pitch deck");
      }

      const data = await res.json();
      setDraft(data.deck);
      setSelectedSlide(0);
      trackEvent(ANALYTICS_EVENTS.FEATURES.PITCH_DECK_UPLOADED, {
        featureName: "pitch_deck_generator",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate pitch deck"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [context]);

  const handleExport = useCallback(async () => {
    if (!draft) return;

    try {
      const res = await fetch("/api/fred/pitch-deck/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck: draft }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft.companyName.replace(/\s+/g, "-").toLowerCase()}-pitch-deck.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export. Try again.");
    }
  }, [draft]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/pitch-deck">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Pitch Deck Generator
                </h1>
                <Badge
                  style={{ backgroundColor: "#ff6a1a" }}
                  className="text-white"
                >
                  Pro
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                Generate an investor-grade pitch deck from your startup profile
              </p>
            </div>
          </div>

          {draft && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(null);
                  setSelectedSlide(null);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              <Button
                size="sm"
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!draft && !isGenerating && (
          /* Input form */
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#ff6a1a]" />
                  Generate Your Pitch Deck
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    FRED will pull from your founder profile, startup info, and
                    conversation history to generate a complete investor-grade
                    pitch deck with all {GENERATOR_SLIDES.length} key sections.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {GENERATOR_SLIDES.map((type) => (
                      <div
                        key={type}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#ff6a1a]" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {SLIDE_LABELS[type]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deck-context"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Additional context (optional)
                  </label>
                  <Textarea
                    id="deck-context"
                    placeholder="Any specific details, recent traction, competitive advantages, or fundraising goals you want to highlight..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button
                  size="lg"
                  onClick={handleGenerate}
                  className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Pitch Deck
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generating state */}
        {isGenerating && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#ff6a1a] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                FRED is crafting your pitch deck...
              </h3>
              <p className="text-gray-500">
                Analyzing your profile, market data, and startup context to
                build each slide. This may take a minute.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Generated deck preview */}
        {draft && !isGenerating && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Slide list */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Deck Outline</span>
                    {draft.investorReadinessScore !== null && (
                      <Badge
                        variant="secondary"
                        className="bg-[#ff6a1a]/10 text-[#ff6a1a]"
                      >
                        Score: {draft.investorReadinessScore}/100
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {draft.slides.map((slide, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSlide(index)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedSlide === index
                          ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="truncate">{slide.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-8">
                        {SLIDE_LABELS[slide.type]}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Slide preview */}
            <div className="lg:col-span-2">
              {selectedSlide !== null && draft.slides[selectedSlide] ? (
                <SlidePreview
                  slide={draft.slides[selectedSlide]}
                  slideNumber={selectedSlide + 1}
                  companyName={draft.companyName}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Eye className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">
                      Select a slide to preview its content
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

function SlidePreview({
  slide,
  slideNumber,
  companyName,
}: {
  slide: GeneratedSlide;
  slideNumber: number;
  companyName: string;
}) {
  return (
    <div className="space-y-4">
      {/* Slide mock */}
      <Card className="overflow-hidden">
        <div className="aspect-[16/9] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative p-8 sm:p-12 flex flex-col justify-center">
          {/* Slide number badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-white/10 text-white/60">
              Slide {slideNumber}
            </Badge>
          </div>

          {/* Brand accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff6a1a] via-orange-400 to-transparent" />

          {/* Content */}
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-wider text-[#ff6a1a] uppercase">
              {SLIDE_LABELS[slide.type]}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {slide.title}
            </h2>
            <ul className="space-y-2 mt-4">
              {slide.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-gray-300 text-sm sm:text-base"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a1a] mt-2 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company watermark */}
          <p className="absolute bottom-4 left-8 text-xs text-white/30">
            {companyName}
          </p>
        </div>
      </Card>

      {/* Speaker notes */}
      {slide.speakerNotes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Speaker Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {slide.speakerNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Slide guidance */}
      <div className="p-3 rounded-lg bg-[#ff6a1a]/5 border border-[#ff6a1a]/10">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium text-[#ff6a1a]">Investor tip:</span>{" "}
          {SLIDE_DESCRIPTIONS[slide.type]}
        </p>
      </div>
    </div>
  );
}
