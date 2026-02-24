# Phase 65: Mobile / UX Polish - Research

**Researched:** 2026-02-23
**Domain:** Serwist PWA, Framer Motion animations, WCAG 2.1 AA accessibility, Push notifications
**Confidence:** HIGH

## Summary

Phase 65 upgrades the existing custom service worker (`public/sw.js`) to Serwist-managed PWA caching, adds smooth page/interaction animations, ensures WCAG 2.1 AA compliance across all core pages, and hardens push notification reliability on mobile. The project already has substantial infrastructure from Phase 22 (PWA manifest, custom SW, offline page, install prompts, touch targets) and Phase 60 (axe-core a11y tests in CI). The primary work is: (1) migrating from the hand-rolled SW to Serwist for better precaching and cache strategies, (2) adding framer-motion page transitions and interaction animations to dashboard pages that currently lack them, (3) fixing remaining WCAG violations found by axe-core (especially on authenticated dashboard pages where aria attributes are sparse), and (4) ensuring push notifications work reliably across iOS 16.4+ and Android.

The project already uses `framer-motion@12.23.13`, has `@axe-core/playwright@4.11.1` in dev dependencies, has `web-push@3.6.7` for push notifications, and the build uses the `--webpack` flag (required for Serwist compatibility). The PWA manifest (`app/manifest.ts`), offline page (`app/offline/page.tsx`), install prompt (`components/pwa/InstallPrompt.tsx`), and service worker registration (`app/providers.tsx`) are all already in place.

**Primary recommendation:** Install `@serwist/next@9.5.4` and `serwist@9.5.6`, migrate `public/sw.js` to a Serwist-managed `app/sw.ts`, add framer-motion `AnimatePresence` page transitions to the dashboard layout, run axe-core audit to identify and fix all critical/serious WCAG violations, and add push notification retry logic with exponential backoff.

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.1 | App framework with App Router | Already in use |
| Framer Motion | 12.23.13 | Animation library | Already installed, used in get-started, contact, onboarding pages |
| Tailwind CSS | 4.1.13 | Responsive styling | Already in use throughout |
| Radix UI | various | Accessible component primitives | Already in use, WCAG compliant by default |
| web-push | 3.6.7 | Server-side push notifications | Already installed |
| @axe-core/playwright | 4.11.1 | Automated a11y testing | Already installed, tests exist |

### New Dependencies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @serwist/next | 9.5.4 | Next.js service worker integration | Maintained successor to next-pwa, supports App Router |
| serwist | 9.5.6 | Service worker toolkit (Workbox-based) | Precaching, runtime caching strategies, offline support |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Serwist | Keep custom sw.js | Custom SW works but lacks automatic precache manifest injection, versioned caching strategies, and background sync. Serwist is explicitly required by project requirements. |
| Framer Motion | CSS animations | CSS animations are simpler but lack AnimatePresence exit animations, layout animations, and gesture support that framer-motion provides. Already installed. |
| axe-core | pa11y | axe-core already integrated in Playwright tests. pa11y would duplicate tooling. |

**Installation:**
```bash
npm install @serwist/next@^9.5.4
npm install -D serwist@^9.5.6
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  sw.ts                    # NEW: Serwist service worker source (replaces public/sw.js)
  manifest.ts              # EXISTS: PWA manifest (unchanged)
  providers.tsx             # EXISTS: Remove manual SW registration (Serwist handles it)
  offline/
    page.tsx               # EXISTS: Offline fallback page (unchanged)
  layout.tsx               # MODIFY: Add AnimatePresence wrapper for page transitions
  dashboard/
    layout.tsx             # MODIFY: Add page transition animations
components/
  pwa/
    InstallPrompt.tsx      # EXISTS: Install prompt (unchanged)
    useInstallPrompt.ts    # EXISTS: Install prompt hook (unchanged)
  animations/
    PageTransition.tsx     # NEW: Reusable page transition wrapper
    FadeIn.tsx             # NEW: Scroll-triggered fade-in component
tests/
  e2e/
    accessibility.spec.ts             # EXISTS: Public page a11y tests
    accessibility-authenticated.spec.ts # EXISTS: Dashboard a11y tests (expand page list)
```

### Pattern 1: Serwist Service Worker Setup
**What:** Replace custom `public/sw.js` with Serwist-managed `app/sw.ts`
**When to use:** This is the primary migration for this phase
**Example:**
```typescript
// app/sw.ts
// Source: https://serwist.pages.dev/docs/next/getting-started
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// ---------- Web Push Notification Handlers ----------
// Migrate existing push handlers from public/sw.js

self.addEventListener("push", (event) => {
  const DEFAULT_ICON = "/icon-192.png";
  const DEFAULT_BADGE = "/icon-192.png";
  let payload = {
    title: "Sahara",
    body: "You have a new notification",
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: "/dashboard",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data, icon: data.icon || DEFAULT_ICON, badge: data.badge || DEFAULT_BADGE };
    } catch {
      const text = event.data.text();
      if (text) payload.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: { url: payload.url, ...(payload.data || {}) },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

serwist.addEventListeners();
```

### Pattern 2: next.config.mjs Serwist Integration
**What:** Wrap existing Next.js config with Serwist
**Example:**
```javascript
// next.config.mjs
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  // ... existing config
};

// Serwist wraps first, then Sentry wraps the result
const serwistConfig = withSerwist(nextConfig);
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(serwistConfig, { /* existing sentry options */ })
  : serwistConfig;

export default finalConfig;
```

### Pattern 3: Framer Motion Page Transitions
**What:** Add smooth page transitions using AnimatePresence in dashboard layout
**When to use:** Dashboard layout for route transitions
**Example:**
```tsx
// components/animations/PageTransition.tsx
"use client";

import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

### Pattern 4: Scroll-Triggered Fade-In
**What:** Elements fade in as they enter the viewport
**When to use:** Dashboard cards, list items, content sections
**Example:**
```tsx
// components/animations/FadeIn.tsx
"use client";

import { motion } from "framer-motion";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

### Pattern 5: Reduced Motion Respect
**What:** Disable animations for users who prefer reduced motion
**When to use:** All framer-motion animations must respect this
**Example:**
```tsx
// Already in globals.css:
// @media (prefers-reduced-motion: reduce) { ... }
// But framer-motion needs explicit handling:

import { useReducedMotion } from "framer-motion";

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {/* content */}
    </motion.div>
  );
}
```

### Anti-Patterns to Avoid
- **Animating layout properties (width, height) instead of transform:** Use `scale`, `translateX/Y`, `opacity` for 60fps animations. Never animate `width`, `height`, `top`, `left` directly.
- **Missing `prefers-reduced-motion` handling:** All animations MUST be suppressed when user prefers reduced motion. Framer Motion's `useReducedMotion` hook or the existing CSS media query in `globals.css` handles this.
- **Keeping manual SW registration alongside Serwist:** Remove the `ServiceWorkerRegistrar` component from `providers.tsx` after Serwist migration -- Serwist handles registration automatically via its Next.js plugin.
- **Running Serwist with Turbopack in dev:** Serwist does not support Turbopack. The build already uses `--webpack` flag. For dev, set `disable: true` in Serwist config for development.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Precache manifest generation | Manual asset list in sw.js | Serwist `self.__SW_MANIFEST` | Serwist auto-generates the precache manifest from the build output. Manual lists miss assets and break caching. |
| Runtime cache strategies | Custom fetch handlers | Serwist `defaultCache` + custom `runtimeCaching` | Serwist provides StaleWhileRevalidate, CacheFirst, NetworkFirst strategies with proper cache expiration. |
| Background sync for push | Custom retry logic | Serwist `BackgroundSyncPlugin` | Handles offline-to-online push subscription re-registration automatically. |
| Focus management in modals | Manual `tabIndex` manipulation | Radix UI Dialog/AlertDialog | Already used. Radix handles focus trapping, escape-to-close, and screen reader announcements. |
| Skip-to-content link | Custom implementation | Standard `<a href="#main-content">` pattern | Simple HTML pattern, no library needed. |
| Color contrast checking | Manual review | axe-core automated checks | Already integrated in Playwright tests. |
| Page transition orchestration | Manual route change detection | Framer Motion `AnimatePresence` | Handles mount/unmount animations, exit animations, and layout transitions. |

**Key insight:** The project already has 80% of the mobile/UX infrastructure from Phase 22. This phase is about upgrading from manual implementations to maintained libraries (Serwist) and filling gaps (animations on dashboard pages, expanding a11y test coverage).

## Common Pitfalls

### Pitfall 1: Serwist + Sentry Config Wrapping Order
**What goes wrong:** `withSerwistInit` and `withSentryConfig` both wrap the Next.js config. Wrong ordering causes one to override the other's webpack modifications.
**Why it happens:** Both use Next.js's `webpack` config hook internally.
**How to avoid:** Serwist wraps first (inner), Sentry wraps second (outer). This ensures Serwist's service worker compilation happens before Sentry adds source map upload.
**Warning signs:** Build succeeds but `public/sw.js` is not generated, or Sentry source maps are missing.

### Pitfall 2: Serwist Turbopack Incompatibility
**What goes wrong:** `next dev` fails or SW is not generated because Turbopack is the default dev bundler in Next.js 16.
**Why it happens:** Serwist requires webpack for service worker compilation. Turbopack does not support Serwist's webpack plugin.
**How to avoid:** Set `disable: process.env.NODE_ENV === "development"` in Serwist config. The build command already uses `--webpack` flag. For local PWA testing, use `next dev --webpack`.
**Warning signs:** Console warning about Turbopack incompatibility, or SW not loading in dev.

### Pitfall 3: Stale Service Worker After Serwist Migration
**What goes wrong:** Users keep the old `sahara-v2` cache from the custom SW while the new Serwist SW uses different cache names.
**Why it happens:** Serwist uses its own cache naming convention. The old caches are never cleaned up.
**How to avoid:** Add cleanup logic in the new Serwist SW's `activate` event to delete caches starting with `sahara-`. Serwist's `skipWaiting` + `clientsClaim` ensures immediate activation.
**Warning signs:** Users see stale content after deployment, or double-cached assets bloating storage.

### Pitfall 4: AnimatePresence Requires Key Prop for Route Changes
**What goes wrong:** Page transitions don't animate because AnimatePresence needs changing `key` props to detect route changes.
**Why it happens:** In App Router, the layout wraps children but the children don't automatically get unique keys per route.
**How to avoid:** Use `usePathname()` as the key for the motion wrapper inside AnimatePresence.
**Warning signs:** Pages appear instantly without transition animation.

### Pitfall 5: axe-core False Positives on Dynamic Content
**What goes wrong:** axe-core reports violations on content that hasn't finished loading (skeleton screens, lazy-loaded images).
**Why it happens:** The test runs analysis before all dynamic content has rendered.
**How to avoid:** Use `page.waitForLoadState("networkidle")` (already done in existing tests) and add specific `waitForSelector` for key content before running axe. Exclude known dynamic regions with `axe.exclude()`.
**Warning signs:** Flaky a11y test failures that pass on retry.

### Pitfall 6: Push Notification Permission Denied Permanently
**What goes wrong:** User denies push permission and the app shows broken notification UI.
**Why it happens:** Once denied, browsers cache the denial. There is no way to re-prompt programmatically.
**How to avoid:** Check `Notification.permission` before showing any notification UI. If "denied", show instructions to re-enable in browser settings instead of a subscribe button.
**Warning signs:** Users report "notifications don't work" after previously denying the permission.

### Pitfall 7: iOS PWA Push Requires Separate Handling
**What goes wrong:** Push notifications don't work on iOS PWA.
**Why it happens:** iOS 16.4+ supports push notifications for PWAs BUT only when the app is added to home screen (standalone mode). Safari browser tabs do NOT support web push.
**How to avoid:** Detect `isStandalone` before offering push subscription. On iOS non-standalone, prompt user to install the PWA first.
**Warning signs:** Push subscriptions succeed on iOS but notifications never appear.

## Code Examples

### Serwist TypeScript Configuration
```json
// tsconfig.json additions
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  },
  "exclude": [
    "node_modules",
    "public/sw.js"
  ]
}
```

### Remove Manual SW Registration
```tsx
// app/providers.tsx - REMOVE ServiceWorkerRegistrar
// Serwist handles SW registration automatically via its Next.js plugin.
// The ServiceWorkerRegistrar component should be deleted.

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <TierProvider>
        {/* ServiceWorkerRegistrar REMOVED - Serwist handles this */}
        <InstallPrompt />
        {children}
      </TierProvider>
    </NextThemesProvider>
  );
}
```

### .gitignore Updates
```gitignore
# Serwist generated files
public/sw.js
public/sw.js.map
public/swe-worker-*.js
```

### WCAG 2.1 AA Audit Fix Patterns
```tsx
// Common fixes needed across dashboard pages:

// 1. Missing skip-to-content link (add to app/layout.tsx)
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black">
  Skip to main content
</a>

// 2. Missing heading hierarchy (dashboard pages often jump h1 -> h3)
// Ensure every page has exactly one h1, followed by h2, h3 in order

// 3. Color contrast on muted text
// Tailwind's text-gray-400 on white = 3.9:1 (FAILS AA)
// Use text-gray-600 on white = 5.7:1 (PASSES AA)
// Or text-gray-500 on white = 4.6:1 (PASSES AA for large text only)

// 4. ARIA labels on icon-only buttons
<button aria-label="Close dialog">
  <Cross2Icon className="h-4 w-4" />
</button>

// 5. Form labels (inputs must have associated labels)
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// 6. Live regions for dynamic content updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### Push Notification Reliability Improvements
```typescript
// lib/push/subscribe.ts - Retry logic for push subscription
export async function subscribeToPush(retries = 3): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null;
  if (Notification.permission === "denied") return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibility: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // Register with backend
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
          },
          userAgent: navigator.userAgent,
        }),
      });

      return subscription;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  return null;
}
```

### Expanded Accessibility Test Coverage
```typescript
// tests/e2e/accessibility-authenticated.spec.ts
// Expand to cover ALL core dashboard pages
const authenticatedPages = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Chat", path: "/chat" },
  { name: "Check-ins", path: "/check-ins" },
  { name: "Settings", path: "/dashboard/settings" },
  { name: "Next Steps", path: "/dashboard/next-steps" },
  // ADD these pages:
  { name: "Strategy", path: "/dashboard/strategy" },
  { name: "Insights", path: "/dashboard/insights" },
  { name: "Journey", path: "/dashboard/journey" },
  { name: "Coaching", path: "/dashboard/coaching" },
  { name: "Pitch Deck", path: "/dashboard/pitch-deck" },
  { name: "Investor Targeting", path: "/dashboard/investor-targeting" },
  { name: "Monitoring", path: "/dashboard/monitoring" },
  { name: "Communities", path: "/dashboard/communities" },
  { name: "Notifications", path: "/dashboard/notifications" },
  { name: "Profile Snapshot", path: "/dashboard/profile/snapshot" },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa (unmaintained) | @serwist/next 9.x | 2024 | Active maintenance, App Router support, Workbox 7 based |
| Custom sw.js with manual cache lists | Serwist auto-generated precache manifest | 2024 | No more missed assets, automatic versioning |
| CSS transition-based page changes | Framer Motion AnimatePresence | Stable since 2023 | Exit animations, layout animations, gesture support |
| Manual a11y testing | axe-core + Playwright in CI | Phase 60 (already done) | Automated regression prevention |
| WCAG 2.0 AA | WCAG 2.1 AA | 2018 (but EAA enforcement 2025) | Added mobile a11y criteria (orientation, touch targets, motion) |

**Deprecated/outdated:**
- `next-pwa` (@nicedoc): Unmaintained since 2022. Use `@serwist/next`.
- `@ducanh2912/next-pwa`: Was a fork but `@serwist/next` is the canonical successor.
- Manual `ServiceWorkerRegistrar` component: Serwist handles registration automatically.

## Open Questions

1. **Serwist + Sentry wrapping order verification**
   - What we know: Both use webpack config hooks. Serwist should wrap inner, Sentry outer.
   - What's unclear: Whether the current `withSentryConfig` handles nested webpack configs correctly with Serwist.
   - Recommendation: Test the build output to verify `public/sw.js` is generated AND Sentry source maps upload correctly. If conflicts occur, use `@serwist/next`'s `additionalPrecacheEntries` to manually add critical routes.

2. **Framer Motion v12 SSR crash workaround**
   - What we know: `app/page.tsx` has a comment: "Dynamic imports with SSR disabled to prevent framer-motion@12 useContext crash". This suggests framer-motion v12 has SSR issues.
   - What's unclear: Whether this affects all usage or just specific patterns.
   - Recommendation: Use `"use client"` directive on all components using framer-motion. Use dynamic imports with `{ ssr: false }` only where the crash actually occurs. Test page transitions in the dashboard layout (which is already a client component).

3. **Which dashboard pages have the most WCAG violations?**
   - What we know: The dashboard pages have very few `aria-*` attributes (only 1 file in `app/dashboard` matched aria/role/sr-only patterns). Public pages are better covered by Phase 60 tests.
   - What's unclear: Exact violation count per page -- requires running the axe-core audit.
   - Recommendation: Run `npx playwright test accessibility` first to get a baseline, then prioritize fixes by page traffic (dashboard home, chat, check-ins first).

4. **Push notification service worker scope after Serwist migration**
   - What we know: The existing `public/sw.js` handles push events directly. Serwist compiles `app/sw.ts` to `public/sw.js`.
   - What's unclear: Whether Serwist's compilation preserves custom event listeners added after `serwist.addEventListeners()`.
   - Recommendation: Add push event listeners BEFORE `serwist.addEventListeners()` in `app/sw.ts` and verify they work after build.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `public/sw.js`, `app/manifest.ts`, `app/providers.tsx`, `app/globals.css`, `tsconfig.json`, `next.config.mjs`, `package.json`
- [Serwist official docs - Getting Started](https://serwist.pages.dev/docs/next/getting-started) - Setup guide for @serwist/next
- [@serwist/next npm](https://www.npmjs.com/package/@serwist/next) - v9.5.4 (published 2026-02-22)
- [serwist npm](https://www.npmjs.com/package/serwist) - v9.5.6 (published 2026-02-13)
- Existing Phase 22 research (`.planning/phases/22-pwa-mobile-polish/22-RESEARCH.md`) - Comprehensive PWA patterns already documented and implemented
- Existing a11y tests: `tests/e2e/accessibility.spec.ts`, `tests/e2e/accessibility-authenticated.spec.ts`

### Secondary (MEDIUM confidence)
- [Aurora Scharff: PWA Icons in Next.js 16 with Serwist](https://aurorascharff.no/posts/dynamically-generating-pwa-app-icons-nextjs-16-serwist/) - Confirmed Turbopack incompatibility, webpack workaround
- [WCAG 2.1 specification](https://www.w3.org/TR/WCAG21/) - Official success criteria
- [React Accessibility Best Practices](https://www.allaccessible.org/blog/react-accessibility-best-practices-guide) - POUR principles in React

### Tertiary (LOW confidence)
- [LogRocket: Next.js 16 PWA with Serwist](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) - General setup patterns

## Metadata

**Confidence breakdown:**
- Serwist migration: HIGH - Official docs verified, version confirmed on npm, webpack compatibility confirmed (build already uses --webpack)
- Animation patterns: HIGH - framer-motion already installed and used in project, patterns well-established
- WCAG compliance: MEDIUM - axe-core testing exists but actual violation count unknown until audit runs; dashboard pages appear to have sparse aria attributes
- Push notifications: HIGH - Infrastructure fully in place (web-push, push subscription API, SW push handlers), needs reliability hardening only
- Turbopack compatibility: HIGH - Confirmed Serwist does NOT support Turbopack; project build already uses --webpack flag

**Research date:** 2026-02-23
**Valid until:** 2026-05-23 (90 days -- Serwist 9.x is stable, WCAG 2.1 AA is stable, framer-motion 12.x is stable)
