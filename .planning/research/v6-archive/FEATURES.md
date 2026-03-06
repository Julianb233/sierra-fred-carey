# Feature Landscape: Sahara v6.0

**Domain:** AI-powered founder OS -- content library, service marketplace, investor matching
**Researched:** 2026-02-18
**Overall Confidence:** MEDIUM-HIGH (ecosystem well-understood; integration patterns need validation during build)

---

## Domain 1: Content Library & Courses

### Table Stakes

Features founders expect from any educational content platform embedded in a mentor product. Missing any of these and the content library feels bolted-on rather than native.

| Feature | Why Expected | Complexity | FRED Integration | Notes |
|---------|-------------|------------|-----------------|-------|
| **Curated course catalog by topic** | Every platform (YC Startup School, Antler Academy, Google Startup School) organizes content by founder topic: fundraising, PMF, hiring, unit economics | Medium | FRED recommends specific courses based on diagnosed gaps | Catalog topics should mirror FRED's existing frameworks: Reality Lens, Positioning, Investor Readiness, 9-Step Process |
| **Stage-based content filtering** | Founders at idea stage need different content than Series A. Antler Academy uses a "nine-step pre-seed playbook" structure. YC Startup School has 8 sequential modules | Low | FRED already knows founder stage from onboarding -- use to auto-filter | Map to existing `STARTUP_STAGES`: idea, mvp, pre-seed, seed, series-a |
| **Video + text content formats** | MasterClass uses 10-30 min video lessons. YC Startup School mixes video lectures (4-38 min), essays, and expert interviews. Founderz uses cinematic-style video. Text-only feels cheap | Medium-High | Voice FRED could summarize key takeaways from videos | Video hosting adds infrastructure complexity (storage, transcoding, CDN). Consider embedding YouTube/Vimeo unlisted links initially |
| **Progress tracking per user** | Every learning platform tracks completion. YC Startup School has built-in progress tracking via React components. Users expect to see what they have and have not consumed | Low | FRED references completion status: "You've completed the fundraising module -- now let's apply it" | Simple: `content_progress` table with user_id, content_id, status (not_started/in_progress/completed), completed_at |
| **Search and browse** | Users expect to find content by keyword. Antler Academy has a searchable library. Google Startup School has categorized browsing | Low | N/A -- standard UI feature | Full-text search on title + description + tags |
| **Mobile-friendly content consumption** | 74% of organizations use mobile learning (industry data). Sahara already has PWA + mobile layout (Phase 46). Content must render well on mobile | Low | Already solved via PWA | Responsive video player, readable text on small screens |
| **Bookmarking / save for later** | Users expect to save content they want to return to. Standard across Coursera, MasterClass, etc. | Low | FRED could remind: "You bookmarked that pricing module -- want to discuss pricing strategy?" | Simple: `content_bookmarks` table |

### Differentiators

Features that set Sahara's content library apart from standalone education platforms. These are where FRED integration creates unique value no competitor can match.

| Feature | Value Proposition | Complexity | FRED Integration | Notes |
|---------|------------------|------------|-----------------|-------|
| **FRED-recommended content (contextual push)** | Unlike YC Startup School where you browse a static library, FRED actively recommends content based on what the founder is struggling with RIGHT NOW. "You're stuck on pricing -- here's a module on unit economics" | Medium | Core differentiator. FRED's diagnostic engine detects gaps and pushes relevant content in chat. Content IDs embedded in FRED responses | Requires content-to-framework mapping table. When FRED detects positioning weakness, it knows which content addresses it |
| **Content-to-action bridge** | After consuming a course module, FRED asks: "Now that you've learned about ICP definition, let's define YOUR ICP." Bridges learning to execution. No other platform does this | Medium | FRED triggers structured conversation after content completion. "You just watched the fundraising basics module. Let's assess your Investor Readiness Score" | Links content_id to FRED framework/mode: content on fundraising triggers Investor Mode |
| **Founder-stage adaptive curriculum** | Not just filtering by stage, but dynamically building a recommended learning path based on FRED's assessment of founder gaps. FRED says "Here are the 5 modules most critical for your situation, in this order" | Medium | FRED generates personalized curriculum from Reality Lens + IRS + Positioning gaps | Requires mapping: framework_gap -> content_ids. E.g., weak demand validation -> content on customer discovery |
| **"Ask FRED about this" per content** | While viewing any course content, a persistent button lets the founder ask FRED questions about the material. "I watched the unit economics video but I don't understand CAC:LTV for my marketplace model" | Low | Opens chat with content context injected: "The founder is asking about [content title]. Key concepts from this content: [summary]" | Similar to existing "Review with Fred" on documents (Phase 44) |
| **Framework worksheets tied to content** | Each course module includes a downloadable worksheet or template tied to FRED's frameworks. "Unit Economics Calculator" tied to the economics module, "ICP Template" tied to the positioning module | Medium | FRED walks through worksheet completion in chat. Worksheet outputs feed back into founder profile data | Extends existing document repository (Phase 44). Worksheets are structured templates with fillable fields |
| **Community discussion per module** | After completing a module, founders can discuss it in a topic-specific community thread. Builds engagement beyond passive content consumption | Low | FRED could summarize community discussion highlights. "Other founders found the ICP exercise most valuable -- want to try it?" | Extends existing communities infrastructure (Phase 41). Each content piece can have a linked discussion thread |

### Anti-Features

Features to deliberately NOT build for the content library. These are common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| **Building a full LMS (Learning Management System)** | Sahara is a mentor platform, not an e-learning platform. Building grading, certificates, quizzes, SCORM compliance, instructor dashboards, etc. adds massive complexity for marginal value | Keep it simple: curated content catalog + progress tracking + FRED integration. The value is FRED-powered learning, not the LMS features |
| **User-generated content / instructor marketplace** | Allowing anyone to upload courses creates moderation burden, quality inconsistency, and dilutes Fred Cary's authority as the expert voice | All content is admin-curated. Fred Cary + selected experts are the instructors. Quality over quantity |
| **Gamification (badges, points, leaderboards)** | Gamification feels hollow for serious founders. YC Startup School notably does NOT gamify. MasterClass does not gamify. Real founders want results, not virtual badges | Replace gamification with FRED-driven urgency: "You haven't completed the fundraising prep module and your pitch is in 2 weeks" |
| **Live cohort-based courses with schedules** | Scheduling complexity, timezone management, instructor availability, recording + replay infrastructure. Massive operational overhead for a product that should work asynchronously | All content is on-demand. Live elements happen through existing LiveKit coaching sessions (Phase 29) and community events (Phase 41), not tied to course schedules |
| **AI-generated course content** | Tempting to use AI to auto-generate courses. Results in generic, low-authority content. Fred Cary's expertise and voice ARE the product | Content is human-created by Fred Cary and vetted experts. AI enhances consumption (FRED explains, contextualizes, applies) but does not replace human expertise |
| **Completion certificates / credentials** | Founders do not need certificates from Sahara. They need results. Certificates add PDF generation complexity and provide false signals of competence | Track completion for FRED's context, not for credentialing. If founders want proof, their startup results are the proof |

---

## Domain 2: Service Marketplace

### Table Stakes

Features founders expect from any service provider marketplace. Based on analysis of Clutch (350K+ providers), Toptal (20K+ vetted pros), and the 21-feature services marketplace checklist from Rigby.

| Feature | Why Expected | Complexity | FRED Integration | Notes |
|---------|-------------|------------|-----------------|-------|
| **Provider directory with categories** | Every marketplace has browsable categories. Clutch uses service type (development, design, marketing, legal, accounting). Toptal uses role type (developer, designer, finance expert) | Medium | FRED says "You need a pitch deck designer -- here are vetted providers" and links to filtered directory | Categories: Legal (incorporation, IP, contracts), Financial (accounting, bookkeeping, tax), Design (pitch decks, branding, UX), Development (MVP, mobile, web), Marketing (growth, content, PR) |
| **Provider profiles with details** | Clutch shows verified reviews, portfolio, pricing range, team size, location. Toptal shows skills, experience, availability. Founders need enough info to evaluate | Medium | FRED could surface provider recommendations based on founder's specific need and budget | Profile fields: name, category, description, pricing_range, portfolio_url, reviews, rating, availability, location |
| **Search and filter by category/budget/rating** | Standard marketplace discovery. Filter by service type, price range, rating, availability | Low | N/A -- standard UI | Leverage existing search patterns from investor contacts page |
| **Reviews and ratings from other founders** | 67% of marketplace users want identity verification. Reviews are the primary trust signal on Clutch. Founders want social proof from other founders | Medium | After project completion, FRED prompts: "How was your experience with [provider]? Your review helps other founders" | `provider_reviews` table with rating, text, reviewer_id (anonymized display), project_type |
| **Contact/inquiry mechanism** | Founders need a way to reach out to providers. In-platform messaging keeps communication tracked and prevents disintermediation | Medium | FRED drafts initial outreach: "Based on your needs, here's a suggested message to [provider]" | In-app messaging or structured inquiry form. Start with inquiry form (simpler), add messaging later |
| **Provider vetting indication** | Clutch uses verified reviews. Toptal accepts only top 3%. Founders need to know these are vetted, not random freelancers. 40% of gig platform users worry about fraud | Low | FRED says "All providers on Sahara are vetted by our team" -- trust comes from platform curation | Admin-managed vetting. Providers apply, admin reviews, approves/rejects. Display "Sahara Vetted" badge |

### Differentiators

Features that make Sahara's marketplace uniquely valuable versus going to Clutch or Toptal directly.

| Feature | Value Proposition | Complexity | FRED Integration | Notes |
|---------|------------------|------------|-----------------|-------|
| **FRED-triggered provider recommendations** | Unlike browsing Clutch, FRED identifies WHAT the founder needs and WHEN. During conversation: "You need to incorporate in Delaware before fundraising. Here are 3 vetted legal providers who handle startup incorporation" | Medium | FRED's conversation state detects needs (legal, financial, design) and proactively suggests providers from the marketplace. Next Steps can include "Find a [category] provider" action | Requires mapping: detected_need -> provider_category. E.g., deck review reveals poor design -> suggest pitch deck designer |
| **Context-aware matching** | Providers matched based on founder's specific situation: stage, budget, industry, specific need. Not just category browsing but "here's who fits YOUR situation" | Medium | FRED has full founder context. Matching accounts for budget (from financial data), complexity (from project description), urgency (from fundraising timeline) | Deterministic pre-filter (category, budget range) + optional AI ranking for top matches |
| **Task-to-provider pipeline** | When FRED identifies a task the founder cannot do themselves, it becomes a Next Steps item with "Find Provider" action. Seamless flow from mentoring to marketplace | Low | "You need a financial model for investor conversations. You can build it yourself (here's the template) or hire a vetted financial modeler" -- links to marketplace | Extends Next Steps Hub (Phase 43). New action type: "find_provider" with category filter |
| **Starter package pricing** | Providers offer Sahara-specific starter packages at known price points. Unlike Clutch where pricing is opaque, founders see "Startup Incorporation Package: $500-$800" upfront | Low | FRED can quote expected costs: "Incorporation typically runs $500-$800 through our vetted providers" | Admin manages starter packages per provider. Not a full escrow system -- just transparent pricing |
| **Project outcome tracking** | After hiring a provider through Sahara, track whether the deliverable was received and its impact. "Pitch deck redesign complete -- now let's run it through FRED's deck review" | Medium | FRED follows up: "Your deck designer delivered last week. Want to review the new deck together?" Closes the loop between marketplace and mentoring | `marketplace_projects` table with status tracking. Simple: requested/in_progress/completed/reviewed |

### Anti-Features

Features to deliberately NOT build for the service marketplace. These are common marketplace over-engineering mistakes.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| **Full escrow payment processing** | Escrow requires payment processor integration (Stripe Connect), complex fund holding, dispute resolution, tax compliance (1099s), and significant regulatory overhead. Services marketplace escrow is a standalone product | Sahara connects founders with providers. Payment happens off-platform directly between founder and provider. Sahara takes no transaction fee initially. Revenue comes from provider listing fees or referral commissions tracked manually |
| **In-platform project management** | Milestone tracking, file sharing, time tracking, work verification -- this is what Upwork builds. It is a massive engineering investment | Founders manage projects with providers outside Sahara. Sahara tracks that the project exists and its outcome (for FRED context). Use simple status: requested/in_progress/completed |
| **Automated provider matching algorithm** | Building sophisticated two-sided marketplace matching with availability calendars, auto-scheduling, real-time bidding. This is Toptal's core product and took years to build | Manual curation by admin team. FRED recommends from curated list. Start with 10-20 vetted providers, not 10,000. Quality over scale |
| **Provider-side dashboard / analytics** | Provider CRM, lead management, analytics dashboard, calendar management. This is building a second product for a second user type | Providers get a simple profile page they can edit. Inquiries come via email. Track basic metrics (views, inquiries) in admin panel only |
| **Two-sided reviews (provider reviews founder)** | Adds complexity and creates negative incentive (founders avoid honest reviews fearing retribution). Clutch is one-sided (clients review providers) and it works | One-sided: founders review providers. Admin monitors review quality. Providers cannot review or rate founders |
| **Real-time chat/messaging system** | Building real-time messaging (WebSocket, presence indicators, typing indicators, message history, push notifications) is a significant infrastructure investment | Start with structured inquiry forms. Provider receives email notification. Initial conversations happen via email. Add in-platform messaging only if inquiry volume justifies it |

---

## Domain 3: Investor Matching (Real Boardy API Integration)

### Table Stakes

Features founders expect from any investor matching tool. Based on analysis of AngelList (5M+ members), Signal by NFX (10K+ investor profiles), Metal (fundraising CRM), Gust (80K investors), and existing Sahara Boardy mock.

| Feature | Why Expected | Complexity | FRED Integration | Notes |
|---------|-------------|------------|-----------------|-------|
| **Investor profile database** | AngelList has 100K+ investor profiles. Signal has 10K+. Metal has filterable database with 20+ criteria. Founders expect to browse real investors, not AI-generated fictional ones | Medium | FRED references real investor data: "Based on your stage and sector, Sequoia's seed fund and First Round Capital are strong fits" | Current Boardy mock generates FICTIONAL investors. Real Boardy API would provide actual investor profiles. If Boardy API unavailable, build internal curated database |
| **Stage/sector/check-size filtering** | Every platform supports this. Signal filters by industry, stage, geography. Metal filters across 20+ criteria. AngelList has advanced search | Low | FRED already captures founder's stage, sector, and fundraising target. Auto-apply as default filters | Already partially built in Phase 20 investor contacts (stages, sectors, check_size_min/max arrays) |
| **Match scoring / relevance ranking** | AngelList provides "Investment Likelihood Score." Metal uses empirical precision based on historical data. Gust matches startups with relevant investors. Founders need to know WHO to prioritize | Medium | FRED explains scores: "First Round is a 92% match because they invested in 3 companies at your stage in your sector last year" | Existing `ai_match_score` in `fundraising_pipelines` table. Enhance with real Boardy data or curated scoring |
| **Warm intro path mapping** | Metal maps Gmail + LinkedIn connections to show warm intro paths. Signal reveals warm intro paths via Gmail metadata. NFX built this as a core feature. Warm intros are 10x more effective than cold outreach | High | FRED asks "Do you know anyone at [firm]?" and helps craft intro requests | This is where Boardy's real API provides unique value -- they map relationship networks. Without Boardy API, this is very hard to build from scratch |
| **Pipeline / CRM tracking** | Signal has built-in CRM. Metal is a fundraising CRM. Foundersuite tracks communications. Even a spreadsheet template (Techstars provides one) is expected | Medium | FRED updates pipeline: "You had the meeting with [investor] -- how did it go? Let me update your pipeline and suggest next steps" | Already built in Phase 20: `fundraising_pipelines` table with 11 stages. Enhance UI and connect to real data |
| **Outreach draft generation** | Multiple tools offer this. Metal has outreach tools. EasyVC has LinkedIn automation. Foundersuite tracks communications. At minimum, founders expect help crafting outreach | Low | Already built. FRED's fundraising agent has `outreachDraft` tool generating email sequences. Enhance with real investor context | Existing infrastructure in `lib/agents/fundraising/tools.ts`. Wire to real investor data instead of mock |

### Differentiators

Features that make Sahara's investor matching uniquely valuable versus using Signal, Metal, or AngelList standalone.

| Feature | Value Proposition | Complexity | FRED Integration | Notes |
|---------|------------------|------------|-----------------|-------|
| **Readiness-gated matching** | Unlike AngelList where anyone can browse investors, FRED gates investor matching behind Investor Readiness Score. "You're not ready to fundraise yet -- here's what to fix first." Prevents founders from burning investor relationships prematurely | Low | Already built (Phase 37, Phase 39). Reality Lens gates downstream activities. IRS gates fundraising tools. Extend gating to investor matching | Unique to Sahara. No other platform prevents premature fundraising. This is FRED's mentoring philosophy encoded as product behavior |
| **Boardy voice-first matching** | Boardy's unique value is VOICE-based networking. Founders have a phone conversation with Boardy AI, which learns about them and makes double-opt-in introductions. No other platform does this | Low (API integration) | FRED says "Want to expand your investor network? Call Boardy for a 10-minute conversation and they'll match you with investors who fit" | Sahara already has voice infrastructure (LiveKit, Twilio). Boardy adds a complementary voice-based networking layer |
| **Investor preparation coaching** | Metal has "Round Coach" for call prep. Sahara goes deeper: FRED runs a full mock investor meeting, tests the founder's answers, identifies weak spots, and generates specific preparation materials | Medium | Existing `meetingPrep` fundraising tool generates talking points and anticipated questions. Enhance with roleplay mode where FRED plays the investor | Extends existing meeting prep tool. Add conversational roleplay as a FRED mode: "Let me play devil's advocate as an investor and pressure-test your pitch" |
| **Post-meeting intelligence** | After an investor meeting, FRED debriefs: "What questions did they ask? What concerned them? Let me analyze and suggest follow-up strategy." Updates pipeline automatically with meeting notes and AI-generated next actions | Medium | FRED conducts structured debrief via chat. Extracts signals (interest level, concerns, timeline). Updates pipeline stage and generates follow-up outreach | New FRED conversation mode: "Investor Meeting Debrief." Structured questions, AI analysis, automatic pipeline update |
| **Unified investor context across all FRED interactions** | Unlike using Signal for CRM + separate tool for outreach + another for prep, FRED has ALL context: readiness score, pitch deck quality, meeting history, investor feedback. Every recommendation is holistic | Low | This is inherent to Sahara's architecture. All data lives in one database. FRED accesses everything. No context switching between tools | Not a feature to build -- it is an architectural advantage to market. "Everything in one place, understood by one AI mentor" |

### Anti-Features

Features to deliberately NOT build for investor matching.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| **Building a full investor database from scratch** | AngelList has 5M members. Crunchbase has comprehensive VC data. Building and maintaining a proprietary investor database is a data operations business, not a mentor platform feature | Integrate with Boardy API for real-time matching. Supplement with admin-curated partner lists (Phase 20 infrastructure). Allow founder CSV upload. Do NOT try to build a comprehensive database |
| **Automated email sending to investors** | Sending fundraising emails from Sahara's domain. Domain reputation risk, deliverability management, SPF/DKIM complexity, and founders lose control of their fundraising communications | Generate drafts only. Copy to clipboard. Track send status manually (founder marks as "sent"). This design decision is already documented in Phase 20 research |
| **Direct intro brokering** | Positioning Sahara as an intro broker between founders and investors. This requires investor opt-in, relationship management, and creates liability if introductions go poorly | Boardy handles intros via their double-opt-in system. Sahara helps founders PREPARE for meetings. FRED coaches -- Boardy connects |
| **Real-time investor activity feeds** | Showing which investors just made investments, what rounds closed, live deal flow. This is Crunchbase/PitchBook territory and requires expensive data partnerships | Focus on founder-specific investor insights: "Based on [investor]'s recent portfolio, here's why they might be interested in you." AI-synthesized, not real-time data feeds |
| **LinkedIn/email automation / scraping** | EasyVC does LinkedIn outreach automation. This violates platform ToS, creates legal risk, and damages professional relationships | All outreach is founder-initiated. FRED crafts the message, founder sends it themselves. No automation of sending. Sahara teaches founders to fundraise authentically |

---

## Domain 4: Infrastructure Hardening (Cross-Cutting)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|------------|-------|
| **Error monitoring (Sentry)** | Production platforms need error tracking. Currently only basic logging exists | Medium | Sentry SDK integration, source maps, alert rules, issue tracking |
| **Activated SMS check-ins (Twilio)** | SMS infrastructure exists (Phase 42) but is not yet activated for real delivery. Founders on Studio tier expect SMS check-ins to work | Low | `lib/sms/client.ts` exists with Twilio. Need to activate with real Twilio credentials and test delivery |
| **CI/CD pipeline** | Automated testing and deployment. Currently manual deployment | Medium | GitHub Actions: lint, test, build, deploy to Vercel. Run Stagehand browser tests on PR |
| **Voice call reliability (LiveKit)** | LiveKit integration exists (Phase 29, Phase 42) but needs production hardening: connection retry, fallback, quality monitoring | Medium | Connection state management, retry logic, call quality metrics, graceful degradation |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|------------|-------|
| **FRED Intelligence Upgrade** | Smarter AI responses, better context window management, improved framework detection. Phase 32 already did one upgrade. v6.0 pushes further with better memory and reasoning | High | Upgrade model, tune prompts, improve diagnostic engine accuracy, add conversation summarization |
| **Dashboard Analytics** | Richer founder metrics beyond current Snapshot Card. Trend lines, comparative benchmarks, progress visualization over time | Medium | New analytics page with charts: readiness score over time, next steps completion rate, check-in streak, content consumption |
| **PWA refinements** | Smoother offline experience, better push notification handling, app-like transitions | Low-Medium | Already has PWA (Phase 22). Polish: offline content caching, notification grouping, transition animations |

---

## Feature Dependencies

```
CONTENT LIBRARY chain:
  Admin content management (CMS)
    -> Content catalog page
    -> Stage-based filtering
    -> Progress tracking
    -> FRED content recommendations
    -> Content-to-action bridge
    -> Framework worksheets

SERVICE MARKETPLACE chain:
  Admin provider management
    -> Provider directory page
    -> Provider profiles
    -> Search/filter
    -> Reviews system
    -> FRED-triggered recommendations
    -> Task-to-provider pipeline

INVESTOR MATCHING chain:
  Boardy API client (replace mock)
    -> Real investor profiles in match list
    -> Warm intro path mapping
    -> Enhanced pipeline CRM UI
    -> Investor preparation coaching
    -> Post-meeting intelligence

CROSS-DEPENDENCIES:
  Content Library + FRED: Content recommendations require content-to-framework mapping
  Service Marketplace + FRED: Provider recommendations require need-detection in conversation
  Service Marketplace + Next Steps: "Find provider" action type in Next Steps Hub
  Investor Matching + IRS: Readiness gating uses Investor Readiness Score (already built)
  Investor Matching + Content: Fundraising content modules tied to investor readiness gaps
  Content Library + Marketplace: Course on "hiring developers" links to dev provider category
```

---

## MVP Recommendation

### Phase 1 Priority: Content Library (Foundation)

Build the content library first because:
1. **Lowest external dependency** -- no third-party API integration required (unlike Boardy)
2. **Highest FRED integration value** -- content recommendations make FRED immediately smarter
3. **All tiers benefit** -- Free tier can access some content (growth strategy)
4. **Content populates immediately** -- Fred Cary can record/write content in parallel with development
5. **Foundation for marketplace** -- "here's how to do X" naturally leads to "here's who can do X for you"

MVP features:
1. Admin content management (create/edit/publish courses)
2. Content catalog page with stage filtering
3. Individual content viewing (video embed + text)
4. Progress tracking (started/completed)
5. FRED content recommendations in chat
6. "Ask FRED about this" button on content pages

Defer to post-MVP:
- Framework worksheets (requires new document type infrastructure)
- Community discussion per module (extension of existing communities)
- Adaptive curriculum generation (requires content-to-gap mapping maturity)

### Phase 2 Priority: Service Marketplace (MVP)

Build after content library because:
1. Content creates the "learn" experience; marketplace creates the "do" experience
2. Provider curation can happen in parallel with content library development
3. Simpler technically than investor matching (no external API dependency)

MVP features:
1. Admin provider management (add/edit/vet providers)
2. Provider directory with category browsing
3. Provider profile pages with details
4. Inquiry form (contact provider)
5. FRED-triggered provider recommendations in chat
6. "Find Provider" action in Next Steps Hub

Defer to post-MVP:
- Reviews and ratings (need critical mass of completed projects first)
- Context-aware matching (start with category match, add AI ranking later)
- Project outcome tracking (too early without transaction volume)

### Phase 3 Priority: Real Boardy API Integration

Build last because:
1. **External API dependency** -- requires Boardy API access, documentation, and testing
2. **Existing mock provides value** -- AI-generated matches work for demo/early users
3. **Infrastructure already exists** -- Strategy pattern in `lib/boardy/client.ts` designed for exactly this swap
4. **High value but high risk** -- if Boardy API is unavailable or changes, having it last means less rework

MVP features:
1. Replace MockBoardyClient with RealBoardyClient
2. Real investor profiles in match results
3. Deep link to Boardy for voice networking
4. Warm intro path display (if Boardy API supports it)
5. Enhanced match display with real investor data

Defer to post-MVP:
- Investor preparation roleplay mode
- Post-meeting debrief automation
- Full warm intro path mapping (depends on Boardy API capabilities)

### Infrastructure: Interleave Throughout

- **Sentry**: Add in Phase 1 (catches errors during content library development)
- **Twilio activation**: Add in Phase 1 (independent, quick win)
- **CI/CD**: Add in Phase 1 (protects all subsequent development)
- **FRED Intelligence Upgrade**: Add in Phase 2 (benefits from content library data)
- **Dashboard Analytics**: Add in Phase 3 (benefits from all data sources)
- **PWA Polish**: Add in Phase 3 (final UX refinement)

---

## Tier Distribution for New Features

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Content Library (basic catalog) | Yes (limited) | Yes (full) | Yes (full) |
| FRED content recommendations | No | Yes | Yes |
| Framework worksheets | No | Yes | Yes |
| Service Marketplace (browse) | Yes (view only) | Yes (inquire) | Yes (inquire + priority) |
| FRED provider recommendations | No | Yes | Yes |
| Boardy real matching | No | No | Yes |
| Investor prep coaching | No | Pro (basic) | Studio (full) |
| Dashboard Analytics | Basic | Full | Full |
| SMS Check-ins (activated) | No | No | Yes |

---

## Competitive Landscape Summary

### Content Library Competitors

| Platform | Model | Strength | Sahara Advantage |
|----------|-------|----------|-----------------|
| YC Startup School | Free, open | Brand, breadth, co-founder matching | FRED personalizes + bridges to action |
| Antler Academy | Free, open | Step-by-step playbook, community | FRED recommends based on gaps, not just sequence |
| Google Startup School | Free, guided | Google brand, structured workshops | FRED knows your startup deeply -- not generic |
| MasterClass | $15-23/mo subscription | Celebrity instructors, production quality | Fred Cary as expert + AI that applies learning |
| Founderz | Subscription | Cinematic AI education | FRED is the AI, content feeds the mentor |

### Service Marketplace Competitors

| Platform | Model | Strength | Sahara Advantage |
|----------|-------|----------|-----------------|
| Clutch | Free for buyers | Scale (350K+ providers), verified reviews | FRED identifies WHAT you need and WHEN |
| Toptal | Premium (top 3%) | Elite talent, fast matching (24-48hr) | Startup-specific curation, FRED context |
| UpCounsel | Legal marketplace | Legal specialization | Integrated with full founder journey |
| Paro | Financial talent | Pre-vetted CPAs/analysts | FRED bridges financial gaps to providers |

### Investor Matching Competitors

| Platform | Model | Strength | Sahara Advantage |
|----------|-------|----------|-----------------|
| AngelList | Free platform | Scale (5M members), ecosystem | Readiness gating prevents premature outreach |
| Signal (NFX) | Free CRM | Warm intro mapping via Gmail | FRED coaches prep + debriefs meetings |
| Metal | Freemium CRM | 20+ filter criteria, Round Coach | Unified context across all mentoring |
| Gust | Free/paid | 80K investors, legal tools | FRED assesses readiness before matching |
| Boardy | Free networking | Voice-first, double-opt-in intros | Integrated into FRED's ecosystem |

---

## Sources

### HIGH Confidence (Official docs, codebase analysis)
- Sahara codebase: `lib/boardy/client.ts`, `lib/boardy/mock.ts`, `lib/boardy/types.ts` -- read in full
- Sahara codebase: `lib/constants.ts` -- read in full (tier features, nav, stages)
- Sahara codebase: Phase 20 research (`20-RESEARCH.md`) -- read in full (investor infrastructure)
- [YC Startup School Curriculum](https://www.startupschool.org/curriculum) -- fetched and analyzed
- [Rigby Services Marketplace 21-Feature Checklist](https://www.rigbyjs.com/blog/services-marketplace-features) -- fetched and analyzed
- [Metal Fundraising CRM](https://www.metal.so) -- fetched and analyzed

### MEDIUM Confidence (Multiple sources agree)
- [Clutch Marketplace](https://clutch.co/) -- WebSearch verified
- [Toptal Features](https://clutch.co/profile/toptal) -- WebSearch verified
- [AngelList 2025 Guide](https://builders.saralgroups.com/news/angellist-the-ultimate-2025-guide-to-startup-funding-and-angel-investing/) -- WebSearch
- [Signal by NFX](https://signal.nfx.com/) -- WebSearch, multiple sources
- [Gust Platform Features](https://gust.com/) -- WebSearch, multiple sources
- [Boardy AI Features](https://www.boardy.ai/) -- WebSearch, multiple sources
- [Antler Academy](https://www.antler.co/academy) -- WebSearch
- [Best Investor Discovery Platforms](https://qubit.capital/blog/best-investor-discovery-tools) -- fetched and analyzed
- [a16z Marketplace Evolution](https://a16z.com/whats-next-for-marketplace-startups/) -- WebSearch
- [Sharetribe Marketplace Payments Guide](https://www.sharetribe.com/academy/marketplace-payments/) -- WebSearch

### LOW Confidence (Single source, needs validation)
- EdTech mobile learning stat (74% of organizations) -- single source, but widely cited
- Gig platform fraud concern stat (40% worry about fraud, 67% want verification) -- single source from Rigby
- LXP market growth projection ($2.8B to $28.9B by 2033, 33.79% CAGR) -- single source
