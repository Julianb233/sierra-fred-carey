# Phase 76-02 Summary: Prompt Version Tracking + Admin Approval Queue

## Status: COMPLETE

## What was built

### Prompt Version Tracking (REQ-R3)
- Auto-increment version per topic via DB trigger in migration
- Full traceability: `source_insight_id` + `source_signal_ids` link to original feedback
- `experiment_id` links to A/B experiments when testing patches
- Version history preserved (retired versions stay in DB)

### Admin Approval Queue API (REQ-R4)
- `app/api/admin/feedback/patches/route.ts` -- GET (list patches with status filter), POST (create manual patches)
- `app/api/admin/feedback/patches/[id]/route.ts` -- GET (patch detail), PATCH (status transitions with validation: draft->pending_review->approved->active->retired)
- `app/api/admin/feedback/patches/[id]/experiment/route.ts` -- POST (create A/B test for approved patch, links experiment to patch)

### Prompt Patch Generator (`lib/feedback/patch-generator.ts`) -- NEW
- **`generatePatchFromInsight(insight)`**: Takes a `FeedbackInsight` (from clustering), calls the LLM to generate a supplemental prompt instruction, and saves it to `prompt_patches` with status `pending_review`. Uses tier-routed model (pro/chat) with low temperature.
- **`generatePromptPatch(params)`**: Manual patch creation for admins. Accepts title, content, topic, and createdBy. Saves with status `draft`.
- Both functions enforce no auto-deployment -- all patches require explicit admin action.

### Admin Patch Approval Queue UI (`components/admin/patch-approval-queue.tsx`) -- NEW
- **Stat cards**: Pending Review count, Active Patches count, Total Versions
- **Filterable table**: Status dropdown filter (all/draft/pending_review/approved/active/rejected/retired), columns for title, topic, source, signals, version, status, created date, review button
- **Review dialog**: Full patch content in monospace pre block with orange border, metadata badges (status, topic, version, type, experiment ID), generation context (rationale, confidence, signal count), tracking window metrics, source signal IDs
- **Action buttons by status**:
  - draft/pending_review: Reject (with optional reason), Submit for Review / Approve
  - approved: Deploy (Start Tracking), Start A/B Test
  - active: Retire (Make Permanent)
  - rejected: Return to Draft
- **Status badge colors**: gray (draft), yellow (pending_review), blue (approved), green (active), red (rejected), purple (retired)
- **Toast notifications** via sonner for all actions
- Follows existing shadcn/ui patterns (Card, Table, Badge, Dialog, Select, Button variant="orange")

### Status Transition Rules
- Valid transitions enforced server-side
- Deployment triggers tracking window setup (REQ-R5)
- No patch can reach 'active' without explicit admin approval

## Verification
- `npm run build` passes (production build with `--webpack` flag)
- `npm run test` passes (1048 tests, 61 test files, all green)
- No auto-deployment: all patches require admin action through the approval queue
- A/B test creation uses existing `createExperiment()` infrastructure

## Requirements Coverage
- REQ-R2: Category-driven prompt patches from recurring complaints -- COMPLETE (generatePatchFromInsight)
- REQ-R3: Prompt version control -- COMPLETE
- REQ-R4: Human-in-the-loop gate -- COMPLETE (admin queue UI + API routes)
