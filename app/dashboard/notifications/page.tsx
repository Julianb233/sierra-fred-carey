"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, Filter, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface NotificationLog {
  id: string;
  category: string;
  title: string;
  body: string | null;
  url: string | null;
  status: string;
  sent_at: string;
  clicked_at: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  red_flags: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  wellbeing_alerts: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  agent_completions: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  inbox_messages: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "red_flags", label: "Red Flags" },
  { value: "wellbeing_alerts", label: "Wellbeing" },
  { value: "agent_completions", label: "Agents" },
  { value: "inbox_messages", label: "Inbox" },
];

const PAGE_SIZE = 20;

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum: number, cat: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("push_notification_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (cat !== "all") {
        query = query.eq("category", cat);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (pageNum === 0) {
        setNotifications(data || []);
      } else {
        setNotifications((prev) => [...prev, ...(data || [])]);
      }
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchNotifications(0, category);
  }, [category, fetchNotifications]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, category);
  };

  const handleClick = (notif: NotificationLog) => {
    if (notif.url) {
      window.location.href = notif.url;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#ff6a1a]" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your push notification history
          </p>
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.length === 0 && !loading ? (
            <div className="p-12 text-center text-gray-400">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors",
                  notif.url && "cursor-pointer"
                )}
                onClick={() => handleClick(notif)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {notif.title}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] py-0 h-4 shrink-0",
                        CATEGORY_COLORS[notif.category] || CATEGORY_COLORS.general
                      )}
                    >
                      {notif.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {notif.body && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {formatTime(notif.sent_at)}
                  </span>
                  {notif.url && (
                    <ExternalLink className="h-3 w-3 text-gray-300" />
                  )}
                </div>
              </motion.div>
            ))
          )}

          {loading && (
            <div className="p-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#ff6a1a]" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {hasMore && !loading && notifications.length > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
