"use client";

import { Download, X } from "lucide-react";
import { DOC_TYPE_LABELS } from "@/lib/fred/strategy/types";
import type { GeneratedDocument, StrategyDocType } from "@/lib/fred/strategy/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DocumentPreviewProps {
  document: GeneratedDocument;
  onExport: () => void;
  onClose: () => void;
}

export function DocumentPreview({
  document,
  onExport,
  onClose,
}: DocumentPreviewProps) {
  const docType = document.type as StrategyDocType;
  const typeLabel = DOC_TYPE_LABELS[docType] || document.type;

  // Format the generated date
  const generatedDate = document.metadata.generatedAt
    ? new Date(document.metadata.generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {document.title}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#ff6a1a]/10 text-[#ff6a1a]">
                {typeLabel}
              </span>
              <span className="text-xs text-gray-500">
                {document.metadata.wordCount.toLocaleString()} words
              </span>
              <span className="text-xs text-gray-500">
                v{document.version}
              </span>
              <span className="text-xs text-gray-500">{generatedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onExport}
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="prose dark:prose-invert max-w-none">
          {document.sections.map((section, index) => (
            <div key={index} className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                {section.title}
              </h3>
              {section.content.split("\n\n").map((paragraph, pIdx) => (
                <p
                  key={pIdx}
                  className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3"
                >
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
