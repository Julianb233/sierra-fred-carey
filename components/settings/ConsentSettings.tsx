"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ---------- Client-safe constants ----------
// Duplicated from lib/db/consent.ts to avoid importing server-only module
// (lib/db/consent.ts uses createServiceClient which is server-only)

type ConsentCategory = "benchmarks" | "social_feed" | "directory" | "messaging";

interface ConsentCategoryConfig {
  label: string;
  description: string;
}

const CONSENT_CATEGORY_INFO: Record<ConsentCategory, ConsentCategoryConfig> = {
  benchmarks: {
    label: "Benchmark Data",
    description:
      "Include your anonymized data in community benchmarks so founders can compare progress",
  },
  social_feed: {
    label: "Social Feed",
    description:
      "Allow your milestones and achievements to appear in the community feed",
  },
  directory: {
    label: "Founder Directory",
    description:
      "Make your community profile searchable in the founder directory",
  },
  messaging: {
    label: "Direct Messaging",
    description:
      "Allow other founders to send you direct messages",
  },
};

const CONSENT_CATEGORIES: ConsentCategory[] = [
  "benchmarks",
  "social_feed",
  "directory",
  "messaging",
];

// ---------- Component ----------

export function ConsentSettings() {
  const [preferences, setPreferences] = useState<
    Record<ConsentCategory, boolean>
  >({
    benchmarks: false,
    social_feed: false,
    directory: false,
    messaging: false,
  });
  const [loading, setLoading] = useState(true);
  const [togglingCategory, setTogglingCategory] = useState<
    ConsentCategory | null
  >(null);

  // Load current consent preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch("/api/community/consent");
        if (!res.ok) {
          throw new Error("Failed to load consent preferences");
        }
        const json = await res.json();
        if (json.success && json.data) {
          const loaded: Record<ConsentCategory, boolean> = {
            benchmarks: false,
            social_feed: false,
            directory: false,
            messaging: false,
          };
          for (const cat of CONSENT_CATEGORIES) {
            loaded[cat] = json.data[cat]?.enabled ?? false;
          }
          setPreferences(loaded);
        }
      } catch {
        toast.error("Could not load consent preferences");
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  // Toggle a specific category (instant save, no separate Save button)
  const handleToggle = useCallback(
    async (category: ConsentCategory, enabled: boolean) => {
      setTogglingCategory(category);

      // Optimistic update
      const previousValue = preferences[category];
      setPreferences((prev) => ({ ...prev, [category]: enabled }));

      try {
        const res = await fetch("/api/community/consent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, enabled }),
        });

        if (!res.ok) {
          throw new Error("Failed to update consent preference");
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "Failed to update consent preference");
        }

        // Sync with server response
        const updated: Record<ConsentCategory, boolean> = {
          benchmarks: false,
          social_feed: false,
          directory: false,
          messaging: false,
        };
        for (const cat of CONSENT_CATEGORIES) {
          updated[cat] = json.data[cat]?.enabled ?? false;
        }
        setPreferences(updated);

        const info = CONSENT_CATEGORY_INFO[category];
        toast.success(
          `${info.label} ${enabled ? "enabled" : "disabled"}`,
        );
      } catch {
        // Revert optimistic update
        setPreferences((prev) => ({ ...prev, [category]: previousValue }));
        toast.error("Failed to save consent preference");
      } finally {
        setTogglingCategory(null);
      }
    },
    [preferences],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Data Sharing</CardTitle>
        <CardDescription>
          Control how your data is shared with the community. All options are
          opt-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          // Loading skeleton
          <div className="space-y-6">
            {CONSENT_CATEGORIES.map((cat) => (
              <div key={cat}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
                {cat !== CONSENT_CATEGORIES[CONSENT_CATEGORIES.length - 1] && (
                  <Separator className="mt-6" />
                )}
              </div>
            ))}
          </div>
        ) : (
          CONSENT_CATEGORIES.map((category, index) => {
            const info = CONSENT_CATEGORY_INFO[category];
            const isLast = index === CONSENT_CATEGORIES.length - 1;

            return (
              <div key={category}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`consent-${category}`}
                      className="text-base"
                    >
                      {info.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                  <Switch
                    id={`consent-${category}`}
                    checked={preferences[category]}
                    onCheckedChange={(checked) =>
                      handleToggle(category, checked)
                    }
                    disabled={togglingCategory !== null}
                    aria-label={`Toggle ${info.label}`}
                  />
                </div>
                {!isLast && <Separator className="mt-6" />}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
