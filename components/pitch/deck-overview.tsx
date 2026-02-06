"use client";

import { SLIDE_LABELS } from "@/lib/fred/pitch/types";
import type { SlideAnalysis, SlideType } from "@/lib/fred/pitch/types";
import { cn } from "@/lib/utils";

interface DeckOverviewProps {
  slides: SlideAnalysis[];
  selectedIndex: number | null;
  onSelectSlide: (index: number) => void;
}

function getScoreBorderColor(score: number): string {
  if (score < 50) return "border-red-400";
  if (score < 70) return "border-yellow-400";
  return "border-green-400";
}

function getScoreTextColor(score: number): string {
  if (score < 50) return "text-red-600 dark:text-red-400";
  if (score < 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function getScoreBgColor(score: number): string {
  if (score < 50) return "bg-red-50 dark:bg-red-900/10";
  if (score < 70) return "bg-yellow-50 dark:bg-yellow-900/10";
  return "bg-green-50 dark:bg-green-900/10";
}

export function DeckOverview({ slides, selectedIndex, onSelectSlide }: DeckOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {slides.map((slide, index) => (
        <div
          key={index}
          onClick={() => onSelectSlide(index)}
          className={cn(
            "relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md",
            getScoreBorderColor(slide.score),
            getScoreBgColor(slide.score),
            selectedIndex === index && "ring-2 ring-[#ff6a1a] ring-offset-2 dark:ring-offset-gray-950"
          )}
        >
          {/* Page number */}
          <span className="absolute top-2 left-2 text-xs font-mono text-gray-400">
            p{slide.pageNumber}
          </span>

          {/* Slide type badge */}
          <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
            {SLIDE_LABELS[slide.type as SlideType] || slide.type}
          </span>

          {/* Score - center large */}
          <div className="flex items-center justify-center py-4">
            <span className={cn("text-3xl font-bold", getScoreTextColor(slide.score))}>
              {slide.score}
            </span>
          </div>

          {/* Truncated feedback */}
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
            {slide.feedback}
          </p>
        </div>
      ))}
    </div>
  );
}
