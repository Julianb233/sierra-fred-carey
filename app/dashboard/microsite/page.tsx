"use client"

/**
 * Phase 165: Microsite dashboard — list and create microsites
 */

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Globe,
  Plus,
  ExternalLink,
  Pencil,
  Clock,
  FileEdit,
  AlertCircle,
} from "lucide-react"
import { CreationWizard } from "@/components/microsite/creation-wizard"
import { MicrositeErrorBoundary } from "@/components/microsite/microsite-error-boundary"
import type { Microsite, MicrositeStatus } from "@/lib/microsite/types"

const STATUS_BADGE: Record<MicrositeStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function MicrositeDashboardPage() {
  const [microsites, setMicrosites] = useState<Microsite[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMicrosites = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/microsite")
      if (!res.ok) {
        setError("Failed to load microsites")
        return
      }
      const data = await res.json()
      if (data.success) {
        setMicrosites(data.microsites || [])
      }
    } catch {
      setError("Failed to load microsites")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMicrosites()
  }, [fetchMicrosites])

  if (showWizard) {
    return (
      <MicrositeErrorBoundary fallbackTitle="Wizard error">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Create Your Microsite</h1>
            <p className="text-sm text-gray-500 mt-1">
              Follow the steps to build your branded landing page
            </p>
          </div>
          <CreationWizard onCancel={() => setShowWizard(false)} />
        </div>
      </MicrositeErrorBoundary>
    )
  }

  return (
    <MicrositeErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Microsites</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage branded landing pages for your startup
            </p>
          </div>
          <Button
            onClick={() => setShowWizard(true)}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> New Microsite
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchMicrosites} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && microsites.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center text-center py-16 space-y-4">
              <div className="p-4 rounded-full bg-[#ff6a1a]/10">
                <Globe className="h-10 w-10 text-[#ff6a1a]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No microsites yet</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Create your first branded microsite to share with investors,
                  partners, and customers.
                </p>
              </div>
              <Button
                onClick={() => setShowWizard(true)}
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Create Your First Microsite
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Microsite grid */}
        {!loading && microsites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {microsites.map((site) => {
              const badge = STATUS_BADGE[site.status as MicrositeStatus] || STATUS_BADGE.draft
              const primaryColor = site.branding?.primary_color || "#ff6a1a"
              const secondaryColor = site.branding?.secondary_color || "#1a1a2e"

              return (
                <Card key={site.id} className="hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-3">
                    {/* Mini preview */}
                    <div
                      className="h-24 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      {site.branding?.logo_url ? (
                        <img
                          src={site.branding.logo_url}
                          alt="Logo"
                          className="h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <Globe className="h-8 w-8" style={{ color: primaryColor }} />
                      )}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{site.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          /{site.slug}
                        </CardDescription>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(site.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileEdit className="h-3 w-3" />
                        v{site.version}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/dashboard/microsite/${site.id}`}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Link>
                      </Button>
                      {site.status === "published" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/site/${site.slug}`} target="_blank">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </MicrositeErrorBoundary>
  )
}
