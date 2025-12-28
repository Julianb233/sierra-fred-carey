"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Dashboard Error
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error.message || "Failed to load dashboard data. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button asChild className="bg-[#ff6a1a] hover:bg-[#ea580c]">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
