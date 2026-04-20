"use client"

/**
 * Phase 165 SITE-02: Error boundary with recovery options for microsites
 */

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class MicrositeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {this.props.fallbackTitle || "Something went wrong"}
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                The microsite editor encountered an issue. Your changes have been
                preserved — try refreshing or go back to the dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={this.handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/dashboard/microsite")}
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Microsites
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
