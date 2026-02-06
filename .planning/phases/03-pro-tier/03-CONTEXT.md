# Phase 03: Pro Tier Features - Context

**Phase:** 03
**Theme:** Pro Tier Features
**Status:** IN PROGRESS
**Started:** 2026-02-05

---

## Phase Overview

Phase 03 implements the Pro tier features that justify the paid subscription. These features focus on document intelligence and investor readiness - the highest-value deliverables for growth-stage founders.

---

## Dependencies

**From Phase 01:**
- FRED cognitive engine (decision making, scoring)
- Memory persistence (storing document analysis)
- Circuit breaker reliability (API stability)

**From Phase 02:**
- Tier gating infrastructure (TierContext, requireTier middleware)
- FRED chat interface (for document Q&A)
- Decision history (tracking analysis sessions)

---

## Key Technical Decisions

### PDF Processing Strategy
- Use `pdf-parse` for text extraction (server-side)
- Use `pdfjs-dist` for client-side preview if needed
- Chunk documents intelligently (semantic boundaries, not fixed size)
- Store embeddings in pgvector for RAG retrieval

### Investor Readiness Score
- 0-100% overall score with category breakdown
- Categories: Team, Market, Product, Traction, Financials, Pitch
- Each category has specific criteria and weights
- Historical tracking to show improvement over time

### Pitch Deck Review
- Slide-by-slide analysis
- Standard pitch deck structure (12-15 slides)
- Specific feedback per slide type
- Comparison to successful pitch patterns

### Strategy Documents
- Template-driven generation
- FRED's voice and perspective
- Actionable, specific recommendations
- Export to PDF/DOCX

---

## Files to Create

### 03-01: PDF Pipeline
- `lib/documents/pdf-processor.ts` - PDF extraction and chunking
- `lib/documents/embeddings.ts` - Vector embedding generation
- `lib/db/documents.ts` - Document storage operations
- `app/api/documents/upload/route.ts` - Upload endpoint
- `app/api/documents/[id]/route.ts` - Document CRUD
- `components/documents/upload-zone.tsx` - Upload UI

### 03-02: Investor Readiness Score
- `lib/fred/investor-readiness.ts` - Scoring engine
- `app/api/fred/investor-readiness/route.ts` - IRS endpoint
- `components/dashboard/investor-readiness-card.tsx` - Score display
- `app/dashboard/investor-readiness/page.tsx` - Full IRS page

### 03-03: Pitch Deck Review
- `lib/fred/pitch-review.ts` - Review logic
- `app/api/fred/pitch-review/route.ts` - Review endpoint
- `components/pitch/slide-analysis.tsx` - Slide-by-slide UI
- `app/dashboard/pitch-review/page.tsx` - Review page

### 03-04: Strategy Documents
- `lib/fred/strategy-generator.ts` - Document generation
- `app/api/fred/strategy/route.ts` - Generation endpoint
- `components/strategy/document-preview.tsx` - Preview UI
- `app/dashboard/strategy/page.tsx` - Strategy page

### 03-05: Stripe Integration
- `lib/stripe/client.ts` - Stripe client setup
- `lib/stripe/webhooks.ts` - Webhook handlers
- `app/api/stripe/checkout/route.ts` - Checkout session
- `app/api/stripe/webhook/route.ts` - Webhook endpoint
- `components/tier/upgrade-modal.tsx` - Upgrade flow UI

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| PDF extraction failures | Multiple extraction strategies, graceful degradation |
| Large file handling | Streaming uploads, size limits, progress indicators |
| IRS score gaming | Clear criteria, require evidence, track consistency |
| Stripe webhook failures | Idempotency keys, retry logic, comprehensive logging |
| Document privacy | Encryption at rest, user-scoped access, retention policies |

---

## Success Criteria

- [ ] PDF upload works for files up to 10MB
- [ ] Documents chunked and embedded correctly
- [ ] IRS produces meaningful, actionable scores
- [ ] Pitch review identifies specific improvements
- [ ] Strategy documents are high quality and useful
- [ ] Pro tier purchase flow is smooth
- [ ] All Pro features properly gated

---

*Phase context for GSD framework*
