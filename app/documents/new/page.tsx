"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy document generator page.
 * Redirects to the real Strategy Docs feature at /dashboard/strategy.
 */
export default function DocumentGeneratorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/strategy");
  }, [router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff6a1a] mx-auto" />
        <p className="text-gray-500">Redirecting to Strategy Documents...</p>
      </div>
    </div>
  );
}
