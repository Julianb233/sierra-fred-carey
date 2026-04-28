"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DollarSign, ArrowLeft, MessageSquare } from "lucide-react"

// =============================================================================
// Sales Dashboard -- Coming Soon (AI-8891: disabled until ready)
// =============================================================================

export default function SalesDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
          <DollarSign className="h-10 w-10 text-orange-400" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Sales Dashboard
        </h1>

        <p className="text-lg text-muted-foreground max-w-md mb-2">
          Create quotes, track deals, and watch your earnings grow.
        </p>

        <p className="text-sm text-muted-foreground max-w-sm mb-8">
          The sales feature is under development and will be available soon.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="default" className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
            <Link href="/chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat with FRED
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
