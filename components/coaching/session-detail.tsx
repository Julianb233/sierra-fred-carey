"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Calendar,
  Clock,
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CoachingSession {
  id: string;
  user_id: string;
  room_name: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionDetailProps {
  session: CoachingSession;
  onUpdate: (updated: CoachingSession) => void;
  onDelete: (deletedId: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "Not recorded";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} second${secs !== 1 ? "s" : ""}`;
  if (secs === 0) return `${mins} minute${mins !== 1 ? "s" : ""}`;
  return `${mins}m ${secs}s`;
}

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "active":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "scheduled":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  }
}

// ============================================================================
// Component
// ============================================================================

export function SessionDetail({
  session,
  onUpdate,
  onDelete,
}: SessionDetailProps) {
  const [notes, setNotes] = useState(session.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveNotes = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/coaching/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save notes");
      }

      const data = await res.json();
      onUpdate(data.session);
      setSaveStatus("saved");

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setIsSaving(false);
    }
  }, [session.id, notes, onUpdate]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/coaching/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete session");
      }

      onDelete(session.id);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred"
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [session.id, onDelete]);

  const hasUnsavedChanges = notes !== (session.notes || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Session Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[#ff6a1a]" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Room Name
              </label>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                {session.room_name}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <div>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                    statusColor(session.status)
                  )}
                >
                  {session.status}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </label>
              <p className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {formatDate(session.created_at)}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </label>
              <p className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {formatDuration(session.duration_seconds)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this coaching session..."
            rows={6}
            className={cn(
              "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
              "rounded-lg px-3 py-2.5 text-sm resize-y outline-none",
              "focus:border-[#ff6a1a] focus:ring-1 focus:ring-[#ff6a1a]/30",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "min-h-[120px]"
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveStatus === "saved" && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Saved
                </motion.span>
              )}
              {saveStatus === "error" && errorMessage && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {errorMessage}
                </span>
              )}
            </div>
            <Button
              onClick={handleSaveNotes}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
              className="gap-1.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Delete Session
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Permanently remove this session and its notes.
              </p>
            </div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-1.5"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Confirm Delete
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
          {errorMessage && showDeleteConfirm && (
            <p className="text-xs text-red-500 mt-2">{errorMessage}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SessionDetail;
