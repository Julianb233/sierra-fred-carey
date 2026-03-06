# Research: Mobile-First Funnel at u.joinsahara.com

**Linear:** PERS-53
**Date:** 2026-03-05
**Status:** Research Complete — Ready for Implementation Planning

---

## Executive Summary

Build a stripped-down, mobile-first conversion funnel at `u.joinsahara.com` that funnels founders from ad traffic → value preview → signup → dashboard. The recommended approach is **single-codebase middleware routing** within the existing Next.js app, with a dedicated `/funnel` route group that has its own layout (no navbar/sidebar chrome). This avoids cross-domain auth issues, eliminates code duplication, and deploys through the existing Vercel pipeline.

---

## 1. Current State Analysis

### Existing Funnel Flow
```
joinsahara.com/  (Landing page)
  ├── Hero CTAs → /waitlist → redirects → /get-started
  ├── Navbar "Get Started Free" → /get-started
  ├── Pricing CTAs → /get-started
  └── Demo pages → /get-started

/get-started  (3-step wizard)
  Step 1: Choose startup stage (Ideation / Pre-seed / Seed / Series A+)
  Step 2: Choose #1 challenge (PMF / Fundraising / Team / Growth / Economics / Strategy)
  Step 3: Email + password
  → POST /api/onboard → celebration screen → /dashboard?welcome=true

/onboarding  (post-signup deeper setup, protected)
  WelcomeStep → StartupInfoStep → FredIntroStep → CompleteStep
```

### Key Observations
- The existing `/get-started` wizard is already 3 steps — a good pattern to build on
- Hero CTAs still point to `/waitlist` (which redirects to `/get-started`) — stale links
- No subdomain awareness exists in middleware or next.config.mjs
- Middleware handles auth protection + CORS + Sentry, no hostname checks
- Signup page (`/signup`) just redirects to `/get-started`
- State persists to localStorage (`sahara_onboarding_wizard` key)

---

## 2. Architecture Decision: Single Codebase + Middleware Routing

### Recommendation: Single codebase (strongly recommended)

| Factor | Single Codebase | Separate App |
|--------|----------------|--------------|
| Auth sharing | Native — same Supabase cookies | Cross-domain token sharing needed |
| Deployment | One Vercel project | Two projects, two pipelines |
| Shared components | Direct imports | npm package or copy-paste |
| Performance | Edge middleware (~0ms overhead) | Extra network hop |
| Maintenance | Single PR, single CI | Duplicated configs, drift risk |
| Vercel cost | One project | Two projects |
| Cookie domain | Automatic | Requires `.joinsahara.com` cookie config |

### Implementation Pattern

**Middleware hostname detection:**
```typescript
// middleware.ts — add to existing middleware
const hostname = request.headers.get('host') || ''
const isAppSubdomain = hostname.startsWith('u.')

if (isAppSubdomain) {
  const url = request.nextUrl.clone()
  url.pathname = `/funnel${url.pathname}`
  return NextResponse.rewrite(url)
}
```

**Folder structure:**
```
app/
  funnel/                    # All routes for u.joinsahara.com
    layout.tsx               # Minimal layout — no navbar, no sidebar
    page.tsx                 # Funnel entry / hero step
    [step]/
      page.tsx               # Dynamic step routing (/1, /2, /3, etc.)
    success/
      page.tsx               # Post-signup celebration
  (main)/                    # Existing joinsahara.com routes (unchanged)
```

**Local development:**
- Use `NEXT_PUBLIC_FUNNEL_BASE_URL` env var
- `localhost:3000/funnel` for dev (no hosts file changes needed)
- Middleware only rewrites when actual subdomain detected in production

**Vercel config:**
- Add `u.joinsahara.com` as custom domain in Vercel project settings
- Point DNS CNAME `u.joinsahara.com` → `cname.vercel-dns.com`

---

## 3. Funnel Design: Mobile-First Principles

### Layout Rules
- **Single-column layout only** — no multi-column grids on any step
- **Sticky bottom CTA bar** — primary action button in lower 1/3 of screen (thumb zone)
- **Minimum touch target: 48x48px** (exceeds 44px Apple HIG minimum)
- **One CTA per screen** — eliminate competing actions per step
- **Progress indicator** — dots or numbered steps, always visible

### Step Design (Proposed 4-Step Funnel)

| Step | Content | Purpose |
|------|---------|---------|
| **Landing** | Hero headline + social proof + single CTA | Hook attention, build trust |
| **Step 1** | "What stage is your startup?" (4 options) | Qualify + personalize |
| **Step 2** | "What's your biggest challenge?" (6 options) | Deepen intent signal |
| **Step 3** | Email + password (inline validation) | Convert |
| **Success** | Confetti + "Meet Fred" preview + redirect | Activate |

### Copy Principles
- **Action-specific CTA labels** — "Show me my score" not "Next"
- **Social proof above fold** — "10,000+ founders coached" on every step
- **Single data point per step** — reduce cognitive load
- **Under 2 minutes to first value** — target <90 seconds total funnel time

### Mobile Viewport Optimization
```css
/* Funnel-specific styles */
.funnel-step {
  min-height: 100dvh;          /* Dynamic viewport height (handles mobile chrome) */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: env(safe-area-inset-top) 1rem env(safe-area-inset-bottom);
}

.funnel-cta {
  position: sticky;
  bottom: 0;
  padding: 1rem;
  background: linear-gradient(transparent, var(--bg) 20%);
}
```

---

## 4. Performance Requirements

### Core Web Vitals Targets
| Metric | Target | Why |
|--------|--------|-----|
| LCP | < 2.0s | Hero content must paint fast on 3G |
| INP | < 150ms | Button taps must feel instant |
| CLS | < 0.05 | Zero layout shift — funnel credibility |
| FCP | < 1.2s | First content visible quickly |

### Optimization Strategies
1. **Server Components for funnel steps** — no client JS for initial render
2. **Separate layout.tsx** — does NOT import dashboard components (no bundle bloat)
3. **`next/image` with `priority`** on hero image — preloaded, WebP/AVIF auto-format
4. **`next/font` Geist** — already in project, zero external font requests
5. **Lazy analytics** — PostHog + Sentry load with `strategy="lazyOnload"` in funnel layout
6. **Prefetch next step** — `router.prefetch('/funnel/2')` on current step mount
7. **Minimal JS bundle** — no Framer Motion, no GSAP, no chart libs on funnel pages
8. **Service worker caching** — Serwist PWA already configured, funnel assets cached on return visits

### Bundle Size Budget
- Funnel pages: **< 50KB total JS** (compressed)
- No heavy dependencies: Framer Motion (~35KB), GSAP (~25KB), chart libraries
- Use CSS transitions only for funnel animations

---

## 5. Technical Implementation Plan

### Phase 1: Infrastructure (1-2 hours)
- [ ] Add hostname detection to `middleware.ts`
- [ ] Create `app/funnel/layout.tsx` (minimal: logo + progress dots + dark bg)
- [ ] Create `app/funnel/page.tsx` (landing/hero step)
- [ ] Add `u.joinsahara.com` to Vercel domains
- [ ] Add `NEXT_PUBLIC_FUNNEL_BASE_URL` env var

### Phase 2: Funnel Steps (2-3 hours)
- [ ] Step 1: Startup stage selector (reuse data from `/get-started`)
- [ ] Step 2: Challenge selector (reuse data from `/get-started`)
- [ ] Step 3: Email + password form (reuse validation from `/get-started`)
- [ ] Success screen with confetti + redirect to `/dashboard`
- [ ] Funnel state management (URL params or lightweight context — no localStorage)

### Phase 3: Mobile Polish (1-2 hours)
- [ ] Full-viewport step layout with sticky CTA
- [ ] Touch-optimized option cards (large tap targets)
- [ ] Haptic-style micro-animations (CSS only)
- [ ] Safe area insets for notched phones
- [ ] Test on iOS Safari, Chrome Android, Samsung Internet

### Phase 4: Analytics & Tracking (1 hour)
- [ ] Funnel step events (PostHog: `funnel_step_viewed`, `funnel_step_completed`)
- [ ] UTM parameter capture and persistence through funnel
- [ ] Conversion attribution (which ad/channel drove the signup)
- [ ] Drop-off tracking per step

### Phase 5: Performance Validation (30 min)
- [ ] Lighthouse mobile audit — target 95+ performance score
- [ ] Bundle analyzer — confirm < 50KB JS budget
- [ ] Test on throttled 3G connection
- [ ] Core Web Vitals pass on PageSpeed Insights

---

## 6. Reusable Assets from Existing Codebase

| Asset | Location | Reuse Strategy |
|-------|----------|---------------|
| Onboarding stage options | `app/get-started/page.tsx` | Extract to shared constants |
| Challenge options | `app/get-started/page.tsx` | Extract to shared constants |
| Signup API | `POST /api/onboard` | Direct reuse — same endpoint |
| Form validation (Zod) | `app/get-started/page.tsx` | Extract schemas to `lib/validation/` |
| Confetti animation | `app/get-started/page.tsx` | Import `canvas-confetti` |
| Brand colors / tokens | `app/globals.css` | Inherited via shared Tailwind config |
| Auth session | `lib/auth/` + middleware | Automatic — same Supabase instance |
| Analytics tracking | `lib/analytics/` | Import and use directly |
| UI components | `components/ui/` (shadcn) | Import directly |

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cookie domain mismatch | Auth doesn't work on subdomain | Verify Supabase cookie `domain` is `.joinsahara.com` |
| SEO duplicate content | Google penalizes both domains | `<link rel="canonical">` pointing to joinsahara.com; funnel pages are `noindex` |
| Mobile keyboard covering CTA | Users can't submit | Use `visualViewport` API or `position: sticky` instead of `fixed` |
| Slow 3G performance | High drop-off on mobile | Server Components + aggressive code splitting + < 50KB budget |
| A/B test pollution | Can't measure funnel vs main conversion | UTM source tagging + separate PostHog funnel events |

---

## 8. Open Questions for Product Owner

1. **Funnel entry content** — Should the hero be different copy from joinsahara.com? (e.g., ad-specific messaging like "Get your investor readiness score in 60 seconds")
2. **Value preview before signup** — Should we show a teaser result (e.g., partial investor score) before requiring account creation?
3. **Pricing step** — Should pricing be shown in the funnel, or go straight to free tier signup?
4. **Social login** — Should we add Google/Apple sign-in for the funnel to reduce friction?
5. **Post-funnel destination** — Should funnel signups land on a different dashboard view than organic signups?

---

## 9. Recommended Next Steps

1. **Create implementation issue** — PERS-XX: Build funnel pages at u.joinsahara.com
2. **Extract shared constants** — Pull stage/challenge options out of `/get-started` into `lib/constants/onboarding.ts`
3. **Build funnel layout + middleware** — Infrastructure first
4. **Build steps 1-3 + success** — Mobile-first, Server Components where possible
5. **DNS + Vercel domain setup** — Add `u.joinsahara.com` subdomain
6. **Deploy + test on real devices** — iPhone SE (smallest), iPhone 15, Pixel 7, Galaxy S24
7. **Set up funnel analytics** — PostHog events + conversion tracking
