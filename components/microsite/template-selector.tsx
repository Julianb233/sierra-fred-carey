"use client"

/**
 * Phase 165 SITE-01: Template selection with visual thumbnails
 */

import { cn } from "@/lib/utils"
import { Check, Layout, Briefcase, Sparkles, Rocket } from "lucide-react"
import { TEMPLATES } from "@/lib/microsite/types"

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  modern: <Layout className="h-8 w-8" />,
  professional: <Briefcase className="h-8 w-8" />,
  creative: <Sparkles className="h-8 w-8" />,
  startup: <Rocket className="h-8 w-8" />,
}

const TEMPLATE_GRADIENTS: Record<string, string> = {
  modern: "from-orange-500 to-amber-500",
  professional: "from-blue-600 to-indigo-600",
  creative: "from-purple-500 to-pink-500",
  startup: "from-cyan-500 to-teal-500",
}

interface TemplateSelectorProps {
  selected: string
  onSelect: (templateId: string) => void
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {TEMPLATES.map((template) => {
        const isSelected = selected === template.id
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
              isSelected
                ? "border-[#ff6a1a] bg-[#ff6a1a]/5 shadow-md"
                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 rounded-full bg-[#ff6a1a] p-1">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            {/* Template preview thumbnail */}
            <div
              className={cn(
                "h-32 w-full rounded-lg bg-gradient-to-br flex items-center justify-center text-white mb-3",
                TEMPLATE_GRADIENTS[template.id] || "from-gray-500 to-gray-700"
              )}
            >
              {TEMPLATE_ICONS[template.id] || <Layout className="h-8 w-8" />}
            </div>
            <h3 className="font-semibold text-sm">{template.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {template.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}
