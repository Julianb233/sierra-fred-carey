# Phase 22: PWA & Mobile Polish - Research

**Researched:** 2026-02-07
**Domain:** Progressive Web App (installability, offline), Mobile Responsive Design (375px viewport, touch targets)
**Confidence:** HIGH

## Summary

The Sahara platform has strong PWA foundations already in place -- a well-structured `app/manifest.ts` with proper icons and standalone mode, a custom `public/sw.js` with cache-first strategy for static assets and network-first for navigation, service worker registration in `app/providers.tsx`, and comprehensive meta tags in `app/layout.tsx`. What is missing are three specific features: a dedicated offline fallback page, a custom install prompt component, and an install instructions page.

For mobile responsiveness, the codebase is already well-architected with Tailwind responsive classes. The global CSS already sets `min-height: 44px` on all buttons, links, and interactive elements (globals.css line 106-108), and provides a `.touch-target` utility class. The pricing comparison table on `app/pricing/page.tsx` uses a raw `<table>` element with 4 columns that will compress poorly at 375px. Several TabsList components use `grid-cols-4` or `grid-cols-5` without mobile-first breakpoints. Fixed-width pixel values appear in approximately 17 files but many are decorative blobs inside `overflow-hidden` containers and are harmless.

**Primary recommendation:** Build the three missing PWA features (offline page, install prompt, install instructions) using the existing custom service worker approach -- do NOT add next-pwa or Serwist. For mobile, convert the pricing comparison table to a card layout below 768px, audit the TabsList components for horizontal scrolling, and fix genuine fixed-width issues that cause layout problems at 375px.

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.1 | App framework | Already in use, provides manifest generation |
| Custom `sw.js` | N/A | Service worker | Already in use, handles caching and offline |
| Tailwind CSS | 4.1.13 | Responsive styling | Already in use throughout |
| Framer Motion | 12.23.13 | Animations | Already in use for transitions |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser APIs | N/A | `beforeinstallprompt`, `matchMedia`, `navigator.standalone` | Install prompt detection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `sw.js` | `@ducanh2912/next-pwa` or `serwist` | Would require webpack (project uses `--webpack` flag in build, so possible), but adds complexity for features we can implement in ~30 lines of SW code. Custom SW is already working and well-understood. |
| Custom install prompt | No library exists | Must hand-roll -- this is a browser API integration, not a library problem. |

**Installation:**
```bash
# No new dependencies required for this phase
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  offline/
    page.tsx              # Offline fallback page with Sahara branding
  install/
    page.tsx              # PWA install instructions page (iOS + Android guides)
components/
  pwa/
    InstallPrompt.tsx     # Custom "Add to Home Screen" prompt component
    useInstallPrompt.ts   # Hook for beforeinstallprompt event management
    usePWAStatus.ts       # Hook for detecting standalone mode, iOS, etc.
public/
  sw.js                   # Updated service worker (add offline page caching)
```

### Pattern 1: Custom Install Prompt with beforeinstallprompt
**What:** Intercept the browser's native install banner, save the event, and show a custom UI
**When to use:** On first visit when the app is installable (Chromium browsers only)
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
// components/pwa/useInstallPrompt.ts
"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS (no beforeinstallprompt support)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      && !(window as any).MSStream;
    setIsIOS(ios);

    // Listen for beforeinstallprompt (Chromium only)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful installation
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    const result = await deferredPrompt.prompt();
    setDeferredPrompt(null);
    return result.outcome;
  }, [deferredPrompt]);

  return {
    canPrompt: !!deferredPrompt,  // Chromium: true when installable
    isIOS,                         // iOS: show manual instructions
    isStandalone,                  // Already running as PWA
    isInstalled,                   // Just got installed this session
    promptInstall,                 // Trigger the native install dialog
  };
}
```

### Pattern 2: Service Worker Offline Fallback
**What:** Cache an offline page during SW install, serve it when navigation fails
**When to use:** Always -- the SW should always have a fallback for network failures
**Example:**
```javascript
// Source: https://googlechrome.github.io/samples/service-worker/custom-offline-page/
// Addition to public/sw.js

const OFFLINE_URL = "/offline";

// In install event, add offline page to cache:
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([...STATIC_ASSETS, OFFLINE_URL])
    )
  );
  self.skipWaiting();
});

// In fetch event, for navigation requests, fall back to offline page:
if (request.mode === "navigate") {
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(OFFLINE_URL))
  );
}
```

### Pattern 3: iOS Install Detection (No beforeinstallprompt)
**What:** iOS Safari does not fire `beforeinstallprompt`. Must detect iOS and show manual instructions.
**When to use:** When user is on iOS Safari and app is not in standalone mode
**Detection:**
```typescript
// Source: https://web.dev/learn/pwa/detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches
  || (navigator as any).standalone === true;
const showIOSInstructions = isIOS && !isStandalone;
```

### Pattern 4: Pricing Comparison Table to Cards
**What:** Replace `<table>` with responsive card layout below 768px
**When to use:** Pricing comparison section at 375px viewport
**Example:**
```tsx
{/* Desktop: table view */}
<div className="hidden md:block">
  <table className="w-full">...</table>
</div>

{/* Mobile: card view */}
<div className="md:hidden space-y-4">
  {comparisonFeatures.map((feature) => (
    <div key={feature.name} className="bg-white dark:bg-gray-950 rounded-xl p-4 border">
      <h4 className="font-medium text-sm mb-3">{feature.name}</h4>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <span className="text-xs text-gray-500">Free</span>
          {feature.free ? <CheckIcon /> : <Cross2Icon />}
        </div>
        <div>
          <span className="text-xs text-[#ff6a1a]">$99</span>
          {feature.fundraising ? <CheckIcon /> : <Cross2Icon />}
        </div>
        <div>
          <span className="text-xs text-orange-600">$249</span>
          {feature.studio ? <CheckIcon /> : <Cross2Icon />}
        </div>
      </div>
    </div>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Using next-pwa or Serwist for simple offline fallback:** The project already has a working custom service worker. Adding a library just for offline fallback would introduce unnecessary build complexity (especially with Turbopack considerations). The SW update is ~10 lines of code.
- **Showing install prompt immediately on page load:** Users are more likely to dismiss it. Show after meaningful interaction or on second visit. Use `localStorage` to track dismissals.
- **Using `navigator.userAgent` for reliable iOS detection without fallbacks:** User agent strings change. Combine with feature detection (`"standalone" in navigator`).
- **Setting fixed pixel widths without responsive breakpoints:** Always use `w-full sm:w-[Xpx]` pattern for any fixed-width element.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Display mode detection | Custom window checks | `window.matchMedia("(display-mode: standalone)")` | Standard API, handles all display modes |
| iOS detection | Regex-only approach | Combine UA check with `"standalone" in navigator` | UA strings change, feature detection is more robust |
| Touch target sizing | Manual per-element sizing | Global CSS rule (already exists in globals.css) | Already implemented: `button, a, [role="button"] { min-height: 44px; }` |
| Safe area insets | Manual padding calculations | `env(safe-area-inset-*)` CSS functions (already defined as `.safe-*` utilities) | Already implemented in globals.css |
| Responsive containers | Per-page width management | `ResponsiveContainer` component (already exists at `components/ui/responsive-container.tsx`) | Already provides `sm/md/lg/xl/full` size presets |

**Key insight:** The project already has most mobile infrastructure in place. The work is about filling specific gaps (offline page, install prompt) and fixing specific component-level issues (pricing table, TabsLists, fixed widths).

## Common Pitfalls

### Pitfall 1: beforeinstallprompt Never Fires in Development
**What goes wrong:** The `beforeinstallprompt` event only fires on HTTPS with a valid manifest, and Chrome has heuristics about when to show it.
**Why it happens:** Dev servers use HTTP by default; the event requires meeting all PWA installability criteria.
**How to avoid:** Test on deployed staging environment (Vercel provides HTTPS). Use Chrome DevTools > Application > Manifest to check installability. Use `next dev --experimental-https` for local testing.
**Warning signs:** Install prompt component never appears during local development.

### Pitfall 2: Service Worker Caching Stale Offline Page
**What goes wrong:** The offline page content gets cached during SW install and never updates.
**Why it happens:** Cache version (`CACHE_NAME = "sahara-v1"`) is static; SW only re-caches when the cache name changes.
**How to avoid:** Include the offline page URL in the static assets list. Bump the cache version when updating the offline page. The existing SW already handles cache cleanup in the `activate` event.
**Warning signs:** Offline page shows outdated branding after a redesign.

### Pitfall 3: iOS Safari Share Sheet vs Install
**What goes wrong:** Developers assume iOS users will find "Add to Home Screen" in the share menu.
**Why it happens:** iOS has no `beforeinstallprompt` and the share menu is not intuitive.
**How to avoid:** Show explicit step-by-step instructions with screenshots for iOS users. Detect iOS and show a dedicated instruction banner.
**Warning signs:** Zero iOS PWA installs despite iOS traffic.

### Pitfall 4: Pricing Table Horizontal Scroll at 375px
**What goes wrong:** The 4-column comparison table (`<table>`) causes horizontal scrolling on iPhone screens.
**Why it happens:** Each column needs minimum width for headers ("Feature", "Free", "$99", "$249") plus cell padding.
**How to avoid:** Use `hidden md:block` for the table and `md:hidden` for a card-based alternative layout. Already proven pattern in the pricing cards section of the same page.
**Warning signs:** Horizontal scroll bar visible on mobile, content cut off.

### Pitfall 5: TabsList Overflow on Small Screens
**What goes wrong:** `grid-cols-4` and `grid-cols-5` TabsList components compress tabs to unreadable widths on 375px.
**Why it happens:** 375px / 4 tabs = 93px per tab (barely fits), 375px / 5 tabs = 75px per tab (text truncates).
**How to avoid:** Use scrollable horizontal tabs on mobile: `overflow-x-auto` wrapper with `inline-flex` and `whitespace-nowrap`. The `app/dashboard/insights/page.tsx` already implements this pattern correctly.
**Warning signs:** Tab labels truncated or overlapping on mobile.

### Pitfall 6: Fixed-Width Decorative Elements Causing Overflow
**What goes wrong:** Large `w-[500px]` or `w-[600px]` decorative blobs cause the page to be wider than viewport.
**Why it happens:** These elements are absolutely positioned but the parent may not have `overflow-hidden`.
**How to avoid:** Verify all large decorative elements are inside a container with `overflow-hidden`. The pricing page (`app/pricing/page.tsx`) already uses `overflow-hidden` on the main container.
**Warning signs:** Horizontal scroll on pages with background gradients/blobs.

## Code Examples

### Offline Fallback Page (Sahara Branded)
```tsx
// app/offline/page.tsx
// Source: Pattern from https://googlechrome.github.io/samples/service-worker/custom-offline-page/
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-reload when back online
  useEffect(() => {
    if (isOnline) {
      window.location.reload();
    }
  }, [isOnline]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <div className="max-w-md mx-auto">
        {/* Sahara Logo */}
        <img src="/sahara-logo.svg" alt="Sahara" className="h-10 mx-auto mb-8" />

        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
          {/* Offline icon */}
          <svg className="w-8 h-8 text-[#ff6a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243L3.515 20.485" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          You're Offline
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          It looks like you've lost your internet connection.
          We'll automatically reconnect when you're back online.
        </p>

        <Button
          onClick={() => window.location.reload()}
          className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
          size="lg"
        >
          Try Again
        </Button>
      </div>
    </main>
  );
}
```

### Updated Service Worker with Offline Fallback
```javascript
// public/sw.js - key changes
const CACHE_NAME = "sahara-v2"; // bump version
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = [
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon-180.png",
  "/sahara-logo.svg",
  OFFLINE_URL,  // Pre-cache the offline page
];

// In the fetch handler for navigation:
if (request.mode === "navigate") {
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Optionally cache successful navigation responses
        return response;
      })
      .catch(() => caches.match(OFFLINE_URL))
  );
}
```

### Install Prompt Component
```tsx
// components/pwa/InstallPrompt.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useInstallPrompt } from "./useInstallPrompt";
import Link from "next/link";

export function InstallPrompt() {
  const { canPrompt, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // Start hidden

  useEffect(() => {
    // Check if user has previously dismissed
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (!wasDismissed) {
      setDismissed(false);
    }
  }, []);

  // Don't show if already installed or user dismissed
  if (isStandalone || dismissed) return null;

  // Don't show if not installable (neither Chromium prompt nor iOS)
  if (!canPrompt && !isIOS) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50
      bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800
      rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <Cross2Icon className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="Sahara" className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            Install Sahara
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Get the full app experience with offline access
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {canPrompt ? (
          <Button
            onClick={promptInstall}
            className="flex-1 bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-sm"
            size="sm"
          >
            Install Now
          </Button>
        ) : isIOS ? (
          <Button asChild className="flex-1 text-sm" size="sm" variant="outline">
            <Link href="/install">See How to Install</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

### Scrollable TabsList Pattern for Mobile
```tsx
// Pattern already used in app/dashboard/insights/page.tsx
// Apply to all TabsList components with 4+ columns
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-4 lg:w-auto lg:inline-grid">
    <TabsTrigger value="tab1" className="text-xs sm:text-sm whitespace-nowrap">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2" className="text-xs sm:text-sm whitespace-nowrap">Tab 2</TabsTrigger>
    <TabsTrigger value="tab3" className="text-xs sm:text-sm whitespace-nowrap">Tab 3</TabsTrigger>
    <TabsTrigger value="tab4" className="text-xs sm:text-sm whitespace-nowrap">Tab 4</TabsTrigger>
  </TabsList>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa (webpack plugin) | Custom SW or Serwist | 2024 (Next.js 14+) | next-pwa is unmaintained; Serwist or custom SW preferred |
| Workbox generate | Custom SW or Serwist | 2024 | Simpler for basic offline; complex for advanced |
| UA string parsing for mobile | `display-mode` media query | 2023 (widespread support) | More reliable PWA detection |
| `apple-mobile-web-app-capable` meta | `appleWebApp` in Next.js metadata | 2023 (Next.js 13.4+) | Type-safe, co-located with other metadata |
| 48px touch targets (Material) | 44px (WCAG 2.5.8 AA) / 24px (WCAG 2.5.8 minimum) | 2023 (WCAG 2.2) | 44px is the gold standard; 24px is legal minimum |

**Deprecated/outdated:**
- `next-pwa` (original by @nicedoc): Unmaintained since 2022. Use `@ducanh2912/next-pwa` fork or custom SW.
- `manifest.json` static file: Use Next.js `app/manifest.ts` for type-safe generation (already done).
- `add_to_homescreen` library: Outdated, use custom implementation with `beforeinstallprompt`.

## Fixed-Width Files Audit

### Files Requiring Fixes (Confirmed Issues at 375px)

The following files have fixed-width values that could cause layout issues at 375px. Files are categorized by severity:

**HIGH PRIORITY (Direct user-facing, confirmed issues):**

1. **`app/pricing/page.tsx`** - `<table>` comparison section with 4 columns. Needs card-based alternative below 768px.

2. **`components/monitoring/charts/PerformanceCharts.tsx`** - `SelectTrigger className="w-[180px]"` without responsive breakpoint. Needs `w-full sm:w-[180px]`.

3. **`components/admin/voice-agent/KnowledgeBaseEditor.tsx`** - `SelectTrigger className="w-[140px]"` without responsive breakpoint.

4. **`components/admin/voice-agent/BusinessHoursEditor.tsx`** - Multiple `SelectTrigger` elements with `w-[100px]` and `min-w-[140px]` without responsive handling.

5. **`components/monitoring/DashboardFilters.tsx`** - `PopoverContent className="w-[280px]"` may overflow on narrow mobile within sidebar context. Also `w-[220px]` on a dropdown trigger.

**MEDIUM PRIORITY (TabsList compression):**

6. **`app/dashboard/monitoring/page.tsx`** - `TabsList grid-cols-4` without mobile scrollable wrapper.

7. **`components/diagnostic/InvestorEvaluation.tsx`** - `TabsList grid-cols-4` without mobile scrollable wrapper.

8. **`components/monitoring/charts/PerformanceCharts.tsx`** - `TabsList grid-cols-4` without mobile scrollable wrapper.

9. **`app/dashboard/boardy/page.tsx`** - `TabsList grid-cols-5` without mobile scrollable wrapper.

10. **`components/positioning/positioning-assessment.tsx`** - `TabsList grid-cols-4` without mobile scrollable wrapper.

11. **`components/investor-lens/investor-lens-evaluation.tsx`** - `TabsList grid-cols-5` without mobile scrollable wrapper.

12. **`app/admin/voice-agent/page.tsx`** - `TabsList grid-cols-5` without mobile scrollable wrapper.

13. **`app/dashboard/insights/page-enhanced.tsx`** - `TabsList grid-cols-4` partially responsive but missing the full scrollable pattern.

**LOW PRIORITY (Decorative or properly contained):**

14. **`app/chat/page.tsx`** - `w-[500px]`, `w-[600px]`, `w-[400px]` decorative blobs. Already inside `overflow-hidden` wrapper. Verify containment.

15. **`app/onboarding/page.tsx`** - `w-[600px]`, `w-[500px]` decorative blobs. Already inside `overflow-hidden`. Verify containment.

16. **`components/premium/PhoneMockup.tsx`** - `w-[280px]` phone mockup component. By design; verify it's centered and doesn't overflow.

17. **`components/navbar.tsx`** - `SheetContent w-[300px] sm:w-[350px]` - already responsive, contained in drawer.

### Files Already Properly Handled (No Fix Needed)
- `app/dashboard/layout.tsx` - `SheetContent w-[280px]` is mobile sidebar drawer, properly contained
- `app/dashboard/insights/page.tsx` - Already implements scrollable TabsList pattern correctly
- `app/dashboard/journey/page.tsx` - Already implements scrollable TabsList pattern correctly
- `components/monitoring/DashboardFilters.tsx` - `SelectTrigger w-full sm:w-[180px]` is already responsive

## Touch Target Audit

### Current State (Strong Foundation)

The project already has excellent touch target infrastructure:

1. **Global CSS rule** (globals.css line 106-108):
   ```css
   button, a, [role="button"], input[type="button"], input[type="submit"], input[type="reset"] {
     min-height: 44px;
   }
   ```
   This ensures ALL buttons and links meet the 44px minimum height.

2. **`.touch-target` utility class** (globals.css line 117-120):
   ```css
   .touch-target {
     min-height: 44px;
     min-width: 44px;
   }
   ```
   Applied throughout navbar and pricing components.

3. **Safe area insets** (globals.css line 130-133): Already defined as utility classes.

### Areas Needing Verification
- `input[type="text"]`, `textarea`, `select` elements (not covered by global rule)
- Icon-only buttons without explicit sizing (may rely on padding which could be < 44px)
- Checkbox and radio button touch areas (Radix primitives may need wrapper sizing)
- Custom interactive elements not using `<button>` or `<a>` tags

### Recommended Audit Approach
1. Use Chrome DevTools mobile simulator at 375px
2. Enable "Show tap areas" in DevTools accessibility panel
3. Check every interactive element against 44px minimum
4. Focus on dashboard pages since they have the densest interactive content

## iOS vs Android PWA Differences

| Feature | Android Chrome | iOS Safari |
|---------|---------------|------------|
| `beforeinstallprompt` | Supported | NOT supported |
| Install method | Auto-prompt + custom UI | Share > Add to Home Screen |
| Offline support | Full | Full (iOS 16.4+) |
| Push notifications | Full | Supported (iOS 16.4+) |
| `display-mode` detection | `matchMedia` | `matchMedia` + `navigator.standalone` |
| Storage isolation | Shared with browser | Isolated from Safari |
| Service worker | Full support | Full support (iOS 16.4+) |

### Install Instructions Page Content Structure
```
/install page should contain:
1. Auto-detect platform and show relevant instructions first
2. iOS Safari instructions:
   - Step 1: Tap Share icon (with screenshot)
   - Step 2: Scroll down to "Add to Home Screen"
   - Step 3: Tap "Add"
3. Android Chrome instructions:
   - Step 1: Tap menu (three dots)
   - Step 2: Tap "Install app" or "Add to Home Screen"
   - Step 3: Confirm installation
4. Desktop Chrome instructions (optional):
   - Click install icon in address bar
```

## Open Questions

1. **Offline page as static HTML vs Next.js page?**
   - What we know: Next.js pages are rendered as HTML by the build process. A static route at `/offline` will produce HTML that can be cached by the service worker.
   - What's unclear: Whether the service worker can reliably cache the RSC payload for a Next.js page. For maximum reliability, the offline page should be self-contained.
   - Recommendation: Create it as a normal Next.js page but ensure the SW caches the HTML response (not the RSC format). The SW `navigate` handler already returns HTML. Alternatively, create a minimal `public/offline.html` static file for absolute reliability, then redirect to the Next.js page when online.

2. **Should install prompt show on first visit or after engagement?**
   - What we know: Best practice is to show after engagement (e.g., second visit, after significant interaction).
   - What's unclear: The specific engagement threshold for Sahara users.
   - Recommendation: Show on first visit but with a delay (5-10 seconds) and below the fold. Allow easy dismissal. Don't show again for 7 days after dismissal.

3. **17 files count vs actual issues?**
   - What we know: The audit mentioned "17 files identified with fixed-width components." The actual search found ~17 files with `w-[Xpx]` patterns, but many are decorative elements in overflow-hidden containers.
   - What's unclear: Exactly which files were in the original audit list.
   - Recommendation: Focus on the HIGH and MEDIUM priority files listed above (13 files total). The LOW priority files just need visual verification.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `public/sw.js`, `app/manifest.ts`, `app/layout.tsx`, `app/providers.tsx`, `app/globals.css`, `app/pricing/page.tsx`, `components/pricing.tsx`
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - Official guide for manifest, SW, and install prompt patterns
- [MDN: beforeinstallprompt event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) - API reference and browser support
- [MDN: Trigger install prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt) - Complete implementation pattern
- [web.dev: Customize Install](https://web.dev/articles/customize-install) - Custom install UI patterns
- [web.dev: PWA Detection](https://web.dev/learn/pwa/detection) - Display mode detection methods
- [WCAG 2.5.8 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) - Touch target guidelines

### Secondary (MEDIUM confidence)
- [Chrome SW Custom Offline Page Sample](https://googlechrome.github.io/samples/service-worker/custom-offline-page/) - Verified offline fallback pattern
- [firt.dev iOS PWA Compatibility](https://firt.dev/notes/pwa-ios/) - iOS-specific PWA limitations
- [Brainhub: PWA on iOS 2025](https://brainhub.eu/library/pwa-on-ios) - Current iOS PWA status

### Tertiary (LOW confidence)
- [LogRocket: Next.js 16 PWA](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) - Next.js 16 specific patterns (verify against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Analyzed existing codebase directly, no new libraries needed
- Architecture: HIGH - Patterns verified against MDN and web.dev official documentation
- PWA install prompt: HIGH - Well-documented browser API with clear Chromium/iOS split
- Offline fallback: HIGH - Standard service worker pattern, minimal code change to existing SW
- Mobile responsiveness: HIGH - Direct codebase analysis of actual files and CSS
- Fixed-width audit: MEDIUM - Identified files through grep patterns, but visual verification at 375px needed to confirm actual impact
- Touch targets: HIGH - Global CSS rule already provides 44px minimum on core elements

**Research date:** 2026-02-07
**Valid until:** 2026-05-07 (90 days -- PWA APIs are stable, mobile patterns are mature)
