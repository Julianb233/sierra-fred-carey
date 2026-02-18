"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StrategyError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Strategy Documents
            </h1>
            <p className="text-sm text-gray-500">
              AI-generated strategic documents tailored to your startup
            </p>
          </div>
        </div>
      </header>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Strategy Documents Error
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          {error.message || "Something went wrong loading strategy documents."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="min-h-[44px]" onClick={reset}>
            Retry
          </Button>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="min-h-[44px] border-[#ff6a1a]/30 text-[#ff6a1a] hover:bg-[#ff6a1a]/10"
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
