"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function GetStartedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Get-started error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md p-8">
        <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We hit an error during signup. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
          >
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
