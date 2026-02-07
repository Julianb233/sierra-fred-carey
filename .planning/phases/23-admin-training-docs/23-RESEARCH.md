# Phase 23: Admin Training Docs - Research

**Researched:** 2026-02-07
**Domain:** Admin-only documentation UI, role-based access control, static content pages for voice rules and framework reference
**Confidence:** HIGH

## Summary

This research investigates what is needed to create an admin-only in-app reference section (`/dashboard/admin/training`) documenting FRED's communication style, frameworks, agent behavior, and identity. The investigation reveals two distinct admin auth systems exist in the codebase, and the new training docs route sits at the boundary between them. The content for all five pages already exists in code -- `fred-brain.ts` (425 lines), `prompts.ts` (260 lines), agent prompts (3 files), agent tools (3 files), and `fred-agent-voice.ts` -- and needs to be rendered as readable HTML, not rebuilt.

**Key architectural decisions:**
1. **Route location**: The requirements specify `/dashboard/admin/training`, which is inside the authenticated user dashboard (`app/dashboard/`), NOT inside the standalone admin panel (`app/admin/`). This means the page lives under the Supabase auth context (user login), not the admin session-cookie context.
2. **Admin gating**: The existing admin panel at `/admin/` uses `ADMIN_SECRET_KEY` + session cookies via `isAdminSession()`. The dashboard at `/dashboard/` uses Supabase auth. Since `/dashboard/admin/training` is under `/dashboard/`, it needs BOTH: (a) Supabase user authentication (already handled by middleware) AND (b) an admin check. There is no `role` column in the `profiles` table. The simplest approach is an env-var allowlist (`ADMIN_EMAILS`) or reusing `isAdminSession()` in the page.
3. **Content approach**: All training doc content comes from existing code exports. Pages should render these as formatted, readable reference guides -- not editable forms. This is a pure static-content UI phase with zero API routes needed for content delivery.

## Standard Stack

No new libraries are needed. This phase uses only existing project dependencies.

### Core (already in project)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| `lib/fred-brain.ts` | Fred Cary knowledge base | Source data for all 5 training doc pages |
| `lib/ai/prompts.ts` | System prompts, COACHING_PROMPTS, frameworks | Source data for Framework Reference and Communication Style |
| `lib/agents/*/prompts.ts` | Agent system prompts | Source data for Agent Behavior guide |
| `lib/agents/*/tools.ts` | Agent tool definitions | Source data for Agent Behavior guide (tool names + descriptions) |
| `lib/agents/fred-agent-voice.ts` | Shared agent voice constant | Source data for Communication Style |
| `lib/fred/voice.ts` | Voice preamble builder | Source data for Communication Style |
| `lib/auth/admin.ts` | Admin auth (session + header) | Auth gating for the training route |
| shadcn/ui | Card, Tabs, Badge, etc. | UI components for rendering content |
| Tailwind CSS | Styling | Consistent with existing dashboard pages |
| lucide-react | Icons | Used throughout the dashboard |

### Key Data Exports Available for Rendering

| Export | Source File | What It Contains | Mapped To |
|--------|-----------|------------------|-----------|
| `FRED_IDENTITY` | `fred-brain.ts` | Name, roles, tagline, social handles, websites | ADMIN-05: Identity page |
| `FRED_BIO` | `fred-brain.ts` | Years experience, companies, IPOs, education, origin story | ADMIN-05: Identity page |
| `FRED_COMPANIES` | `fred-brain.ts` | Current ventures (3), exits (6), summary stats | ADMIN-05: Identity page |
| `FRED_PHILOSOPHY` | `fred-brain.ts` | 6 core principles with quotes and teachings | ADMIN-05: Identity page |
| `FRED_COMMUNICATION_STYLE` | `fred-brain.ts` | voice (primary/secondary/tone), characteristics (6), doNot rules (5), topicsExpertise (11) | ADMIN-02: Communication Style |
| `FRED_MEDIA` | `fred-brain.ts` | Social metrics (5 platforms), publications (12), recognition (2), podcast count | ADMIN-05: Identity page |
| `FRED_TESTIMONIALS` | `fred-brain.ts` | 4 testimonials with names/roles | ADMIN-05: Identity page |
| `SAHARA_MESSAGING` | `fred-brain.ts` | Vision, positioning, value props, differentiators | ADMIN-05: Identity page |
| `MARKETING_STATS` | `fred-brain.ts` | Capital raised, founders coached, companies, IPOs | ADMIN-05: Identity page |
| `FRED_CAREY_SYSTEM_PROMPT` | `prompts.ts` | Full 184-line persona prompt (rendered as reference) | ADMIN-02: Communication Style |
| `COACHING_PROMPTS` | `prompts.ts` | 5 topic prompts (fundraising, pitchReview, strategy, positioning, mindset) | ADMIN-03: Framework Reference |
| `FRED_AGENT_VOICE` | `fred-agent-voice.ts` | Concise shared voice constant for agent tools | ADMIN-02: Communication Style |
| `buildFredVoicePreamble()` | `voice.ts` | Composable voice builder with options | ADMIN-02: Communication Style |
| `FOUNDER_OPS_SYSTEM_PROMPT` | `agents/founder-ops/prompts.ts` | Founder Ops agent persona | ADMIN-04: Agent Behavior |
| `FUNDRAISING_SYSTEM_PROMPT` | `agents/fundraising/prompts.ts` | Fundraising agent persona | ADMIN-04: Agent Behavior |
| `GROWTH_SYSTEM_PROMPT` | `agents/growth/prompts.ts` | Growth agent persona | ADMIN-04: Agent Behavior |
| `founderOpsTools` | `agents/founder-ops/tools.ts` | 4 tools: draftEmail, createTask, scheduleMeeting, weeklyPriorities | ADMIN-04: Agent Behavior |
| `fundraisingTools` | `agents/fundraising/tools.ts` | 4 tools: investorResearch, outreachDraft, pipelineAnalysis, meetingPrep | ADMIN-04: Agent Behavior |
| `growthTools` | `agents/growth/tools.ts` | 4 tools: channelAnalysis, experimentDesign, funnelAnalysis, contentStrategy | ADMIN-04: Agent Behavior |

## Architecture Patterns

### Two Admin Auth Systems (Critical to Understand)

The project has TWO separate admin authentication systems. Understanding when to use each is critical for ADMIN-01.

#### System 1: Standalone Admin Panel (`/admin/*`)

| Aspect | Details |
|--------|---------|
| **Route** | `app/admin/` (NOT under dashboard) |
| **Auth mechanism** | `ADMIN_SECRET_KEY` env var + session cookie (`adminSession`) |
| **Auth check (layouts)** | `isAdminSession()` from `lib/auth/admin.ts` -- reads `adminSession` cookie via Next.js `cookies()` API |
| **Auth check (API routes)** | `isAdminRequest(request)` from `lib/auth/admin.ts` -- checks cookie OR `x-admin-key` header |
| **Session store** | In-memory `Map<string, AdminSession>` with 24h TTL |
| **Login flow** | POST `/api/admin/login` with `adminKey` -> timing-safe compare against `ADMIN_SECRET_KEY` -> create session -> set cookie |
| **Layout** | `app/admin/layout.tsx` -- standalone nav with Dashboard, Prompts, Config, A/B Tests links |
| **NOT under user dashboard** | Completely separate from Supabase auth. No user identity. No tier. |

#### System 2: User Dashboard (`/dashboard/*`)

| Aspect | Details |
|--------|---------|
| **Route** | `app/dashboard/` |
| **Auth mechanism** | Supabase auth (session cookie managed by `@supabase/ssr`) |
| **Auth check** | Root `middleware.ts` -> `isProtectedRoute("/dashboard")` -> redirect to `/login` if no user |
| **User identity** | Full user context: email, name, tier, profile from `profiles` table |
| **Layout** | `app/dashboard/layout.tsx` -- sidebar nav with tier-gated items |
| **No admin concept** | `profiles` table has NO `role` column. No built-in admin flag for Supabase users. |

#### Where `/dashboard/admin/training` Fits

The requirement says `/dashboard/admin/training`. This is:
- **Inside** the Supabase-authenticated dashboard (middleware already protects `/dashboard/*`)
- **NOT inside** the standalone admin panel at `/admin/`
- Needs admin-level access control WITHIN the user dashboard context

**Challenge:** There is no `role` column in the `profiles` table and no concept of "admin user" in the Supabase auth context. The `types/auth.ts` defines a `UserRole` enum with `ADMIN` but it is only used in the generic JWT middleware utilities (`middleware-utils.ts`), NOT in the actual Supabase auth flow.

### Admin Gating Options for ADMIN-01

Three viable approaches, ordered by implementation simplicity:

#### Option A: Reuse Existing Admin Session (Recommended)

Check `isAdminSession()` from `lib/auth/admin.ts` in the page's server component. If the user has BOTH a valid Supabase session (from dashboard middleware) AND a valid admin session cookie (from having logged into `/admin/login`), they can access the training docs.

**Pros:**
- Zero database changes
- Zero new env vars
- Reuses battle-tested admin auth from Phase 10/11
- Admin must have logged in via `/admin/login` first
- Works immediately

**Cons:**
- Admin must separately log into `/admin/login` before visiting `/dashboard/admin/training`
- Admin session cookie is separate from Supabase session

**Implementation:**
```typescript
// app/dashboard/admin/training/layout.tsx
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth/admin";

export default async function TrainingDocsLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isAdminSession();
  if (!isAdmin) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
```

#### Option B: Email Allowlist via Env Var

Add `ADMIN_EMAILS` env var (comma-separated list). In the training docs layout, check the logged-in Supabase user's email against the allowlist.

**Pros:**
- Clean UX: no separate admin login needed
- Easy to configure in Vercel env vars
- User stays in dashboard context

**Cons:**
- New env var to manage
- Must read Supabase user in server component to get email

**Implementation:**
```typescript
// app/dashboard/admin/training/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TrainingDocsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  if (!user || !adminEmails.includes(user.email?.toLowerCase() || "")) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
```

#### Option C: Add `role` Column to `profiles` Table

Add a `role TEXT DEFAULT 'user'` column to the `profiles` table. Check `role = 'admin'` in the layout.

**Pros:**
- Cleanest long-term architecture
- Supports future RBAC needs

**Cons:**
- Database migration required
- Must seed admin role for existing users
- Overkill for current single-admin use case

**Recommendation:** Option A is the simplest and most secure. It reuses the existing, audited admin auth system with zero new infrastructure. The only UX cost is that the admin must have an active admin session, which they already need for `/admin/` anyway. If the team prefers no separate login step, Option B is a clean alternative.

### Page Architecture

The requirement calls for 5 pages (ADMIN-02 through ADMIN-05) plus the route/access control (ADMIN-01). The natural structure is:

```
app/dashboard/admin/training/
  layout.tsx              -- Admin gate + sub-nav (ADMIN-01)
  page.tsx                -- Landing/overview page (links to sections)
  communication/page.tsx  -- ADMIN-02: Fred's Communication Style
  frameworks/page.tsx     -- ADMIN-03: Framework Reference
  agents/page.tsx         -- ADMIN-04: Agent Behavior Guide
  identity/page.tsx       -- ADMIN-05: FRED Identity & Background
```

Alternatively, a single page with tabs (matching the voice-agent admin page pattern):

```
app/dashboard/admin/training/
  layout.tsx              -- Admin gate (ADMIN-01)
  page.tsx                -- Tabbed page with 4 tabs (ADMIN-02, -03, -04, -05)
```

**Recommendation:** Use the tabbed single-page approach. This matches the existing `app/admin/voice-agent/page.tsx` pattern, reduces navigation complexity, and keeps all reference material in one place. The tabs pattern is already used extensively (voice-agent admin has 5 tabs, journey page has 3 tabs).

### Content Rendering Approach

All content comes from TypeScript exports. Two approaches:

**Approach A: Direct Import (Recommended)**

Import the exports directly into the page component and render them as formatted JSX. Since these are `as const` objects, they can be imported into server components.

```typescript
import { FRED_COMMUNICATION_STYLE, FRED_PHILOSOPHY } from "@/lib/fred-brain";

// Render as formatted cards/lists
```

**Pros:** Type-safe, always in sync with actual code, zero API routes, zero data fetching.
**Cons:** Content changes require code redeploy (which is acceptable since these ARE code).

**Approach B: API Route + Client Fetch**

Create API routes that return the data, fetch in client component.

**Pros:** Could add caching/transformation layer.
**Cons:** Unnecessary complexity for read-only reference data. Adds API surface to maintain.

**Recommendation:** Approach A. The training docs are a reference to what IS in the code. Importing directly ensures they are always accurate. No API routes needed.

### UI Patterns to Follow

Based on examination of existing admin and dashboard pages:

| Pattern | Source | Reuse For |
|---------|--------|-----------|
| Tabs layout with icons | `app/admin/voice-agent/page.tsx` | Main training page with 4 content tabs |
| Card grid layout | `app/admin/page.tsx` (dashboard stats) | Identity page sections |
| Heading + description + content | `app/admin/config/page.tsx` | Each training section header |
| Badge for categories | `app/admin/prompts/page.tsx` | Agent tool badges, framework labels |
| `"use client"` tabs page | `app/admin/voice-agent/page.tsx` | Needed for tab state management |
| Server component layout with auth check | `app/admin/layout.tsx` | Training docs layout with admin gate |

### File-by-File Change Map

| File | Change Type | Complexity | Requirement |
|------|-------------|------------|-------------|
| `app/dashboard/admin/training/layout.tsx` (NEW) | Admin gate server component | Low | ADMIN-01 |
| `app/dashboard/admin/training/page.tsx` (NEW) | Main tabbed page with 4 content sections | Medium | ADMIN-02, -03, -04, -05 |
| `app/dashboard/layout.tsx` | NO CHANGE (file is locked per MEMORY.md) | N/A | N/A |

**Note on `dashboard/layout.tsx`:** Per MEMORY.md, this file has pre-commit hooks that auto-revert changes. The training docs route does NOT need to be added to the sidebar nav -- it is an admin-only route accessed via direct URL or from the admin panel. Regular users should not see it in navigation.

### What Each Tab Renders

#### Tab 1: Communication Style (ADMIN-02)

Source: `FRED_COMMUNICATION_STYLE`, `FRED_CAREY_SYSTEM_PROMPT`, `FRED_AGENT_VOICE`, `buildFredVoicePreamble()`

Content sections:
1. **Voice** -- primary, secondary, tone from `FRED_COMMUNICATION_STYLE.voice`
2. **Characteristics** -- 6 items from `FRED_COMMUNICATION_STYLE.characteristics`
3. **Do Not** -- 5 rules from `FRED_COMMUNICATION_STYLE.doNot`
4. **Topics of Expertise** -- 11 items from `FRED_COMMUNICATION_STYLE.topicsExpertise`
5. **Full System Prompt** -- `FRED_CAREY_SYSTEM_PROMPT` rendered in a code block or collapsible section (184 lines)
6. **Agent Voice Constant** -- `FRED_AGENT_VOICE` rendered in a code block
7. **Voice Preamble Builder** -- Description of `buildFredVoicePreamble()` options and output

#### Tab 2: Framework Reference (ADMIN-03)

Source: `FRED_CAREY_SYSTEM_PROMPT` (frameworks section), `COACHING_PROMPTS`

Content sections:
1. **9-Step Startup Process** -- Steps 1-9 from the system prompt, with step descriptions
2. **Positioning Readiness Framework** -- Clarity (30%), Differentiation (25%), Market Understanding (20%), Narrative Strength (25%) -- from system prompt
3. **Investor Lens** -- Pre-Seed, Seed, Series A evaluation criteria from system prompt
4. **Reality Lens** -- 5 dimensions (Feasibility, Economics, Demand, Distribution, Timing) -- from system prompt
5. **Coaching Prompts** -- 5 topic-specific prompts rendered from `COACHING_PROMPTS` object
6. **Core Operating Principle** -- "Never optimize downstream artifacts before upstream truth is established"

#### Tab 3: Agent Behavior (ADMIN-04)

Source: Agent prompts (3 files), agent tools (3 files), `FRED_AGENT_VOICE`

Content sections per agent:
1. **Founder Ops Agent**
   - System prompt (from `FOUNDER_OPS_SYSTEM_PROMPT`)
   - Domain: operational excellence
   - Principles (5 items)
   - 4 tools: draftEmail, createTask, scheduleMeeting, weeklyPriorities
   - Each tool: name, description, input parameters (from Zod schema), system prompt suffix

2. **Fundraising Agent**
   - System prompt (from `FUNDRAISING_SYSTEM_PROMPT`)
   - Domain: fundraising strategy
   - Principles (6 items)
   - 4 tools: investorResearch, outreachDraft, pipelineAnalysis, meetingPrep
   - Each tool with description and voice suffix

3. **Growth Agent**
   - System prompt (from `GROWTH_SYSTEM_PROMPT`)
   - Domain: growth strategy
   - Principles (6 items)
   - 4 tools: channelAnalysis, experimentDesign, funnelAnalysis, contentStrategy
   - Each tool with description and voice suffix

4. **Shared Voice Constant**
   - `FRED_AGENT_VOICE` rendered as the voice preamble prepended to all tool system prompts

#### Tab 4: Identity & Background (ADMIN-05)

Source: `FRED_IDENTITY`, `FRED_BIO`, `FRED_COMPANIES`, `FRED_PHILOSOPHY`, `FRED_MEDIA`, `FRED_TESTIMONIALS`, `SAHARA_MESSAGING`, `MARKETING_STATS`

Content sections:
1. **Core Identity** -- Name, roles (8), tagline, social handles, websites
2. **Biography** -- Experience years, companies founded, IPOs, education, bar admission, origin story
3. **Current Ventures** -- Sahara, Private Services Fund, IdeaPros (with metrics)
4. **Past Exits** -- Imagine Communications, Path1, Boxlot, Home Bistro, City Loan, Azure
5. **Philosophy** -- 6 principles with quotes and teachings
6. **Media Presence** -- Social metrics, publications (12), recognition, podcast count
7. **Testimonials** -- 4 quotes with attributions
8. **Sahara Messaging** -- Vision, positioning, value props, differentiators
9. **Marketing Stats** -- Single source of truth numbers

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin auth for dashboard route | New auth system or `role` column | `isAdminSession()` from `lib/auth/admin.ts` | Already exists, battle-tested, zero migration |
| API routes for training content | `/api/admin/training/content` endpoints | Direct TypeScript imports in server components | Data IS code -- importing ensures accuracy |
| Custom tab component | Hand-rolled tab state | `Tabs/TabsContent/TabsList/TabsTrigger` from shadcn/ui | Already used in voice-agent admin, journey page, and 8+ other pages |
| Custom card layout | Raw divs | `Card/CardHeader/CardContent` from shadcn/ui | Consistent with entire admin panel |
| Navigation link in dashboard sidebar | Modify `dashboard/layout.tsx` (locked file) | Direct URL access or link from admin panel | File has pre-commit hooks that auto-revert changes |
| Separate page per section | 4 separate page.tsx files | Single tabbed page | Matches voice-agent admin pattern, simpler |

## Common Pitfalls

### Pitfall 1: Trying to Modify dashboard/layout.tsx

**What goes wrong:** Adding a nav item for "Admin Training" to the dashboard sidebar causes the pre-commit hook to revert the change.
**Why it happens:** Per MEMORY.md, `dashboard/layout.tsx` has pre-commit hooks that auto-revert changes.
**How to avoid:** Do NOT add the training docs route to the sidebar nav. Admin users access it via direct URL (`/dashboard/admin/training`) or a link from the standalone `/admin` panel. This is actually correct behavior -- non-admin users should not see this route in their sidebar.
**Warning signs:** Git commit failing with auto-reverted files.

### Pitfall 2: Mixing Up the Two Admin Auth Systems

**What goes wrong:** Using `isAdminRequest()` (which needs a `NextRequest` object) in a server component layout, where no request object is available.
**Why it happens:** `isAdminRequest()` is designed for API routes (Route Handlers), not Server Components. Server Components use `isAdminSession()` which reads cookies via Next.js `cookies()` API.
**How to avoid:** In the training docs layout (Server Component), use `isAdminSession()`. In any API routes (if created), use `isAdminRequest()`.
**Warning signs:** TypeScript error about missing `NextRequest` parameter.

### Pitfall 3: Making Content Editable Instead of Read-Only

**What goes wrong:** Building an admin form to edit Fred's voice rules, creating unnecessary API routes and database tables for content that lives in source code.
**Why it happens:** Misinterpreting "training docs" as a CMS when it is meant to be a reference guide.
**How to avoid:** The training docs are READ-ONLY documentation of what exists in the code. Fred's voice is defined in `fred-brain.ts`, prompts in `prompts.ts`, etc. The training pages render these as formatted reference material. Content updates happen by changing the source code, not through the UI. If editable prompts are needed, the existing `/admin/prompts` page already handles that.
**Warning signs:** Creating database tables, form inputs, or PATCH/PUT API routes for training doc content.

### Pitfall 4: Using "use client" Where Not Needed

**What goes wrong:** Making pages client components when they could be server components, losing the ability to import from `fred-brain.ts` at build time.
**Why it happens:** Habit of making all pages client components. The tabs component from shadcn/ui requires client-side state.
**How to avoid:** The layout (auth check) MUST be a server component. The page itself needs `"use client"` only because `Tabs` requires interactive state. Import the fred-brain.ts data constants at the top of the client component -- they are `as const` objects that can be imported in client components (they contain no server secrets, just public persona data). Alternatively, pass them as props from a server component wrapper.
**Warning signs:** Runtime errors about `cookies()` being called in a client component.

### Pitfall 5: Overcomplicating the Content Structure

**What goes wrong:** Building a complex nested data model or CMS-like structure when the content is simple reference documentation.
**Why it happens:** Over-engineering for future flexibility that isn't needed.
**How to avoid:** The page is essentially a formatted rendering of existing TypeScript constants. Think of it as a "style guide" page, not a content management system. Each section is a Card with a heading, some descriptive text, and the relevant data rendered as lists, tables, or code blocks.
**Warning signs:** Creating new TypeScript types for "training doc sections", "training doc categories", etc.

## Code Examples

### Example 1: Training Docs Layout with Admin Gate (Option A)

```typescript
// app/dashboard/admin/training/layout.tsx
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth/admin";

export default async function TrainingDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await isAdminSession();

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
```

### Example 2: Tabbed Training Page Structure

```typescript
// app/dashboard/admin/training/page.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Layers, Bot, User } from "lucide-react";
// Import all data constants
import {
  FRED_IDENTITY,
  FRED_BIO,
  FRED_COMPANIES,
  FRED_PHILOSOPHY,
  FRED_COMMUNICATION_STYLE,
  FRED_MEDIA,
  FRED_TESTIMONIALS,
  SAHARA_MESSAGING,
  MARKETING_STATS,
} from "@/lib/fred-brain";
import { FRED_CAREY_SYSTEM_PROMPT, COACHING_PROMPTS } from "@/lib/ai/prompts";
import { FRED_AGENT_VOICE } from "@/lib/agents/fred-agent-voice";

export default function TrainingDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          FRED Training Reference
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          How FRED communicates, what frameworks it uses, and how each agent behaves
        </p>
      </div>

      <Tabs defaultValue="communication" className="space-y-4">
        <TabsList>
          <TabsTrigger value="communication" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication Style
          </TabsTrigger>
          <TabsTrigger value="frameworks" className="gap-2">
            <Layers className="h-4 w-4" />
            Frameworks
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agent Behavior
          </TabsTrigger>
          <TabsTrigger value="identity" className="gap-2">
            <User className="h-4 w-4" />
            Identity & Background
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communication">
          {/* Render FRED_COMMUNICATION_STYLE, FRED_CAREY_SYSTEM_PROMPT, FRED_AGENT_VOICE */}
        </TabsContent>

        <TabsContent value="frameworks">
          {/* Render 9-Step, Positioning, Investor Lens, Reality Lens, COACHING_PROMPTS */}
        </TabsContent>

        <TabsContent value="agents">
          {/* Render 3 agents with prompts and tools */}
        </TabsContent>

        <TabsContent value="identity">
          {/* Render FRED_IDENTITY, FRED_BIO, FRED_COMPANIES, FRED_PHILOSOPHY, etc. */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Example 3: Communication Style Section

```tsx
// Inside the communication tab
<Card>
  <CardHeader>
    <CardTitle>Voice</CardTitle>
    <CardDescription>How FRED communicates with founders</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary</p>
        <p className="text-lg font-semibold mt-1">{FRED_COMMUNICATION_STYLE.voice.primary}</p>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Secondary</p>
        <p className="text-lg font-semibold mt-1">{FRED_COMMUNICATION_STYLE.voice.secondary}</p>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tone</p>
        <p className="text-lg font-semibold mt-1">{FRED_COMMUNICATION_STYLE.voice.tone}</p>
      </div>
    </div>

    <div>
      <h4 className="font-medium mb-2">Characteristics</h4>
      <ul className="space-y-1">
        {FRED_COMMUNICATION_STYLE.characteristics.map((c, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a1a]" />
            {c}
          </li>
        ))}
      </ul>
    </div>

    <div>
      <h4 className="font-medium mb-2 text-red-600">Do Not</h4>
      <ul className="space-y-1">
        {FRED_COMMUNICATION_STYLE.doNot.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <span>x</span>
            {d}
          </li>
        ))}
      </ul>
    </div>
  </CardContent>
</Card>
```

### Example 4: Agent Behavior Section

```tsx
// Render one agent section
function AgentSection({
  name,
  systemPrompt,
  tools,
}: {
  name: string;
  systemPrompt: string;
  tools: { name: string; description: string; voiceSuffix: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">System Prompt</h4>
          <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
            {systemPrompt}
          </pre>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Tools ({tools.length})</h4>
          <div className="space-y-3">
            {tools.map((tool) => (
              <div key={tool.name} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge>{tool.name}</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                <p className="text-xs text-gray-500 mt-2 font-mono">{tool.voiceSuffix}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No documentation of FRED's voice rules | Voice rules defined in code (`fred-brain.ts`, `prompts.ts`) but not documented in-app | Phases 13-15 (voice work) | Code is the documentation, but not human-readable for non-developers |
| Admin panel only has Prompts, Config, A/B Tests | Training docs would add a reference section | This phase | Admins can see exactly how FRED is configured without reading source code |
| Agent behavior undocumented | Agent prompts and tools in code files | Phase 04 + Phase 14 | Tools, parameters, and voice suffixes are only visible to developers |
| Standalone admin panel at `/admin/` | Training docs under `/dashboard/admin/training` | This phase | Accessible from within the authenticated dashboard context |

## Open Questions

1. **Route nesting: `/dashboard/admin/training` vs `/admin/training`**
   - What we know: The requirement explicitly states `/dashboard/admin/training`. However, the existing admin panel lives at `/admin/`. Putting training docs under `/dashboard/` means they require Supabase user auth AND admin auth.
   - What's unclear: Whether the intent is for admin users to access training docs while in the dashboard context (as a founder-facing user who is also admin), or whether this should be part of the standalone admin panel.
   - Recommendation: Follow the requirement literally (`/dashboard/admin/training`) with admin gate via `isAdminSession()`. If the team later wants it under `/admin/training`, the page component can be moved with zero logic changes.

2. **Adding a "Training Docs" link to the admin panel nav**
   - What we know: The standalone admin panel at `app/admin/layout.tsx` has nav links (Dashboard, Prompts, Config, A/B Tests). It does NOT link to `/dashboard/admin/training`.
   - What's unclear: Whether a link should be added to the admin panel nav that navigates to `/dashboard/admin/training`.
   - Recommendation: Add a link in the admin panel nav pointing to `/dashboard/admin/training`. This gives admins a direct path to the training docs from their admin panel. Since the training docs layout checks `isAdminSession()` independently, the admin session cookie will already be set.

3. **Content accuracy verification**
   - What we know: The training docs render data directly from code exports. Phases 13-15 updated all voice rules and are complete.
   - What's unclear: Whether any post-Phase-15 changes have been made to voice rules or agent prompts that need to be reflected.
   - Recommendation: Since the training docs import directly from the source code, they are automatically up-to-date. No separate verification needed -- the code IS the source of truth. The training docs just make it human-readable.

4. **Should agent tool parameter schemas be displayed?**
   - What we know: Each agent tool has a Zod schema defining its input parameters (e.g., `draftEmailParams` has `recipient`, `subject`, `context`, `tone`). These schemas are the API contract.
   - What's unclear: Whether showing full Zod schema details is useful for admin training, or whether a simplified description suffices.
   - Recommendation: Show tool name, description text, and the list of parameter names with their `.describe()` strings. Skip the full Zod schema syntax (`.min()`, `.max()`, etc.) as it is developer-level detail. Admin users need to know WHAT the tool does and WHAT inputs it expects, not the validation rules.

5. **Collapsible sections for long content?**
   - What we know: The `FRED_CAREY_SYSTEM_PROMPT` is 184 lines. Agent system prompts are ~15 lines each. Tool system prompts include voice preamble + domain context.
   - What's unclear: Whether all content should be visible at once or if long sections should be collapsible.
   - Recommendation: Use collapsible sections (shadcn `Collapsible` or `Accordion` component) for the full system prompt and individual agent tool details. Show summaries by default, expand for full text. This keeps the page scannable while preserving access to full details.

## Sources

### Primary (HIGH confidence -- files read in full)
- `lib/fred-brain.ts` -- 425 lines. All 11 exports documented (FRED_IDENTITY, FRED_BIO, FRED_COMPANIES, FRED_PHILOSOPHY, FRED_COMMUNICATION_STYLE, FRED_MEDIA, FRED_TESTIMONIALS, SAHARA_MESSAGING, MARKETING_STATS, helper functions)
- `lib/ai/prompts.ts` -- 260 lines. FRED_CAREY_SYSTEM_PROMPT (184 lines), COACHING_PROMPTS (5 topics), getPromptForTopic(), getFredGreeting()
- `lib/agents/fred-agent-voice.ts` -- 19 lines. Single FRED_AGENT_VOICE constant
- `lib/fred/voice.ts` -- 74 lines. buildFredVoicePreamble() with VoicePreambleOptions
- `lib/agents/founder-ops/prompts.ts` -- 27 lines. FOUNDER_OPS_SYSTEM_PROMPT
- `lib/agents/fundraising/prompts.ts` -- 28 lines. FUNDRAISING_SYSTEM_PROMPT
- `lib/agents/growth/prompts.ts` -- 28 lines. GROWTH_SYSTEM_PROMPT
- `lib/agents/founder-ops/tools.ts` -- 265 lines. 4 tools with schemas and system prompts
- `lib/agents/fundraising/tools.ts` -- 313 lines. 4 tools with schemas and system prompts
- `lib/agents/growth/tools.ts` -- 262 lines. 4 tools with schemas and system prompts
- `lib/auth/admin.ts` -- 86 lines. isAdminRequest(), isAdminSession(), isAdminAny(), requireAdminRequest()
- `lib/auth/admin-sessions.ts` -- 101 lines. createAdminSession(), validateSession(), revokeSession()
- `lib/auth/middleware-utils.ts` -- 320 lines. isProtectedRoute(), DEFAULT_PROTECTED_ROUTES (/dashboard is protected)
- `middleware.ts` -- 53 lines. Root middleware with Supabase session refresh + protected route redirect
- `app/admin/layout.tsx` -- 67 lines. Standalone admin layout with isAdminSession() gate
- `app/admin/login/page.tsx` -- 81 lines. Admin login form
- `app/admin/page.tsx` -- 159 lines. Admin dashboard (client component with stats fetch)
- `app/admin/voice-agent/page.tsx` -- 342 lines. Tabbed admin page pattern (5 tabs)
- `app/admin/config/page.tsx` -- 278 lines. Admin config page pattern
- `app/admin/prompts/page.tsx` -- 238 lines. Admin prompts page pattern
- `app/api/admin/login/route.ts` -- 79 lines. Admin login API with rate limiting
- `app/dashboard/layout.tsx` -- 335 lines. Dashboard layout (locked file, no modifications)
- `app/dashboard/positioning/page.tsx` -- 24 lines. FeatureLock page pattern
- `app/dashboard/startup-process/page.tsx` -- 353 lines. Complex dashboard page pattern
- `app/dashboard/journey/page.tsx` -- 565 lines. Tabbed dashboard page pattern
- `types/auth.ts` -- 312 lines. UserRole enum (ADMIN, USER, etc.), AuthContext
- `lib/env.ts` -- 144 lines. Environment validation (no ADMIN_EMAILS var exists)
- `.env.example` -- 149 lines. All env vars documented (ADMIN_SECRET_KEY exists)
- `components/tier/feature-lock.tsx` -- 229 lines. FeatureLock component pattern
- `lib/fred/reality-lens.ts` (lines 1-80) -- Confirmed voice imports from fred-brain.ts
- `lib/fred/irs/engine.ts` (lines 1-210) -- Confirmed voice imports from fred-brain.ts + FRED_MEDIA + FRED_TESTIMONIALS
- `lib/fred/strategy/generator.ts` (lines 1-160) -- Confirmed voice imports from fred-brain.ts + FRED_MEDIA
- `lib/fred/pitch/analyzers/index.ts` (lines 1-160) -- Confirmed voice imports from fred-brain.ts
- `app/api/admin/training/metrics/route.ts` -- 284 lines. Existing admin training API (metrics, not docs)
- `app/api/admin/training/ratings/route.ts` -- 282 lines. Existing admin training API (ratings, not docs)
- `.planning/REQUIREMENTS.md` -- ADMIN-01 through ADMIN-05 requirements confirmed
- `.planning/ROADMAP.md` -- Phase 23 definition and dependencies confirmed

### Verification (Code searches performed)
- Grep for `dashboard/admin` across codebase: only found in ROADMAP.md and REQUIREMENTS.md (no existing routes)
- Grep for `FeatureLock` across codebase: 28 files (component + all usages)
- Grep for `UserRole` across codebase: 4 files (type definition + middleware utilities, NOT in Supabase auth flow)
- Grep for `ADMIN_EMAIL|ADMIN_USERS|admin.*allow`: no results (no email allowlist exists)
- Grep for `role.*admin|is_admin`: found in middleware-utils.ts and types/auth.ts (JWT context only, not Supabase profiles)
- Grep for `profiles.*select|from.*profiles`: 20+ usages confirmed profiles table has name, stage, challenges, tier -- NO role column
- Glob for `app/dashboard/admin/**/*`: no results (route does not exist yet)

## Metadata

**Confidence breakdown:**
- Admin auth architecture: HIGH -- both auth systems read in full, all auth files documented
- Content data mapping: HIGH -- every training doc content source file read completely, all exports catalogued
- Page structure recommendation: HIGH -- based on direct examination of 6 existing admin/dashboard pages and their patterns
- Route location decision: HIGH -- `middleware-utils.ts` confirms `/dashboard` is protected, both auth systems fully understood
- UI patterns: HIGH -- existing tabbed admin pages, card layouts, and badge patterns all examined

**Research date:** 2026-02-07
**Valid until:** Indefinite (no external dependencies; only dependent on project source code which was read directly)
