"use client";

import { useEffect } from "react";

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
    <main className="min-h-dvh flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden px-4 text-center">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6a1a]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto">
        {/* Logo / Brand mark */}
        <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center shadow-lg shadow-[#ff6a1a]/25">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
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

        <h1 className="text-3xl font-bold text-white mb-3">
          You&apos;re Offline
        </h1>

        <p className="text-gray-400 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection.
          Check your network and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gradient-to-r from-[#ff6a1a] to-orange-400 text-white font-medium shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40 hover:brightness-110 transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
