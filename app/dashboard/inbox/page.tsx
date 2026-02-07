"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxMessage } from "@/components/inbox/inbox-message";
import { InboxFilter } from "@/components/inbox/inbox-filter";
import type {
  InboxMessage as InboxMessageType,
  InboxFilters,
  InboxCounts,
} from "@/lib/inbox/types";
import { CheckCircledIcon } from "@radix-ui/react-icons";

// ============================================================================
// Page State
// ============================================================================

type PageState = "loading" | "loaded" | "error" | "empty";

const PAGE_SIZE = 20;

// ============================================================================
// Page Component
// ============================================================================

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessageType[]>([]);
  const [meta, setMeta] = useState<InboxCounts>({ total: 0, unread: 0, urgent: 0 });
  const [filters, setFilters] = useState<InboxFilters>({ limit: PAGE_SIZE, offset: 0 });
  const [pageState, setPageState] = useState<PageState>("loading");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch messages from API
  const fetchMessages = useCallback(
    async (currentFilters: InboxFilters, append = false) => {
      try {
        if (!append) setPageState("loading");

        const params = new URLSearchParams();
        if (currentFilters.source) params.set("source", currentFilters.source);
        if (currentFilters.priority) params.set("priority", currentFilters.priority);
        if (currentFilters.status) params.set("status", currentFilters.status);
        params.set("limit", String(currentFilters.limit ?? PAGE_SIZE));
        params.set("offset", String(currentFilters.offset ?? 0));

        const res = await fetch(`/api/inbox?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch inbox");

        const data = await res.json();

        if (append) {
          setMessages((prev) => [...prev, ...data.messages]);
        } else {
          setMessages(data.messages);
        }

        setMeta(data.meta);
        setHasMore(data.messages.length === (currentFilters.limit ?? PAGE_SIZE));

        if (!append && data.messages.length === 0) {
          setPageState("empty");
        } else {
          setPageState("loaded");
        }
      } catch (err) {
        console.error("[Inbox] Fetch error:", err);
        if (!append) setPageState("error");
      } finally {
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial fetch and refetch on filter change
  useEffect(() => {
    fetchMessages(filters);
  }, [filters, fetchMessages]);

  // Handle filter changes
  function handleFilterChange(newFilters: InboxFilters) {
    setFilters({ ...newFilters, limit: PAGE_SIZE, offset: 0 });
  }

  // Load more
  function handleLoadMore() {
    setLoadingMore(true);
    const newOffset = (filters.offset ?? 0) + PAGE_SIZE;
    const newFilters = { ...filters, offset: newOffset };
    setFilters((prev) => ({ ...prev, offset: newOffset }));
    fetchMessages(newFilters, true);
  }

  // Dismiss a message (remove from local state)
  function handleAction(id: string, action: "dismiss" | "read") {
    if (action === "dismiss") {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  // Retry on error
  function handleRetry() {
    fetchMessages(filters);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Inbox
        </h1>
        {meta.unread > 0 && (
          <Badge className="bg-[#ff6a1a] text-white text-xs">
            {meta.unread} unread
          </Badge>
        )}
        {meta.urgent > 0 && (
          <Badge variant="destructive" className="text-xs">
            {meta.urgent} urgent
          </Badge>
        )}
      </div>

      {/* Filters */}
      <InboxFilter filters={filters} onChange={handleFilterChange} />

      {/* Content */}
      {pageState === "loading" && <LoadingSkeleton />}

      {pageState === "error" && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Something went wrong loading your inbox.
          </p>
          <Button onClick={handleRetry} variant="outline">
            Retry
          </Button>
        </div>
      )}

      {pageState === "empty" && <EmptyState />}

      {pageState === "loaded" && (
        <div className="space-y-3">
          {messages.map((message) => (
            <InboxMessage
              key={message.id}
              message={message}
              onAction={handleAction}
            />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="border rounded-lg p-4 border-l-4 border-l-gray-200 dark:border-l-gray-700"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <CheckCircledIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        All caught up!
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        No pending messages. Your agents will notify you when there are new results.
      </p>
    </div>
  );
}
