# Phase 63: FRED Intelligence Upgrade - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make FRED smarter with better memory retrieval, smoother mode switching, and new AI tools for recommending content and finding providers. This phase improves FRED's cognitive capabilities — not the UI, not new features, just making the existing FRED brain work better.

</domain>

<decisions>
## Implementation Decisions

### Memory Retrieval
- Both cross-session and within-session memory need improvement — founders report FRED forgetting past decisions AND losing context in long conversations
- Approach: Claude's discretion on the best blend of semantic search, topic-based recall, and recency weighting — optimize for performance
- Key requirement: Decisions made in past sessions must be reliably recalled when relevant (e.g., "we decided to target SMBs" should never be re-asked)

### Mode Switching
- Transitions should use subtle announcements — "Let me put on my investor hat here..." rather than silent shifts or loud UI banners
- The active mode indicator in the chat UI bar (built in Phase 45) still shows the current mode, but the conversational transition is what matters
- Detection sensitivity: lean conservative until battle-tested — better to miss a signal than false-positive into Investor Mode from a casual mention
- Require sustained signal (multiple messages with fundraising/positioning intent) rather than single keyword triggers

### Long Conversation Handling
- Both decisions AND coherence matter — FRED must never lose key decisions from the conversation, AND the thread should feel continuous
- FRED should offer a gentle nudge after extended conversations: "We've covered a lot — want me to summarize what we've decided and start a focused session on [topic]?"
- Behind the scenes, use summarization/compression so the user doesn't feel technical limitations

### Claude's Discretion
- Exact memory retrieval algorithm (semantic search, embeddings, hybrid approach)
- Summarization strategy for long conversations (sliding window, progressive summarization, etc.)
- Threshold tuning for mode detection sensitivity
- Implementation of new AI tools for content recommendation and provider finding

</decisions>

<specifics>
## Specific Ideas

- Memory should feel like talking to a mentor who actually remembers you — not a chatbot that resets every session
- Mode switching should feel like a real person naturally shifting focus, not a robot announcing "ENTERING INVESTOR MODE"
- Long conversations should feel like a continuous session with a human advisor who occasionally says "let me recap where we are"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 63-fred-intelligence-upgrade*
*Context gathered: 2026-02-23*
