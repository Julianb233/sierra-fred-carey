# Requirements: Sahara v5.0 Community & Retention

**Defined:** 2026-02-11
**Core Value:** Founders stay engaged and grow faster because FRED connects them to the right peers, insights, and accountability at the right time — turning a 1:1 mentor tool into a founder community platform.

## v5.0 Requirements

### Community Infrastructure (CINFRA)

- [ ] **CINFRA-01**: Community profiles with opt-in visibility settings (name, stage, industry, bio, achievements visible to peers)
- [ ] **CINFRA-02**: Anonymized data pipeline that aggregates founder patterns with explicit consent (opt-in per data category)
- [ ] **CINFRA-03**: Database schema for cohorts, benchmarks, social feed, messaging, and expert network with RLS policies
- [ ] **CINFRA-04**: Consent management system with granular data sharing preferences in settings (benchmarks, social, directory, messaging)
- [ ] **CINFRA-05**: Community tier gating — Free reads feed, Pro joins cohorts, Studio gets directory + messaging

### Anonymized Benchmarks & Collective Intelligence (BENCH)

- [ ] **BENCH-01**: "Founders like you" contextual insights surfaced during FRED conversations (stage, industry, funding-matched)
- [ ] **BENCH-02**: Benchmark dashboard comparing founder metrics to stage-appropriate peer averages (IRS score, milestones, red flags)
- [ ] **BENCH-03**: FRED weekly "State of the Founder" trend report email from aggregate patterns across the platform
- [ ] **BENCH-04**: Red Flag heatmap showing most common risks by founder stage (seed, Series A, etc.)
- [ ] **BENCH-05**: Benchmark data tiered — Free gets basic (your stage average), Pro/Studio gets full segmented data

### Milestone Social Feed (SOCIAL)

- [ ] **SOCIAL-01**: Opt-in public milestone feed where founders celebrate achievements (completed Reality Lens, closed round, etc.)
- [ ] **SOCIAL-02**: FRED shoutouts — FRED references anonymized peer wins in conversations ("Another founder at your stage just...")
- [ ] **SOCIAL-03**: Shareable achievement cards — branded visual cards founders post to LinkedIn/Twitter (drives organic acquisition)
- [ ] **SOCIAL-04**: Feed engagement — founders can react (encourage) and comment on peer milestones
- [ ] **SOCIAL-05**: Activity metrics tracking social engagement (views, reactions, shares) for growth analytics

### Cohort Matching & Roundtables (COHORT)

- [ ] **COHORT-01**: Auto-matching algorithm grouping founders by stage, industry, funding, and team size from intake data
- [ ] **COHORT-02**: Cohort groups of 5-8 founders — Pro gets 8-person cohorts, Studio gets 5-person (more intimate)
- [ ] **COHORT-03**: FRED-facilitated async weekly roundtable threads — FRED poses a framework question, founders respond, FRED synthesizes
- [ ] **COHORT-04**: Cohort leaderboard tracking framework completion progress (Reality Lens done, Strategy Reframing done, etc.)
- [ ] **COHORT-05**: Cohort management — founders can leave and rejoin cohorts, max 1 active cohort at a time
- [ ] **COHORT-06**: FRED roundtable frequency tiered — Pro gets monthly, Studio gets weekly

### Accountability & Engagement Loops (ENGAGE)

- [ ] **ENGAGE-01**: Accountability partner pairing within cohorts — FRED matches two founders and facilitates check-ins
- [ ] **ENGAGE-02**: Streak tracking for consecutive FRED check-in days with visual streak counter on dashboard
- [ ] **ENGAGE-03**: Framework progress bar on dashboard visualizing completion of Fred's 9-step process
- [ ] **ENGAGE-04**: Personalized daily FRED digest notification — cohort activity summary + your top priority today
- [ ] **ENGAGE-05**: Accountability nudges — "Your partner hit their milestone. How's yours going?" via push notification
- [ ] **ENGAGE-06**: Weekly momentum score combining check-ins, framework progress, and community engagement

### Founder Directory & Messaging (DIR)

- [ ] **DIR-01**: Searchable founder directory with filters (stage, industry, expertise, location) — Studio tier only
- [ ] **DIR-02**: Direct messaging between founders with FRED as optional facilitator — Studio tier only
- [ ] **DIR-03**: FRED-facilitated introductions — FRED identifies complementary founders and suggests connections
- [ ] **DIR-04**: Directory profiles show public achievements, stage, industry — no private data exposed
- [ ] **DIR-05**: Block/report functionality for directory and messaging

### Expert Network & Marketplace (EXPERT)

- [ ] **EXPERT-01**: Service exchange listings — founders offer expertise to peers (design review, technical architecture, go-to-market)
- [ ] **EXPERT-02**: Investor warm intro opt-in — founders who've closed rounds can introduce others to their investors
- [ ] **EXPERT-03**: FRED-brokered connections — FRED identifies when a founder's problem matches another founder's expertise
- [ ] **EXPERT-04**: Reputation system — founders earn credibility from community contributions (introductions made, roundtable participation)

## Tier Access Matrix

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Read community feed | Yes | Yes | Yes |
| View basic benchmarks | Yes (stage avg only) | Full segmented | Full + custom |
| Join cohort | No | Yes (8-person) | Yes (5-person) |
| Accountability partner | No | Yes | Yes |
| FRED roundtable frequency | No | Monthly | Weekly |
| Milestone social feed | View only | Post + react | Post + react |
| Achievement cards | No | Yes | Yes |
| Founder directory | No | No | Yes |
| Direct messaging | No | No | Yes |
| Expert network | No | No | Yes |
| Daily FRED digest | No | Yes | Yes |
| Streak tracking | Yes | Yes | Yes |
| Framework progress bar | Yes | Yes | Yes |

## Out of Scope (v5.0)

| Feature | Reason |
|---------|--------|
| Video group calls | Async-first community; live video deferred to v6.0+ |
| Paid coaching marketplace | Founders help each other for free; paid mentors deferred |
| Community admin tools | Self-moderated for v5.0; admin controls in v6.0+ |
| AI-generated community content | FRED facilitates, does not generate posts on behalf of founders |
| Cross-platform community (Discord/Slack) | Keep community in-app to retain engagement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CINFRA-01 | Phase 47 | Pending |
| CINFRA-02 | Phase 47 | Pending |
| CINFRA-03 | Phase 47 | Pending |
| CINFRA-04 | Phase 47 | Pending |
| CINFRA-05 | Phase 47 | Pending |
| BENCH-01 | Phase 48 | Pending |
| BENCH-02 | Phase 48 | Pending |
| BENCH-03 | Phase 48 | Pending |
| BENCH-04 | Phase 48 | Pending |
| BENCH-05 | Phase 48 | Pending |
| SOCIAL-01 | Phase 49 | Pending |
| SOCIAL-02 | Phase 49 | Pending |
| SOCIAL-03 | Phase 49 | Pending |
| SOCIAL-04 | Phase 49 | Pending |
| SOCIAL-05 | Phase 49 | Pending |
| COHORT-01 | Phase 50 | Pending |
| COHORT-02 | Phase 50 | Pending |
| COHORT-03 | Phase 50 | Pending |
| COHORT-04 | Phase 50 | Pending |
| COHORT-05 | Phase 50 | Pending |
| COHORT-06 | Phase 50 | Pending |
| ENGAGE-01 | Phase 51 | Pending |
| ENGAGE-02 | Phase 51 | Pending |
| ENGAGE-03 | Phase 51 | Pending |
| ENGAGE-04 | Phase 51 | Pending |
| ENGAGE-05 | Phase 51 | Pending |
| ENGAGE-06 | Phase 51 | Pending |
| DIR-01 | Phase 52 | Pending |
| DIR-02 | Phase 52 | Pending |
| DIR-03 | Phase 52 | Pending |
| DIR-04 | Phase 52 | Pending |
| DIR-05 | Phase 52 | Pending |
| EXPERT-01 | Phase 53 | Pending |
| EXPERT-02 | Phase 53 | Pending |
| EXPERT-03 | Phase 53 | Pending |
| EXPERT-04 | Phase 53 | Pending |

**Coverage:**
- v5.0 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
