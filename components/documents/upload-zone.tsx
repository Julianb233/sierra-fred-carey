"use client";

/**
 * Document Upload Zone
 * Phase 03: Pro Tier Features
 *
 * Drag-and-drop or click-to-upload PDF documents.
 */

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/lib/documents/types";

interface UploadZoneProps {
  onUploadComplete?: (document: UploadedDocument) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadedDocument {
  id: string;
  name: string;
  type: DocumentType;
  status: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "pitch_deck", label: "Pitch Deck" },
  { value: "financial", label: "Financial Document" },
  { value: "strategy", label: "Strategy Document" },
  { value: "legal", label: "Legal Document" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadZone({
  onUploadComplete,
  onUploadError,
  className,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("pitch_deck");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        setErrorMessage(error);
        setUploadStatus("error");
        onUploadError?.(error);
        return;
      }

      setFile(selectedFile);
      setErrorMessage(null);
      setUploadStatus("idle");
    },
    [validateFile, onUploadError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", documentType);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress(100);
      setUploadStatus("success");
      onUploadComplete?.(data.document);

      // Reset after a delay
      setTimeout(() => {
        setFile(null);
        setUploadStatus("idle");
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(message);
      setUploadStatus("error");
      onUploadError?.(message);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setErrorMessage(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            uploadStatus === "error" && "border-destructive/50 bg-destructive/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file ? (
            <>
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full bg-muted",
                  isDragging && "bg-primary/10"
                )}
              >
                <Upload
                  className={cn(
                    "h-8 w-8 text-muted-foreground",
                    isDragging && "text-primary"
                  )}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {uploadStatus === "idle" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {uploadStatus === "uploading" && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {uploadStatus === "success" && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {uploadStatus === "error" && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
        )}

        {/* Upload Progress */}
        {uploadStatus === "uploading" && (
          <div className="mt-4">
            <Progress value={uploadProgress} className="h-2" />
            <p className="mt-1 text-xs text-muted-foreground text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Document Type Selection and Upload Button */}
        {file && uploadStatus === "idle" && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as DocumentType)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleUpload} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        )}

        {/* Success Message */}
        {uploadStatus === "success" && (
          <p className="mt-4 text-sm text-green-600 text-center">
            Document uploaded successfully! Processing will begin shortly.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
