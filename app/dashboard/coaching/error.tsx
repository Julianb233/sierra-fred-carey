"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function CoachingError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      data-testid="coaching-error"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Video Coaching Error
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {error.message || "Something went wrong loading coaching sessions."}
      </p>
      <Button variant="outline" className="min-h-[44px]" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
