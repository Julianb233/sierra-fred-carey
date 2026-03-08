---
phase: 88-event-launch-kit
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/event/[slug]/page.tsx
  - app/event/[slug]/layout.tsx
  - app/api/event/register/route.ts
  - lib/event/config.ts
  - lib/event/analytics.ts
  - components/event/event-landing.tsx
  - components/event/event-signup-form.tsx
autonomous: true

must_haves:
  truths:
    - "Scanning a QR code takes the user to a mobile-optimized event landing page"
    - "User can sign up directly from the landing page with email only"
    - "New signup gets a 14-day free Pro trial automatically"
    - "After signup, user is redirected to onboarding then Reality Lens"
    - "All event interactions are tracked with PostHog events"
    - "Landing page loads fast, is fully mobile-optimized, and branded"
  artifacts:
    - path: "app/event/[slug]/page.tsx"
      provides: "Dynamic event landing page route"
    - path: "app/api/event/register/route.ts"
      provides: "Event registration endpoint with trial activation"
      exports: ["POST"]
    - path: "lib/event/config.ts"
      provides: "Event configuration (slug, name, trial duration, redirect)"
      exports: ["EVENT_CONFIGS", "getEventConfig"]
    - path: "components/event/event-landing.tsx"
      provides: "Mobile-first event landing page component"
    - path: "components/event/event-signup-form.tsx"
      provides: "Streamlined email+password signup form"
  key_links:
    - from: "components/event/event-signup-form.tsx"
      to: "/api/event/register"
      via: "fetch POST with email, password, eventSlug"
      pattern: "fetch.*api/event/register"
    - from: "app/api/event/register/route.ts"
      to: "supabase.auth.signUp"
      via: "Supabase auth signup + metadata"
      pattern: "signUp"
    - from: "app/api/event/register/route.ts"
      to: "lib/event/analytics.ts"
      via: "PostHog event tracking"
      pattern: "trackEvent\|posthog"
---

<objective>
Build a QR-code-driven event landing page for the Palo Alto 200-founder event. Scan QR -> mobile landing page -> streamlined signup -> 14-day free Pro trial -> onboarding -> Reality Lens.

Purpose: Convert event attendees into Sahara users with minimal friction. The landing page must be mobile-first (QR scan = phone), fast-loading, and capture users in under 60 seconds.
Output: Dynamic event route at /event/[slug], registration API with trial activation, PostHog analytics tracking.
</objective>

<context>
@app/get-started/page.tsx - Existing signup wizard (3-step with stage + challenge selection)
@app/onboarding/page.tsx - Post-signup onboarding flow
@lib/analytics/events.ts - ANALYTICS_EVENTS constants for PostHog
@lib/constants.ts - UserTier enum
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create event config, registration API, and analytics helpers</name>
  <files>lib/event/config.ts, lib/event/analytics.ts, app/api/event/register/route.ts</files>
  <action>
  1. Create `lib/event/config.ts`:
     ```typescript
     export interface EventConfig {
       slug: string;
       name: string;
       tagline: string;
       date: string;
       location: string;
       trialDays: number;
       trialTier: "pro"; // tier granted during trial
       redirectAfterSignup: string; // where to send after registration
       active: boolean;
     }

     export const EVENT_CONFIGS: Record<string, EventConfig> = {
       "palo-alto-2026": {
         slug: "palo-alto-2026",
         name: "Sahara Founder Launch",
         tagline: "Your AI co-pilot for the startup journey. 14 days free.",
         date: "2026-03-22",
         location: "Palo Alto, CA",
         trialDays: 14,
         trialTier: "pro",
         redirectAfterSignup: "/onboarding",
         active: true,
       },
     };

     export function getEventConfig(slug: string): EventConfig | null {
       const config = EVENT_CONFIGS[slug];
       if (!config || !config.active) return null;
       return config;
     }
     ```

  2. Create `lib/event/analytics.ts`:
     - Export event name constants:
       ```typescript
       export const EVENT_ANALYTICS = {
         LANDING_VIEW: "event_landing_view",
         SIGNUP_START: "event_signup_start",
         SIGNUP_COMPLETE: "event_signup_complete",
         SIGNUP_ERROR: "event_signup_error",
         TRIAL_ACTIVATED: "event_trial_activated",
       } as const;
       ```

  3. Create `app/api/event/register/route.ts`:
     - POST handler accepting JSON: `{ email: string, password: string, eventSlug: string, fullName?: string }`
     - Validate eventSlug against getEventConfig -- return 404 if not found or inactive
     - Validate email format and password length (min 6 chars)
     - Create Supabase admin client (using service role key) for signup
     - Call `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, event_slug: eventSlug, trial_source: "event" } })`
     - After user creation, insert trial record: update user's profile in the `profiles` table to set `tier` to "pro" and `trial_ends_at` to NOW() + 14 days
     - Track PostHog event: EVENT_ANALYTICS.SIGNUP_COMPLETE with eventSlug and userId
     - Return `{ success: true, redirectTo: config.redirectAfterSignup }`
     - Handle duplicate email (Supabase error) gracefully: return 409 with "Account already exists. Please sign in."
     - Use rate limiting via Upstash if available (5 signups per IP per hour)
  </action>
  <verify>
  - `npx tsc --noEmit` passes
  - `npm run build` succeeds
  - `grep -c "getEventConfig" lib/event/config.ts` returns 1+
  - `grep -c "createUser\|signUp" app/api/event/register/route.ts` returns 1+
  - API route exports POST
  </verify>
  <done>Event config system supports multiple events via slugs. Registration API creates user with Supabase, activates 14-day Pro trial, tracks PostHog events. Rate limited.</done>
</task>

<task type="auto">
  <name>Task 2: Build mobile-first event landing page and signup form</name>
  <files>app/event/[slug]/page.tsx, app/event/[slug]/layout.tsx, components/event/event-landing.tsx, components/event/event-signup-form.tsx</files>
  <action>
  1. Create `app/event/[slug]/layout.tsx`:
     - Minimal layout with NO dashboard nav/sidebar -- clean standalone page
     - Include viewport meta for mobile optimization
     - Dark background (#0a0a0a) with Sahara orange accents
     - ```typescript
       export default function EventLayout({ children }: { children: React.ReactNode }) {
         return <div className="min-h-screen bg-[#0a0a0a] text-white">{children}</div>;
       }
       ```

  2. Create `components/event/event-signup-form.tsx`:
     - Props: `{ eventSlug: string, onSuccess: (redirectTo: string) => void }`
     - Fields: Full Name (optional), Email (required), Password (required, min 6)
     - Single "Get Started Free" button with Sahara orange (#ff6a1a) background
     - States: idle -> submitting -> success -> error
     - On submit: POST to /api/event/register with { email, password, eventSlug, fullName }
     - On success: call onSuccess(data.redirectTo)
     - On 409 (duplicate): show "Already have an account?" with link to /login
     - On error: show error message below form
     - Track EVENT_ANALYTICS.SIGNUP_START when user starts typing
     - Mobile-optimized: large touch targets (min 44px), large font inputs, full-width on mobile
     - Show "14-day free Pro trial. No credit card required." below the button

  3. Create `components/event/event-landing.tsx`:
     - Props: `{ config: EventConfig }`
     - Layout (top to bottom, single scroll, mobile-first):
       a. Sahara logo (small, top center)
       b. Event name + tagline (large heading)
       c. "What you get" -- 4 bullet points with icons: Reality Lens scoring, FRED AI coaching, Pitch Deck Review, Investor Matching
       d. Signup form (EventSignupForm component)
       e. Fred Cary photo + brief quote: "Every founder deserves a mentor who's been there."
       f. Footer: "Sahara -- Your AI Founder Operating System"
     - Use Framer Motion for subtle fade-in animations on scroll
     - Fully responsive: looks great on iPhone 12-15 viewport (375-430px wide)
     - No horizontal scroll, no tiny text, no overlapping elements

  4. Create `app/event/[slug]/page.tsx`:
     - Server component that reads params.slug
     - Call getEventConfig(slug) -- if null, return notFound()
     - Track EVENT_ANALYTICS.LANDING_VIEW via client component wrapper
     - Render EventLanding with the config
     - Generate metadata: title = config.name, description = config.tagline
     - Handle redirect after signup via useRouter in client wrapper

  5. Add metadata export for SEO:
     ```typescript
     export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
       const { slug } = await params;
       const config = getEventConfig(slug);
       if (!config) return { title: "Event Not Found" };
       return {
         title: `${config.name} | Sahara`,
         description: config.tagline,
       };
     }
     ```
  </action>
  <verify>
  - `npm run build` succeeds
  - `npx tsc --noEmit` passes
  - Navigating to /event/palo-alto-2026 renders the landing page (verify via build, no 404)
  - Navigating to /event/nonexistent returns 404
  - `grep -c "EventSignupForm" components/event/event-landing.tsx` returns 1+
  - `grep -c "getEventConfig" app/event/\\[slug\\]/page.tsx` returns 1+
  </verify>
  <done>Mobile-first event landing page at /event/palo-alto-2026 with streamlined signup form, 14-day trial activation, PostHog tracking, and redirect to onboarding. Ready for QR code generation pointing to this URL.</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds
- /event/palo-alto-2026 renders a mobile-optimized landing page
- /event/nonexistent returns 404
- Signup form POSTs to /api/event/register
- Successful signup creates user with Pro trial (14 days)
- PostHog events fire for landing view, signup start, signup complete
- No horizontal scroll on mobile viewports
</verification>

<success_criteria>
- QR code URL (joinsahara.com/event/palo-alto-2026) loads a fast, mobile-first landing page
- Signup requires only email + password (name optional)
- New user gets 14-day free Pro trial automatically
- After signup, redirects to /onboarding
- All interactions tracked in PostHog with event_slug property
- Page loads under 3 seconds on mobile
- Build and type check pass
</success_criteria>

<output>
After completion, create `.planning/phases/88-event-launch-kit/88-01-SUMMARY.md`
</output>
