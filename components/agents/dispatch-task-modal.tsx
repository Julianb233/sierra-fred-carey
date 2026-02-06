"use client";

/**
 * Dispatch Task Modal
 * Phase 04: Studio Tier Features - Plan 04
 *
 * Modal for dispatching tasks to agents from the browser.
 * Supports agent type selection, task type, and description input.
 * POSTs to /api/agents to dispatch the task.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/lib/agents/types";

// ============================================================================
// Types
// ============================================================================

interface DispatchTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAgentType?: AgentType;
  onTaskDispatched?: (taskId: string) => void;
}

type DispatchState = "idle" | "submitting" | "success" | "error" | "tier-error";

// ============================================================================
// Constants
// ============================================================================

const AGENT_OPTIONS: { value: AgentType; label: string }[] = [
  { value: "founder_ops", label: "Founder Ops" },
  { value: "fundraising", label: "Fundraising" },
  { value: "growth", label: "Growth" },
];

const TASK_TYPE_SUGGESTIONS: Record<AgentType, string[]> = {
  founder_ops: ["email_draft", "task_creation", "meeting_prep", "weekly_priorities"],
  fundraising: ["investor_research", "outreach_draft", "pitch_strategy", "pipeline_analysis"],
  growth: ["channel_analysis", "experiment_design", "funnel_analysis", "content_strategy"],
};

// ============================================================================
// Component
// ============================================================================

export function DispatchTaskModal({
  isOpen,
  onClose,
  defaultAgentType,
  onTaskDispatched,
}: DispatchTaskModalProps) {
  const [agentType, setAgentType] = useState<AgentType>(
    defaultAgentType || "founder_ops"
  );
  const [taskType, setTaskType] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<DispatchState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAgentType(defaultAgentType || "founder_ops");
      setTaskType("");
      setDescription("");
      setState("idle");
      setErrorMessage("");
    }
  }, [isOpen, defaultAgentType]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Click outside handler
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Form validation
  const isValid = taskType.trim().length > 0 && description.trim().length >= 10;

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || state === "submitting") return;

    setState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType,
          taskType: taskType.trim(),
          description: description.trim(),
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        setState("success");
        onTaskDispatched?.(data.taskId);

        // Close after brief success animation
        setTimeout(() => {
          onClose();
        }, 800);
        return;
      }

      if (response.status === 403) {
        setState("tier-error");
        setErrorMessage("Upgrade to Studio tier to use AI agents.");
        return;
      }

      const errorData = await response.json().catch(() => ({ error: "Request failed" }));
      setState("error");
      setErrorMessage(errorData.error || errorData.message || "Failed to dispatch task");
    } catch (err) {
      setState("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        "fixed inset-0 z-50",
        "flex items-center justify-center",
        "bg-black/50 backdrop-blur-sm",
        "animate-in fade-in duration-200"
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-lg mx-4",
          "bg-white dark:bg-gray-900",
          "border border-gray-200 dark:border-gray-800",
          "rounded-xl shadow-xl",
          "animate-in zoom-in-95 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dispatch Agent Task
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Agent Type Selector */}
          <div>
            <label
              htmlFor="agent-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Agent
            </label>
            <select
              id="agent-type"
              value={agentType}
              onChange={(e) => {
                setAgentType(e.target.value as AgentType);
                setTaskType("");
              }}
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-white dark:bg-gray-800",
                "border border-gray-300 dark:border-gray-700",
                "text-gray-900 dark:text-white",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]"
              )}
            >
              {AGENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Task Type */}
          <div>
            <label
              htmlFor="task-type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Task Type
            </label>
            <input
              id="task-type"
              type="text"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              placeholder="e.g., channel_analysis"
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-white dark:bg-gray-800",
                "border border-gray-300 dark:border-gray-700",
                "text-gray-900 dark:text-white",
                "text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]"
              )}
            />
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TASK_TYPE_SUGGESTIONS[agentType].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTaskType(suggestion)}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    "bg-gray-100 dark:bg-gray-800",
                    "text-gray-600 dark:text-gray-400",
                    "hover:bg-[#ff6a1a]/10 hover:text-[#ff6a1a]",
                    "border border-gray-200 dark:border-gray-700",
                    "transition-colors",
                    taskType === suggestion &&
                      "bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/30"
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you want the agent to do..."
              rows={4}
              minLength={10}
              maxLength={5000}
              className={cn(
                "w-full px-3 py-2 rounded-md resize-y",
                "bg-white dark:bg-gray-800",
                "border border-gray-300 dark:border-gray-700",
                "text-gray-900 dark:text-white",
                "text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]"
              )}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">
                {description.length < 10
                  ? `${10 - description.length} more characters needed`
                  : ""}
              </span>
              <span className="text-xs text-gray-400">
                {description.length}/5000
              </span>
            </div>
          </div>

          {/* Error Messages */}
          {state === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                {errorMessage}
              </p>
            </div>
          )}

          {state === "tier-error" && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {errorMessage}{" "}
                <a
                  href="/pricing"
                  className="underline font-medium hover:text-[#ff6a1a]"
                >
                  View plans
                </a>
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Task dispatched successfully!
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={state === "submitting"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="orange"
              disabled={!isValid || state === "submitting" || state === "success"}
            >
              {state === "submitting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Dispatching...
                </>
              ) : state === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Dispatched
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Dispatch Task
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
