---
phase: 87-pitch-deck-scoring
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/dashboard/documents/page.tsx
  - components/dashboard/deck-score-card.tsx
  - components/dashboard/deck-upload-review.tsx
  - app/api/dashboard/deck-review/route.ts
  - lib/ai/deck-scoring.ts
  - types/deck-review.ts
autonomous: true

must_haves:
  truths:
    - "User can upload a PDF pitch deck from the Documents page"
    - "Uploaded deck is parsed via pdf-parse and sent to AI for scoring"
    - "User sees a scorecard with 7 dimensions: problem clarity, market size, team, traction, GTM, narrative, investability"
    - "Each dimension has a numeric score (1-10) and brief explanation"
    - "Feature is gated to Pro+ tier"
    - "Deck review results persist in the database"
  artifacts:
    - path: "app/api/dashboard/deck-review/route.ts"
      provides: "POST endpoint: accept PDF, parse, score, return scorecard"
      exports: ["POST"]
    - path: "lib/ai/deck-scoring.ts"
      provides: "AI scoring prompt and response parser for 7 dimensions"
      exports: ["scoreDeck", "DECK_SCORING_DIMENSIONS"]
    - path: "types/deck-review.ts"
      provides: "TypeScript types for deck review request/response"
      exports: ["DeckScorecard", "DeckDimension", "DeckReviewRequest"]
    - path: "components/dashboard/deck-score-card.tsx"
      provides: "Visual scorecard component showing 7 dimension scores"
    - path: "components/dashboard/deck-upload-review.tsx"
      provides: "Upload flow component with progress and result display"
  key_links:
    - from: "components/dashboard/deck-upload-review.tsx"
      to: "/api/dashboard/deck-review"
      via: "fetch POST with FormData"
      pattern: "fetch.*api/dashboard/deck-review"
    - from: "app/api/dashboard/deck-review/route.ts"
      to: "lib/ai/deck-scoring.ts"
      via: "scoreDeck function call"
      pattern: "scoreDeck"
    - from: "app/dashboard/documents/page.tsx"
      to: "components/dashboard/deck-upload-review.tsx"
      via: "Import and render in decks tab"
      pattern: "DeckUploadReview"
---

<objective>
Build an end-to-end pitch deck upload and AI scoring pipeline: PDF upload -> pdf-parse extraction -> AI analysis -> 7-dimension scorecard display.

Purpose: Founders need objective feedback on their pitch decks before approaching investors. This is a core value-add for Pro+ tier and directly supports the Investor Lens feature.
Output: Working deck upload + scoring flow accessible from the Documents page, with scored results on 7 investor-relevant dimensions.
</objective>

<context>
@app/dashboard/documents/page.tsx - Documents page with folder tabs (decks, strategy, reports, uploads)
@app/api/investor-lens/deck-review/route.ts - Existing deck review endpoint (IC perspective, slide-by-slide) -- we build a SEPARATE scoring endpoint
@types/deck-review.ts - Will create new types (existing investor-lens types are separate)
@components/dashboard/document-upload.tsx - Existing upload component pattern to follow
@lib/ai/client.ts - generateTrackedResponse for AI calls
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create deck scoring types, AI scoring logic, and API endpoint</name>
  <files>types/deck-review.ts, lib/ai/deck-scoring.ts, app/api/dashboard/deck-review/route.ts</files>
  <action>
  1. Create `types/deck-review.ts` with these types:
     ```typescript
     export interface DeckDimension {
       name: string;
       score: number; // 1-10
       explanation: string; // 1-2 sentence justification
       suggestions: string[]; // 1-3 improvement suggestions
     }

     export interface DeckScorecard {
       overallScore: number; // weighted average 1-10
       dimensions: DeckDimension[];
       summary: string; // 2-3 sentence overall assessment
       topStrength: string;
       biggestGap: string;
       createdAt: string;
     }

     export interface DeckReviewRequest {
       fileName: string;
       textContent: string; // extracted PDF text
     }

     export const DECK_DIMENSIONS = [
       "Problem Clarity",
       "Market Size & Opportunity",
       "Team & Founder Fit",
       "Traction & Validation",
       "Go-to-Market Strategy",
       "Narrative & Storytelling",
       "Investability"
     ] as const;
     ```

  2. Create `lib/ai/deck-scoring.ts`:
     - Export `DECK_SCORING_PROMPT` -- a system prompt instructing the AI to score a pitch deck on the 7 dimensions above, returning structured JSON matching DeckScorecard
     - The prompt should instruct: "Score each dimension 1-10. Be honest and direct -- this is Fred Cary's perspective. A 7+ means genuinely strong. Most first drafts score 4-6. Do not inflate."
     - Include scoring rubric for each dimension (e.g., Problem Clarity: 1-3 = vague/generic, 4-6 = defined but not validated, 7-10 = specific, validated, urgent)
     - Export async function `scoreDeck(textContent: string, founderContext?: string): Promise<DeckScorecard>` that:
       a. Calls generateTrackedResponse (from lib/ai/client) with the scoring prompt + deck text
       b. Parses the JSON response into DeckScorecard
       c. Calculates overallScore as weighted average (Investability 20%, Market 15%, Traction 15%, Problem 15%, Team 15%, GTM 10%, Narrative 10%)
       d. Returns the scorecard

  3. Create `app/api/dashboard/deck-review/route.ts`:
     - POST handler accepting multipart FormData with a `file` field (PDF)
     - Use `requireAuth()` for authentication
     - Use `checkTierForRequest` with `UserTier.PRO` minimum
     - Extract PDF buffer from the uploaded file
     - Use `pdf-parse` (already in dependencies) to extract text: `const pdfData = await pdfParse(buffer); const text = pdfData.text;`
     - Validate: text must be non-empty and < 100,000 chars (reject with 400 if too large or empty)
     - Call `scoreDeck(text)` from lib/ai/deck-scoring.ts
     - Save result to Supabase `deck_reviews` table (create via SQL if needed): columns = id (uuid), user_id, file_name, scorecard (jsonb), created_at
     - Return JSON: `{ success: true, scorecard: DeckScorecard }`
     - Handle errors with appropriate status codes and logger
  </action>
  <verify>
  - `npx tsc --noEmit` passes with no type errors
  - `npm run build` succeeds
  - The API route file exists and exports POST
  - `grep -c "scoreDeck" lib/ai/deck-scoring.ts` returns 1+
  - `grep -c "pdf-parse\|pdfParse" app/api/dashboard/deck-review/route.ts` returns 1+
  </verify>
  <done>POST /api/dashboard/deck-review accepts PDF upload, extracts text via pdf-parse, scores on 7 dimensions via AI, saves to database, returns structured DeckScorecard. Pro+ tier gated.</done>
</task>

<task type="auto">
  <name>Task 2: Build scorecard UI components and integrate into Documents page</name>
  <files>components/dashboard/deck-score-card.tsx, components/dashboard/deck-upload-review.tsx, app/dashboard/documents/page.tsx</files>
  <action>
  1. Create `components/dashboard/deck-score-card.tsx`:
     - Props: `{ scorecard: DeckScorecard }`
     - Display overall score as a large number with color coding (1-4 red, 5-6 amber, 7-10 green) using Sahara orange (#ff6a1a) for the accent
     - Show 7 dimension cards in a responsive grid (2 cols on md, 1 on mobile)
     - Each dimension card shows: name, score bar (visual progress bar 1-10), explanation text, expandable suggestions list
     - Bottom section: "Top Strength" and "Biggest Gap" highlighted
     - Summary text at the top
     - Use shadcn Card, Progress, Badge components
     - Use cn() for conditional styling

  2. Create `components/dashboard/deck-upload-review.tsx`:
     - Props: `{ onReviewComplete?: (scorecard: DeckScorecard) => void }`
     - File upload zone (drag & drop + click) accepting only PDF, max 10MB
     - Upload states: idle -> uploading -> analyzing -> complete -> error
     - On file select: POST to /api/dashboard/deck-review with FormData
     - Show progress indicator during analysis ("Analyzing your deck... This takes about 30 seconds")
     - On success: render DeckScoreCard inline with the scorecard result
     - On error: show toast via sonner with error message
     - "Upload Another" button to reset state

  3. Modify `app/dashboard/documents/page.tsx`:
     - Import DeckUploadReview component
     - In the "decks" folder tab content area, add a section above the document list:
       ```
       <div className="mb-6">
         <h3 className="text-lg font-semibold mb-2">Score Your Pitch Deck</h3>
         <p className="text-sm text-muted-foreground mb-4">Upload a PDF pitch deck and get Fred's investor-perspective scorecard.</p>
         <DeckUploadReview />
       </div>
       ```
     - This sits above the existing document cards, only visible in the "decks" tab
  </action>
  <verify>
  - `npm run build` succeeds
  - `npx tsc --noEmit` passes
  - The Documents page renders without errors (check no import errors)
  - `grep -c "DeckUploadReview" app/dashboard/documents/page.tsx` returns 1+
  - `grep -c "DeckScoreCard" components/dashboard/deck-upload-review.tsx` returns 1+
  </verify>
  <done>Documents page "Decks" tab shows pitch deck upload zone. Uploading a PDF triggers AI scoring and displays a 7-dimension scorecard with overall score, dimension breakdowns, strengths, and gaps. Full E2E flow working.</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds
- `npx tsc --noEmit` passes
- API endpoint exists at app/api/dashboard/deck-review/route.ts and exports POST
- Score dimensions match spec: problem clarity, market size, team, traction, GTM, narrative, investability
- Documents page shows deck upload in the Decks tab
- Pro+ tier gating enforced on API endpoint
</verification>

<success_criteria>
- PDF upload works via drag & drop or click on Documents page Decks tab
- pdf-parse extracts text from uploaded PDF
- AI scores deck on 7 dimensions with 1-10 scores and explanations
- Scorecard UI displays all 7 dimensions with visual score bars
- Overall weighted score calculated and displayed
- API returns structured DeckScorecard JSON
- Feature gated to Pro+ tier
- Build and type check pass
</success_criteria>

<output>
After completion, create `.planning/phases/87-pitch-deck-scoring/87-01-SUMMARY.md`
</output>
