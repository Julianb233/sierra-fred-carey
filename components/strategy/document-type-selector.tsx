"use client";

import {
  FileText,
  TrendingUp,
  Calendar,
  Target,
  Rocket,
} from "lucide-react";
import type { StrategyDocType } from "@/lib/fred/strategy/types";
import {
  STRATEGY_DOC_TYPES,
  DOC_TYPE_LABELS,
  DOC_TYPE_DESCRIPTIONS,
} from "@/lib/fred/strategy/types";
import { cn } from "@/lib/utils";

interface DocumentTypeSelectorProps {
  onSelect: (type: StrategyDocType) => void;
  selectedType: StrategyDocType | null;
  disabled?: boolean;
}

const DOC_TYPE_ICONS: Record<StrategyDocType, React.ElementType> = {
  executive_summary: FileText,
  market_analysis: TrendingUp,
  "30_60_90_plan": Calendar,
  competitive_analysis: Target,
  gtm_plan: Rocket,
};

export function DocumentTypeSelector({
  onSelect,
  selectedType,
  disabled = false,
}: DocumentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {STRATEGY_DOC_TYPES.map((type) => {
        const Icon = DOC_TYPE_ICONS[type];
        const isSelected = selectedType === type;

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            disabled={disabled}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border text-left transition-all",
              "hover:border-[#ff6a1a] hover:shadow-md",
              isSelected
                ? "ring-2 ring-[#ff6a1a] bg-orange-50 dark:bg-orange-950/20 border-[#ff6a1a]"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            <div
              className={cn(
                "p-3 rounded-lg shrink-0",
                isSelected
                  ? "bg-[#ff6a1a] text-white"
                  : "bg-orange-50 dark:bg-orange-950/30 text-[#ff6a1a]"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {DOC_TYPE_LABELS[type]}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {DOC_TYPE_DESCRIPTIONS[type]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
