---
phase: 90-user-testing-loop
plan: 01
type: execute
wave: 2
depends_on: ["88-01"]
files_modified:
  - scripts/create-test-accounts.ts
  - scripts/mobile-test-checklist.ts
  - app/api/admin/test-accounts/route.ts
  - app/admin/testing/page.tsx
  - components/admin/test-account-manager.tsx
  - components/admin/feedback-dashboard.tsx
  - lib/db/test-accounts.ts
autonomous: true

must_haves:
  truths:
    - "Admin can create test accounts with specific tiers and configurations"
    - "A mobile device testing protocol exists with checklist and pass/fail tracking"
    - "Feedback from first 200 users is collected and viewable in admin panel"
    - "Test accounts are clearly marked and can be cleaned up"
    - "Iteration workflow captures issues and maps them to phases"
  artifacts:
    - path: "scripts/create-test-accounts.ts"
      provides: "CLI script to batch-create test accounts with configurable tiers"
    - path: "app/api/admin/test-accounts/route.ts"
      provides: "Admin API for test account CRUD"
      exports: ["GET", "POST", "DELETE"]
    - path: "app/admin/testing/page.tsx"
      provides: "Admin testing dashboard page"
    - path: "components/admin/test-account-manager.tsx"
      provides: "UI for creating/managing test accounts"
    - path: "components/admin/feedback-dashboard.tsx"
      provides: "Aggregated user feedback view with filtering"
    - path: "lib/db/test-accounts.ts"
      provides: "Database helpers for test account operations"
  key_links:
    - from: "app/admin/testing/page.tsx"
      to: "components/admin/test-account-manager.tsx"
      via: "Import and render"
      pattern: "TestAccountManager"
    - from: "components/admin/test-account-manager.tsx"
      to: "/api/admin/test-accounts"
      via: "fetch for CRUD operations"
      pattern: "fetch.*api/admin/test-accounts"
    - from: "app/admin/testing/page.tsx"
      to: "components/admin/feedback-dashboard.tsx"
      via: "Import and render"
      pattern: "FeedbackDashboard"
---

<objective>
Build a user testing infrastructure: test account creation, mobile testing protocol, feedback collection dashboard, and iteration workflow for the first 200 users.

Purpose: Before the Palo Alto event (Phase 88), we need testing infrastructure to validate the full user experience, collect structured feedback, and track issues for iteration. This ensures the product is event-ready.
Output: Admin testing page with test account management, mobile testing checklist, feedback aggregation dashboard.
</objective>

<context>
@app/admin/ - Existing admin panel pages
@lib/db/ - Database helper patterns
@app/api/admin/ - Existing admin API routes
@lib/analytics/events.ts - PostHog event tracking
@components/admin/ - Existing admin components
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create test account system (CLI script + API + database helpers)</name>
  <files>scripts/create-test-accounts.ts, app/api/admin/test-accounts/route.ts, lib/db/test-accounts.ts</files>
  <action>
  1. Create `lib/db/test-accounts.ts`:
     ```typescript
     import { SupabaseClient } from "@supabase/supabase-js";

     export interface TestAccount {
       id: string;
       email: string;
       tier: string;
       createdAt: string;
       testGroup: string; // e.g., "mobile-qa", "event-preview", "beta-tester"
       isActive: boolean;
     }

     export async function createTestAccount(
       supabase: SupabaseClient,
       config: { email: string; password: string; tier: string; testGroup: string; fullName?: string }
     ): Promise<TestAccount> {
       // 1. Create auth user via supabase.auth.admin.createUser
       // 2. Set user_metadata: { is_test_account: true, test_group: config.testGroup }
       // 3. Update profile tier to config.tier
       // 4. Return TestAccount object
     }

     export async function listTestAccounts(supabase: SupabaseClient): Promise<TestAccount[]> {
       // Query profiles where user_metadata.is_test_account = true
       // Join with auth.users for email
       // Return sorted by createdAt desc
     }

     export async function deleteTestAccount(supabase: SupabaseClient, userId: string): Promise<void> {
       // Delete user via supabase.auth.admin.deleteUser
       // Clean up profile and related data
     }
     ```

  2. Create `scripts/create-test-accounts.ts`:
     - Executable via `npx tsx scripts/create-test-accounts.ts`
     - Accept CLI args: --count (default 5), --tier (default "pro"), --group (default "qa")
     - Generate test emails: `test-{n}@sahara-testing.local`
     - Password: "TestAccount2026!" for all test accounts
     - Call createTestAccount for each
     - Print created account details to stdout
     - Add a --cleanup flag to delete all test accounts

  3. Create `app/api/admin/test-accounts/route.ts`:
     - Require admin auth (check for admin role in user metadata or email allowlist)
     - GET: return listTestAccounts()
     - POST: accept { email, password, tier, testGroup, fullName } and call createTestAccount
     - DELETE: accept { userId } in request body and call deleteTestAccount
     - Return appropriate status codes and error messages
  </action>
  <verify>
  - `npx tsc --noEmit` passes
  - `npm run build` succeeds
  - `grep -c "createTestAccount" lib/db/test-accounts.ts` returns 1+
  - `grep -c "deleteTestAccount" lib/db/test-accounts.ts` returns 1+
  - API route exports GET, POST, DELETE
  </verify>
  <done>Test account infrastructure: CLI script for batch creation, API for CRUD, database helpers. Test accounts are tagged with is_test_account metadata for easy identification and cleanup.</done>
</task>

<task type="auto">
  <name>Task 2: Build admin testing dashboard with account manager and feedback view</name>
  <files>app/admin/testing/page.tsx, components/admin/test-account-manager.tsx, components/admin/feedback-dashboard.tsx, scripts/mobile-test-checklist.ts</files>
  <action>
  1. Create `components/admin/test-account-manager.tsx`:
     - Displays table of existing test accounts: email, tier, test group, created date, status
     - "Create Test Account" form: email, tier dropdown (free/pro/studio), test group dropdown
     - "Create Batch" button: creates 5 accounts at once with sequential emails
     - Delete button per account (with confirmation)
     - "Clean Up All" button to delete all test accounts
     - Fetches from /api/admin/test-accounts
     - Uses shadcn Table, Button, Select, Input, Dialog components

  2. Create `components/admin/feedback-dashboard.tsx`:
     - Fetches feedback from existing feedback API (/api/admin/feedback or /api/feedback)
     - Displays feedback entries in a filterable table:
       - Columns: User, Date, Rating (1-5 stars), Message, Category, Status
       - Filters: date range, rating, category
     - Summary stats at top: total feedback count, average rating, NPS score if available
     - Each feedback item can be tagged with a "Phase to fix" field (maps to planning phases)
     - Export to CSV button (download feedback as CSV)
     - If no existing feedback API, create a simple aggregation that pulls from the feedback table in Supabase

  3. Create `scripts/mobile-test-checklist.ts`:
     - Generates a markdown checklist file at `docs/mobile-test-checklist.md`
     - Checklist covers critical user flows:
       ```
       ## Mobile Testing Protocol

       ### Device Matrix
       - [ ] iPhone 14/15 (Safari)
       - [ ] iPhone 14/15 (Chrome)
       - [ ] Android (Samsung Galaxy S23, Chrome)
       - [ ] iPad (Safari, landscape + portrait)

       ### Critical Flows
       1. Event Landing (/event/palo-alto-2026)
          - [ ] QR code scan loads page < 3s
          - [ ] No horizontal scroll
          - [ ] Signup form usable with thumb
          - [ ] Password field shows/hides
          - [ ] Error states visible (invalid email, short password)

       2. Onboarding
          - [ ] All steps navigable
          - [ ] Stage selection tappable
          - [ ] Progress indicator visible
          - [ ] Can complete in < 2 minutes

       3. Dashboard
          - [ ] All cards render, no overflow
          - [ ] Navigation menu accessible
          - [ ] Charts/graphs render on mobile

       4. FRED Chat
          - [ ] Input field stays above keyboard
          - [ ] Messages scrollable
          - [ ] Send button tappable
          - [ ] Response renders within 5s

       5. Documents Upload
          - [ ] File picker opens on mobile
          - [ ] Upload progress visible
          - [ ] Score card readable on small screen

       ### Performance
       - [ ] LCP < 2.5s on 4G
       - [ ] No layout shift on load
       - [ ] Touch targets >= 44px

       ### Pass/Fail Summary
       | Flow | iPhone Safari | iPhone Chrome | Android Chrome | iPad |
       |------|:---:|:---:|:---:|:---:|
       | Event Landing | | | | |
       | Onboarding | | | | |
       | Dashboard | | | | |
       | FRED Chat | | | | |
       | Documents | | | | |
       ```
     - Run via `npx tsx scripts/mobile-test-checklist.ts`

  4. Create `app/admin/testing/page.tsx`:
     - Admin-only page (check admin auth, redirect if not admin)
     - Two tabs: "Test Accounts" and "User Feedback"
     - Test Accounts tab: renders TestAccountManager
     - User Feedback tab: renders FeedbackDashboard
     - Page title: "Testing & QA"
     - Breadcrumb: Admin > Testing
  </action>
  <verify>
  - `npm run build` succeeds
  - `npx tsc --noEmit` passes
  - `grep -c "TestAccountManager" app/admin/testing/page.tsx` returns 1+
  - `grep -c "FeedbackDashboard" app/admin/testing/page.tsx` returns 1+
  - `npx tsx scripts/mobile-test-checklist.ts` generates docs/mobile-test-checklist.md
  </verify>
  <done>Admin testing dashboard at /admin/testing with test account management (create, list, delete, batch) and feedback aggregation view. Mobile test checklist generated as markdown. Ready for pre-event QA.</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds
- Admin can navigate to /admin/testing and see both tabs
- Test accounts can be created and deleted via the UI
- CLI script creates batch test accounts
- Mobile test checklist exists at docs/mobile-test-checklist.md
- Feedback dashboard displays feedback with filtering
</verification>

<success_criteria>
- Test accounts are creatable via CLI (batch) and admin UI (individual)
- Test accounts are tagged with is_test_account and test_group
- Admin testing page shows test account table and feedback dashboard
- Mobile testing checklist covers all critical flows for 4 device types
- Feedback dashboard aggregates ratings, messages, and allows CSV export
- All test accounts are cleanable via single action
- Build and type check pass
</success_criteria>

<output>
After completion, create `.planning/phases/90-user-testing-loop/90-01-SUMMARY.md`
</output>
