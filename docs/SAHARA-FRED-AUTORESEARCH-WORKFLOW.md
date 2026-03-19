# Applying AutoResearch to Sahara FRED (Fred Cary) Chatbot

This doc explains how to apply the **autoresearch** skill to improve the Sahara/FRED chatbot’s responses and coaching using the training docs already in **this repo** and the NotebookLM knowledge base.

---

## 1. Skill reference

- **Skill:** `~/.claude/skills/autoresearch/SKILL.md` (autoresearch)  
- **Location:** `~/.claude/skills/autoresearch/`  
- **Trigger phrases:** “autoresearch”, “optimize this”, “improve this autonomously”, “run evals on”, “self-improve”, “research loop”, “make this better overnight”

**Method:** Define metric → Run N times → Evaluate (binary) → Mutate → Keep winner → Repeat.  
**Mandatory:** Every deliverable triggers `workflows/auto-notify.md` (email + text to Julian).

Use **guided setup** when you don’t have all three ingredients:  
`workflows/guided-setup.md` (10 questions → config → route to the right workflow).

---

## 2. Sahara FRED as AutoResearch target

| Ingredient | For Sahara FRED |
|------------|------------------|
| **Target** | FRED’s **mutable** prompt surface: supplemental patches and **coaching overlays** (not the frozen core). |
| **Measurement** | Binary evals: “Response aligns with training docs”, “Coaching tone/style matches Fred”, “No forbidden behavior”, etc. |
| **Mutation** | Edits to overlay text (e.g. `lib/ai/prompts.ts` `COACHING_PROMPTS`, or supplemental patches in `lib/ai/prompt-layers.ts`). |

**Important:** Do **not** mutate `FRED_CORE_PROMPT` in `lib/ai/prompt-layers.ts` (frozen; requires manual review and voice regression). Optimize only Layer 2/3: supplemental patches and `COACHING_PROMPTS` in `lib/ai/prompts.ts`.

**Repo:** This repo (sierra-fred-carey). **Key files:**

- `lib/ai/prompt-layers.ts` — core (immutable) + supplemental patches (mutable)
- `lib/ai/prompts.ts` — `COACHING_PROMPTS` (fundraising, pitchReview, strategy, positioning, mindset)
- `lib/fred-brain.ts` — identity, bio, philosophy (reference for evals)
- Training / canon: `docs/SAHARA-NOTEBOOKLM-SOURCE.md`, `.planning/OPERATING-BIBLE.md`, `docs/` content

**Knowledge base:** NotebookLM notebook **`sahara-fred-cary`** — use for deriving eval criteria and as judge context (e.g. `nlm query "…" --notebook sahara-fred-cary`).

---

## 2b. Feature categories to dial in (per-category autoresearch)

The features you present map to **five coaching categories** in `COACHING_PROMPTS`. Run **separate autoresearch runs per category** so each presented feature is dialed in with its own evals and mutations.

| Category | Key in `prompts.ts` | Framework / focus | What to dial in |
|----------|---------------------|--------------------|------------------|
| **Fundraising** | `fundraising` | Investor Lens — verdict first, stage, raise amount, targeting | Verdict clarity, “capital is a tool”, no deck-by-default, Boardy/matches refs when relevant |
| **Pitch / deck review** | `pitchReview` | Deck Review Protocol — scorecard, top 5 fixes, objections, Reality Lens | Scorecard present, evidence > narrative, no softball feedback |
| **Strategy** | `strategy` | 9-Step Startup Process — current step, gates, validation, milestones | Step validation, no skip-ahead, decision sequencing, upstream-before-downstream |
| **Positioning** | `positioning` | Positioning Readiness — Clarity, Differentiation, Market, Narrative; grade + Next 3 Actions | Grade + gaps + next actions; no messaging rewrites unless asked |
| **Mindset** | `mindset` | Fred’s philosophy, micro-victories, wellbeing, no therapy | Tough love + care, no flattery, redirect serious risk to professional support |

**Per-category workflow:** For each category you want to present as a feature:

1. **Target:** Only that category’s overlay in `lib/ai/prompts.ts` (e.g. `COACHING_PROMPTS.fundraising`).
2. **Evals:** Category-specific binary checks (see Section 4b below). Use the framework text in that overlay + training docs + NotebookLM.
3. **Runs:** One autoresearch run per category (e.g. `autoresearch-YYYYMMDD-fundraising`, `autoresearch-YYYYMMDD-strategy`), or run them in sequence.
4. **Mutation:** Change only that category’s prompt text; re-run FRED with that topic active; score; keep winner; log.

This way the **categories for the features you present** each get their own evals and optimization loop so they’re dialed in.

---

## 3. Workflow: AutoResearch on FRED responses & coaching

### Option A — Guided setup (recommended first time)

1. Say: *“Run autoresearch for the Sahara FRED chatbot using the training docs and coaching; use guided setup.”*
2. Follow **guided-setup** (`~/.claude/skills/autoresearch/workflows/guided-setup.md`). When asked:
   - **Project:** “Sahara / Fred Cary client — FRED chatbot responses and coaching”
   - **Target:** `lib/ai/prompts.ts` (and/or supplemental patches in `prompt-layers.ts`) in **this repo**
   - **Target type:** `skill` (prompt optimization) or treat as **client project** with custom evals
3. For **eval criteria**, use the training docs and NotebookLM (see Section 4).  
4. After config is confirmed, the skill will route to **skill-optimization** (or a client-project flow) and create `.planning/autoresearch/{run_id}/`.

### Option B — Direct config (when you have target + criteria)

1. **Target:** `lib/ai/prompts.ts` in this repo (or specific supplemental patch file).  
2. **Eval criteria:** Define 3–8 binary checks (see Section 4).  
3. **Runs per iteration:** 10 (prompts are noisy).  
4. **Max iterations:** 5–10.  
5. Create run: `.planning/autoresearch/{run_id}/` in **this repo**, `config.json` from `~/.claude/skills/autoresearch/templates/research-config.json`.  
6. **Baseline:** Run FRED N times with that topic active; evaluate with that category’s evals; record baseline score.  
7. **Loop:** Mutate only that category’s overlay → run → score → keep winner → log in `research-log.md`.  
8. **Notify:** After each deliverable, run **auto-notify** (email + text).

---

## 4. Eval criteria from training docs and NotebookLM

Use the **training docs in this repo** and **NotebookLM `sahara-fred-cary`** to turn “better responses and coaching” into binary evals.

**Ways to derive criteria:**

- From **docs/SAHARA-NOTEBOOKLM-SOURCE.md** and **.planning/OPERATING-BIBLE.md**: e.g. “Response follows 3-layer architecture”, “Uses one lens at a time”, “No skipping decision sequencing”.  
- From **FRED_COMMUNICATION_STYLE** (fred-brain): “Tone matches do/don’t list”, “No flattery”, “Tough love with care”.  
- From **COACHING_PROMPTS** in `prompts.ts`: “Keeps initial responses to 2–3 sentences”, “Framework active is applied (e.g. Investor Lens, 9-Step Process)”.  
- From **NotebookLM:**  
  - `nlm query "What must FRED never do when coaching?" --notebook sahara-fred-cary`  
  - `nlm query "What does good FRED coaching look like in 3 bullets?" --notebook sahara-fred-cary`  
  - Turn answers into binary checks.

**Example binary evals (customize from your training docs):**

```json
[
  { "id": "e1", "check": "Response stays 2–3 sentences for initial reply (or offers depth as follow-up)", "type": "binary" },
  { "id": "e2", "check": "Coaching aligns with Fred’s philosophy (mindset, honesty, no flattery)", "type": "binary" },
  { "id": "e3", "check": "Does not skip decision sequencing or let founder skip steps", "type": "binary" },
  { "id": "e4", "check": "Active framework (e.g. Investor Lens, 9-Step) is applied when relevant", "type": "binary" },
  { "id": "e5", "check": "No therapeutic or medical advice; redirects serious risk to professional support", "type": "binary" },
  { "id": "e6", "check": "NEVER: generic flattery or ignoring training doc constraints", "type": "negative" }
]
```

Store in `.planning/autoresearch/{run_id}/eval-criteria.json`.

---

## 4b. Per-category eval criteria (dial in each feature)

Use these **per category** when running separate autoresearch. Customize from training docs and `nlm query … --notebook sahara-fred-cary` as needed.

**Fundraising** (`COACHING_PROMPTS.fundraising`): Verdict first (Yes/No/Not yet); pass reasons before fixes; does not encourage fundraising by default; does not ask for deck by default; when relevant, references Boardy matches / next steps.

**Pitch review** (`COACHING_PROMPTS.pitchReview`): Deck Review Protocol (scorecard, top 5 fixes, objections, one-page narrative); Reality Lens; evidence > narrative; no softball feedback.

**Strategy** (`COACHING_PROMPTS.strategy`): Identifies actual step; no skip-ahead; “Do Not Advance If” gates; decision sequencing; upstream before downstream.

**Positioning** (`COACHING_PROMPTS.positioning`): Grade (A–F), Narrative Tightness (1–10), 3–5 gaps, Next 3 Actions; no messaging rewrites unless requested.

**Mindset** (`COACHING_PROMPTS.mindset`): Fred’s philosophy; no flattery; tough love with care; redirect serious risk to professional support.

Keep 3–8 evals per category.

---

## 5. Mutation strategy (what to change)

- **Only mutate:** `COACHING_PROMPTS` in `lib/ai/prompts.ts` and supplemental patches in `lib/ai/prompt-layers.ts` (Layer 2).  
- **Do not mutate:** `FRED_CORE_PROMPT` or identity/bio in `lib/fred-brain.ts`.

---

## 6. Quick start checklist

- [ ] Read autoresearch skill: `~/.claude/skills/autoresearch/SKILL.md`  
- [ ] Per feature category: run one autoresearch run per category with Section 4b evals.  
- [ ] Target: that slice of `lib/ai/prompts.ts` in **this repo**; never core prompt  
- [ ] Derive evals from Section 4b + `.planning/OPERATING-BIBLE.md` + NotebookLM  
- [ ] Create `.planning/autoresearch/{run_id}/` in **this repo**  
- [ ] After each deliverable: run **auto-notify** (email + text)

---

## 7. References

- **Autoresearch skill:** `~/.claude/skills/autoresearch/SKILL.md`  
- **Guided setup:** `~/.claude/skills/autoresearch/workflows/guided-setup.md`  
- **Skill optimization:** `~/.claude/skills/autoresearch/workflows/skill-optimization.md`  
- **Auto-notify:** `~/.claude/skills/autoresearch/workflows/auto-notify.md`  
- **This repo:** training/canon in `docs/SAHARA-NOTEBOOKLM-SOURCE.md`, `lib/fred-brain.ts`, `lib/ai/prompt-layers.ts`, `lib/ai/prompts.ts`, `.planning/OPERATING-BIBLE.md`  
- **NotebookLM:** notebook `sahara-fred-cary`

---

## 8. Source of truth: how the client wanted FRED to perform and act

Use these files **in this repo** to define “accurate” behavior. Do not invent criteria that aren’t grounded in them.

### Primary (canonical behavior)

| File | Purpose |
|------|--------|
| **`.planning/OPERATING-BIBLE.md`** | **Canonical reference.** Internal Operating Bible: how Sahara behaves, why, and how to run a mentor-quality experience. Sections: Mission, Product Promise, What Sahara is NOT, Mentor Contract; Core Philosophy (2.1–2.6); Voice & Communication (3); System Architecture/Layers (4); Universal Entry Flow (5); Diagnostic Introduction (6); Fred Cary Startup Process (7); Investor Lens (8); Investor Readiness (9); Positioning Readiness (10); Standard Protocols (11); Founder Snapshot (12); Weekly Check-in (13); Founder Wellbeing (14); We Are Not an Agent (15); Paywall (16); Testing & QA + Regression Triggers (17); Section 20 Operating Principles (one-page); Appendix opening/closing prompts. **This is the main source for “how FRED should perform and act.”** |

### Supporting (implementation and client voice)

| File | Purpose |
|------|--------|
| **`lib/ai/prompt-layers.ts`** | Implements Layer 1 (core) + Layer 2 patches; comments cite Operating Bible sections. |
| **`lib/ai/prompts.ts`** | Implements Layer 3 (COACHING_PROMPTS); canonical opening prompts from Operating Bible. |
| **`lib/fred-brain.ts`** | Fred identity, bio, philosophy, communication style (do/don’t). |
| **`lib/ai/__tests__/prompts.test.ts`** | Asserts Operating Bible principles (Section 20) and regression triggers (Section 17.3). |
| **`.planning/REQUIREMENTS.md`** | v7.0 scope; FRED Voice Preservation, voice regression suite, immutable core. |
| **`docs/SAHARA-NOTEBOOKLM-SOURCE.md`** | High-level Sahara/FRED overview for NotebookLM. |
| **`docs/meeting-notes-2026-03-04-sahara-founders.md`** | **Client voice:** Fred Cary (and others) — “guided venture journey” not chatbot, “co-founder level intelligence.” Use for intent; use Operating Bible for concrete rules. |

### What is not in this repo (gaps)

- No separate “Client Acceptance Criteria” or “Fred Cary sign-off” doc in the repo. The Operating Bible is the internal canonical spec; meeting notes are client voice, not formal sign-off.
- If the client has a separate requirements or sign-off doc elsewhere, add it to this section when available.

**For autoresearch:** Derive all binary evals from `.planning/OPERATING-BIBLE.md` (and the tests that enforce it). Use meeting notes and NotebookLM for intent and phrasing, not for inventing new rules.
