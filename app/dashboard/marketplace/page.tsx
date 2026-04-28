"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag, MessageSquare, ArrowLeft } from "lucide-react"

// =============================================================================
// Marketplace -- Coming Soon (AI-8891: disabled until ready)
// =============================================================================

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-orange-400" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Service Marketplace
        </h1>

        <p className="text-lg text-muted-foreground max-w-md mb-2">
          We&apos;re curating a marketplace of vetted service providers to help
          your startup grow.
        </p>

        <p className="text-sm text-muted-foreground max-w-sm mb-8">
          Legal, finance, marketing, tech, and more -- coming soon.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="default" className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            <Link href="/chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Ask FRED for Recommendations
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
