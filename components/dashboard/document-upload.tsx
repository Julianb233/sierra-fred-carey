"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileUp, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      const allowedExtensions = [".pdf", ".docx", ".txt"];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        setError("Only PDF, DOCX, and TXT files are supported.");
        setStatus("error");
        return;
      }

      // Validate size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit.");
        setStatus("error");
        return;
      }

      setFileName(file.name);
      setStatus("uploading");
      setProgress(0);
      setError(null);

      // Simulate progress while waiting for upload
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "other");

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        setProgress(100);
        setStatus("success");
        onUploadComplete();

        // Reset after 2 seconds
        setTimeout(() => {
          setStatus("idle");
          setProgress(0);
          setFileName(null);
        }, 2000);
      } catch (err) {
        clearInterval(progressInterval);
        setError(err instanceof Error ? err.message : "Upload failed");
        setStatus("error");
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // Reset input so re-selecting the same file triggers change
      if (inputRef.current) inputRef.current.value = "";
    },
    [uploadFile]
  );

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-all",
        dragActive
          ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent className="p-6">
        {status === "idle" && (
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Drag and drop your file here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              PDF, DOCX, or TXT files up to 10MB
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
            >
              <FileUp className="h-4 w-4 mr-1" />
              Choose File
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {status === "uploading" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-[#ff6a1a] animate-pulse" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {fileName}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500">Uploading... {progress}%</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              {fileName} uploaded successfully
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatus("idle");
                setError(null);
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
