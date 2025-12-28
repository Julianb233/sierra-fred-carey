"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to get-started onboarding flow
    router.replace("/get-started");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#ff6a1a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting to signup...</p>
      </div>
    </div>
  );
}
