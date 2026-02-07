"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Platform = "ios" | "android" | "desktop";

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  ios: {
    title: "iOS (Safari)",
    steps: [
      "Open Sahara in Safari and tap the Share button at the bottom of the screen (the square with an arrow pointing up).",
      "Scroll down in the share sheet and tap &quot;Add to Home Screen&quot;.",
      "Tap &quot;Add&quot; in the top-right corner to confirm. Sahara will appear on your home screen.",
    ],
  },
  android: {
    title: "Android (Chrome)",
    steps: [
      "Open Sahara in Chrome and tap the menu icon (three dots) in the top-right corner.",
      "Tap &quot;Install app&quot; or &quot;Add to Home Screen&quot; from the menu.",
      "Tap &quot;Install&quot; to confirm. Sahara will be added to your home screen and app drawer.",
    ],
  },
  desktop: {
    title: "Desktop (Chrome / Edge)",
    steps: [
      "Look for the install icon in the right side of the address bar (it looks like a monitor with a download arrow).",
      "Click the install icon and then click &quot;Install&quot; in the popup.",
      "Sahara will open as a standalone app. You can find it in your Start menu or Applications folder.",
    ],
  },
};

const PLATFORM_ORDER: Platform[] = ["ios", "android", "desktop"];

export default function InstallPage() {
  const [activePlatform, setActivePlatform] = useState<Platform>("ios");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setActivePlatform("ios");
    } else if (/Android/.test(ua)) {
      setActivePlatform("android");
    } else {
      setActivePlatform("desktop");
    }
  }, []);

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <img
            src="/icon-192.png"
            alt="Sahara"
            className="h-16 w-16 mx-auto mb-6 rounded-2xl"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Install Sahara
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Install Sahara on your device for the best experience. Get instant
            access from your home screen with offline support.
          </p>
        </div>

        {/* Platform tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {PLATFORM_ORDER.map((platform) => (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePlatform === platform
                  ? "bg-[#ff6a1a] text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {STEPS[platform].title}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-12">
          {STEPS[activePlatform].steps.map((step, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-[#ff6a1a] p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#ff6a1a]">
                    {index + 1}
                  </span>
                </div>
                <p
                  className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed pt-1"
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link href="/" className="text-gray-500 dark:text-gray-400">
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
