"use client";

import { useState } from "react";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  CSVGenerator,
  downloadCSV,
  getTimestampedFilename,
} from "@/lib/export/csv-generator";
import type { ExportConfig } from "@/lib/export/types";
import type { TrendPeriod } from "@/lib/dashboard/trends";
import type { MomentumIndicator } from "@/lib/dashboard/engagement-score";

interface DashboardExportMenuProps {
  trends: TrendPeriod[];
  momentum: MomentumIndicator | null;
}

const TRENDS_CSV_CONFIG: ExportConfig<TrendPeriod> = {
  filename: "founder-analytics",
  columns: [
    { field: "period", header: "Period" },
    { field: "conversations", header: "Conversations" },
    { field: "checkIns", header: "Check-Ins" },
    { field: "nextStepsCompleted", header: "Next Steps Completed" },
    { field: "decisionsScored", header: "Decisions Scored" },
    { field: "documentsCreated", header: "Documents Created" },
  ],
};

export function DashboardExportMenu({
  trends,
  momentum,
}: DashboardExportMenuProps) {
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  async function exportTrendsCSV() {
    if (trends.length === 0) return;
    setExporting("csv");
    try {
      const generator = new CSVGenerator(TRENDS_CSV_CONFIG);
      const csv = generator.generate(trends);
      const filename = getTimestampedFilename("founder-analytics", "csv");
      downloadCSV(csv, filename);
      toast.success("Trends exported as CSV");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(null);
    }
  }

  async function exportReportPDF() {
    setExporting("pdf");
    try {
      const res = await fetch("/api/dashboard/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "founder-analytics-report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Report exported as PDF");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting !== null}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={exportTrendsCSV}
          disabled={trends.length === 0 || exporting !== null}
        >
          <Table className="h-4 w-4 mr-2" />
          Export Trends (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportReportPDF}
          disabled={exporting !== null}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export Report (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
