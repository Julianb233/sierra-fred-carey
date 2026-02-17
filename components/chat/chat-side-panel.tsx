"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  User,
  ListChecks,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { StepPriority } from "@/lib/next-steps/next-steps-service";

// ============================================================================
// Types
// ============================================================================

interface FounderSnapshotData {
  name: string | null;
  stage: string | null;
  primaryConstraint: string | null;
  ninetyDayGoal: string | null;
  runway: { time?: string; money?: string; energy?: string } | null;
  productStatus: string | null;
  traction: string | null;
}

interface NextStepItem {
  id: string;
  description: string;
  priority: StepPriority;
  completed: boolean;
  createdAt: string;
}

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  createdAt: string;
}

interface ChatSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STAGE_LABELS: Record<string, string> = {
  idea: "Idea Stage",
  mvp: "MVP",
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
};

const STAGE_COLORS: Record<string, string> = {
  idea: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  mvp: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "pre-seed": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  seed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "series-a": "bg-[#ff6a1a]/10 text-[#ff6a1a] dark:bg-[#ff6a1a]/20 dark:text-[#ff6a1a]",
  growth: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const PRIORITY_BORDER: Record<StepPriority, string> = {
  critical: "border-l-red-500",
  important: "border-l-amber-500",
  optional: "border-l-blue-500",
};

// ============================================================================
// Snapshot Tab
// ============================================================================

function SnapshotTab({ snapshot }: { snapshot: FounderSnapshotData | null }) {
  if (!snapshot) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  const stageLabel = snapshot.stage
    ? STAGE_LABELS[snapshot.stage] || snapshot.stage
    : null;
  const stageColor = snapshot.stage
    ? STAGE_COLORS[snapshot.stage] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    : "";

  let runwayDisplay: string | null = null;
  if (snapshot.runway) {
    const parts: string[] = [];
    if (snapshot.runway.time) parts.push(snapshot.runway.time);
    if (snapshot.runway.money) parts.push(snapshot.runway.money);
    if (parts.length > 0) runwayDisplay = parts.join(" / ");
  }

  const fields = [
    { label: "Primary Constraint", value: snapshot.primaryConstraint },
    { label: "90-Day Goal", value: snapshot.ninetyDayGoal },
    { label: "Runway", value: runwayDisplay },
    { label: "Product", value: snapshot.productStatus },
    { label: "Traction", value: snapshot.traction },
  ];

  return (
    <div className="space-y-3">
      {(stageLabel || snapshot.name) && (
        <div className="flex items-center gap-2 mb-4">
          {stageLabel && (
            <Badge className={cn("text-xs", stageColor)}>{stageLabel}</Badge>
          )}
          {snapshot.name && (
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {snapshot.name}
            </span>
          )}
        </div>
      )}
      {fields.map((field) => (
        <div key={field.label} className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {field.label}
          </p>
          {field.value ? (
            <p className="text-sm text-gray-900 dark:text-white">
              {field.value}
            </p>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              Not set yet
            </span>
          )}
        </div>
      ))}
      <Link href="/dashboard" className="block pt-2">
        <Button variant="ghost" size="sm" className="w-full text-xs text-[#ff6a1a] hover:text-[#ea580c] hover:bg-[#ff6a1a]/10 gap-1">
          View full dashboard
          <ChevronRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}

// ============================================================================
// Next Steps Tab
// ============================================================================

function NextStepsTab({ steps }: { steps: NextStepItem[] | null }) {
  if (!steps) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <ListChecks className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No next steps yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Chat with Fred to get personalized action items
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <div
          key={step.id}
          className={cn(
            "rounded-md border-l-2 bg-gray-50 dark:bg-gray-800/50 p-3",
            step.completed
              ? "border-l-gray-300 dark:border-l-gray-700 opacity-60"
              : PRIORITY_BORDER[step.priority]
          )}
        >
          <p
            className={cn(
              "text-sm leading-snug",
              step.completed
                ? "line-through text-gray-400 dark:text-gray-500"
                : "text-gray-900 dark:text-white"
            )}
          >
            {step.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {step.completed && (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(step.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
      <Link href="/dashboard/next-steps" className="block pt-1">
        <Button variant="ghost" size="sm" className="w-full text-xs text-[#ff6a1a] hover:text-[#ea580c] hover:bg-[#ff6a1a]/10 gap-1">
          View all next steps
          <ChevronRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}

// ============================================================================
// Documents Tab
// ============================================================================

function DocumentsTab({ documents }: { documents: DocumentItem[] | null }) {
  if (!documents) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <FileText className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No documents yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Upload documents to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3"
        >
          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white truncate">
              {doc.name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {doc.type} · {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
      <Link href="/dashboard/documents" className="block pt-1">
        <Button variant="ghost" size="sm" className="w-full text-xs text-[#ff6a1a] hover:text-[#ea580c] hover:bg-[#ff6a1a]/10 gap-1">
          View all documents
          <ChevronRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}

// ============================================================================
// Panel Content (shared between desktop inline and mobile sheet)
// ============================================================================

function PanelContent() {
  const [snapshot, setSnapshot] = useState<FounderSnapshotData | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStepItem[] | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);

  useEffect(() => {
    // Fetch snapshot from command center
    fetch("/api/dashboard/command-center")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.founderSnapshot) {
          setSnapshot(json.data.founderSnapshot);
        } else {
          setSnapshot({
            name: null,
            stage: null,
            primaryConstraint: null,
            ninetyDayGoal: null,
            runway: null,
            productStatus: null,
            traction: null,
          });
        }
      })
      .catch(() =>
        setSnapshot({
          name: null,
          stage: null,
          primaryConstraint: null,
          ninetyDayGoal: null,
          runway: null,
          productStatus: null,
          traction: null,
        })
      );

    // Fetch next steps
    fetch("/api/dashboard/next-steps")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const grouped = json.data;
          const all: NextStepItem[] = [
            ...(grouped.critical || []),
            ...(grouped.important || []),
            ...(grouped.optional || []),
          ].slice(0, 5);
          setNextSteps(all);
        } else {
          setNextSteps([]);
        }
      })
      .catch(() => setNextSteps([]));

    // Fetch documents
    fetch("/api/dashboard/documents")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          const all: DocumentItem[] = [
            ...(d.decks || []),
            ...(d.strategyDocs || []),
            ...(d.reports || []),
            ...(d.uploadedFiles || []),
          ].slice(0, 5);
          setDocuments(all);
        } else {
          setDocuments([]);
        }
      })
      .catch(() => setDocuments([]));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Context
        </h2>
      </div>
      <Tabs defaultValue="snapshot" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 grid w-auto grid-cols-3 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger
            value="snapshot"
            className="text-xs gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <User className="h-3 w-3" />
            Snapshot
          </TabsTrigger>
          <TabsTrigger
            value="next-steps"
            className="text-xs gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <ListChecks className="h-3 w-3" />
            Steps
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="text-xs gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <FileText className="h-3 w-3" />
            Docs
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <TabsContent value="snapshot" className="mt-0">
            <SnapshotTab snapshot={snapshot} />
          </TabsContent>
          <TabsContent value="next-steps" className="mt-0">
            <NextStepsTab steps={nextSteps} />
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <DocumentsTab documents={documents} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function ChatSidePanel({
  open,
  onOpenChange,
  isMobile,
}: ChatSidePanelProps) {
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="p-0 w-[320px]">
          <PanelContent />
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) return null;

  return (
    <aside className="w-[320px] shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
      <PanelContent />
    </aside>
  );
}
