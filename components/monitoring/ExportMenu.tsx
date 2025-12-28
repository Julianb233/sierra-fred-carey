"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  DownloadIcon,
  FileTextIcon,
  TableIcon,
  CodeIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import type { UIExperiment } from "@/types/monitoring";

export type ExportFormat = "csv" | "json" | "pdf";

interface ExportMenuProps {
  data: UIExperiment[];
  filename?: string;
  onExport?: (format: ExportFormat, data: any) => void;
}

function convertToCSV(data: UIExperiment[]): string {
  if (data.length === 0) return "";

  const headers = ["Name", "Status", "Variants", "Traffic %", "Start Date", "End Date", "Winner", "Significance %"];
  const rows = data.map((exp) => [
    exp.name,
    exp.status,
    exp.variants.join("; "),
    exp.traffic,
    exp.startDate,
    exp.endDate || "",
    exp.winner || "",
    exp.significance || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportMenu({ data, filename = "experiments", onExport }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);

      // Custom export handler if provided
      if (onExport) {
        onExport(format, data);
        toast.success(`Exported as ${format.toUpperCase()}`, {
          description: `${data.length} experiments exported successfully`,
        });
        return;
      }

      // Default export logic
      switch (format) {
        case "csv": {
          const csv = convertToCSV(data);
          downloadFile(csv, `${filename}.csv`, "text/csv");
          toast.success("CSV Export Complete", {
            description: `${data.length} experiments exported to CSV`,
          });
          break;
        }

        case "json": {
          const json = JSON.stringify(data, null, 2);
          downloadFile(json, `${filename}.json`, "application/json");
          toast.success("JSON Export Complete", {
            description: `${data.length} experiments exported to JSON`,
          });
          break;
        }

        case "pdf": {
          toast.info("PDF Export Coming Soon", {
            description: "This feature is under development",
          });
          break;
        }

        default:
          toast.error("Invalid export format");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting || data.length === 0}
          className="gap-2"
        >
          {isExporting ? (
            <ReloadIcon className="h-4 w-4 animate-spin" />
          ) : (
            <DownloadIcon className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export As</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2">
          <TableIcon className="h-4 w-4" />
          <span>CSV Spreadsheet</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")} className="gap-2">
          <CodeIcon className="h-4 w-4" />
          <span>JSON Data</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2" disabled>
          <FileTextIcon className="h-4 w-4" />
          <span>PDF Report</span>
          <span className="ml-auto text-xs text-gray-400">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
