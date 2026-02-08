"use client";

/**
 * Sharing Analytics Dashboard
 * Phase 33-02: Collaboration & Sharing
 *
 * Shows all share links created by the user with view counts,
 * expiry status, and revoke functionality.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  Eye,
  Clock,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FeatureLock } from "@/components/tier/feature-lock";
import { useUserTier } from "@/lib/context/tier-context";
import { UserTier } from "@/lib/constants";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface ShareLinkData {
  id: string;
  resource_type: string;
  token: string;
  access_level: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_active: boolean;
  is_team_only: boolean;
  created_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  strategy_document: "Strategy Document",
  pitch_review: "Pitch Review",
  investor_readiness: "Investor Readiness",
  red_flags_report: "Red Flags Report",
};

function formatResourceType(type: string): string {
  return RESOURCE_TYPE_LABELS[type] ?? type;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getExpiryStatus(
  expiresAt: string | null,
  isActive: boolean
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!isActive) {
    return { label: "Revoked", variant: "destructive" };
  }
  if (!expiresAt) {
    return { label: "Never expires", variant: "secondary" };
  }
  const expires = new Date(expiresAt);
  if (expires < new Date()) {
    return { label: "Expired", variant: "destructive" };
  }
  const daysLeft = Math.ceil(
    (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft <= 1) {
    return { label: "Expires today", variant: "outline" };
  }
  return { label: `${daysLeft}d left`, variant: "secondary" };
}

// ============================================================================
// Page Component
// ============================================================================

export default function SharingAnalyticsPage() {
  const { tier, isLoading: tierLoading } = useUserTier();
  const [links, setLinks] = useState<ShareLinkData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/share");
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) {
        setLinks(data.links || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleRevoke = async (linkId: string) => {
    try {
      const response = await fetch(`/api/share?id=${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        toast.error("Failed to revoke link");
        return;
      }

      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, is_active: false } : l))
      );
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke link");
    }
  };

  // Computed stats
  const totalLinks = links.length;
  const activeLinks = links.filter((l) => l.is_active).length;
  const totalViews = links.reduce((sum, l) => sum + l.view_count, 0);
  const teamLinks = links.filter((l) => l.is_team_only).length;

  if (tierLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <FeatureLock
      requiredTier={UserTier.STUDIO}
      currentTier={tier}
      featureName="Sharing Analytics"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sharing Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage and track your shared links
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLinks}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                  <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLinks}</p>
                  <p className="text-xs text-gray-500">Total Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                  <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeLinks}</p>
                  <p className="text-xs text-gray-500">Active Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalViews}</p>
                  <p className="text-xs text-gray-500">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                  <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teamLinks}</p>
                  <p className="text-xs text-gray-500">Team Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#ff6a1a]" />
              Share Links
            </CardTitle>
            <CardDescription>
              All shareable links you&apos;ve created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading links...
                </span>
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No share links created yet</p>
                <p className="text-sm mt-1">
                  Share a document to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const expiry = getExpiryStatus(
                    link.expires_at,
                    link.is_active
                  );

                  return (
                    <div
                      key={link.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        link.is_active
                          ? "border-gray-200 dark:border-gray-800"
                          : "border-gray-100 dark:border-gray-900 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            link.is_team_only
                              ? "bg-orange-100 dark:bg-orange-950 text-orange-600"
                              : "bg-blue-100 dark:bg-blue-950 text-blue-600"
                          }`}
                        >
                          {link.is_team_only ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Globe className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {formatResourceType(link.resource_type)}
                            </span>
                            <Badge variant={expiry.variant}>
                              {expiry.label}
                            </Badge>
                            {link.is_team_only && (
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-300"
                              >
                                Team Only
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(link.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {link.view_count}{" "}
                              {link.view_count === 1 ? "view" : "views"}
                              {link.max_views !== null &&
                                ` / ${link.max_views} max`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {link.is_active && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const url = `${window.location.origin}/shared/${link.token}`;
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() =>
                                    toast.success("Link copied")
                                  );
                              }}
                              title="Copy link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                  title="Revoke link"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Revoke Share Link?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently disable this share
                                    link. Anyone with the link will no longer be
                                    able to access the resource.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRevoke(link.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Revoke
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureLock>
  );
}
