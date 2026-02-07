"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <img
        src="/icon-192.png"
        alt="Sahara"
        className="h-12 w-12 mx-auto mb-8 rounded-xl"
      />

      <div className="w-16 h-16 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff6a1a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        You&apos;re Offline
      </h1>

      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
        It looks like you&apos;ve lost your internet connection. We&apos;ll
        automatically reconnect when you&apos;re back online.
      </p>

      <Button
        size="lg"
        className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        onClick={() => window.location.reload()}
      >
        Try Again
      </Button>
    </div>
  );
}
