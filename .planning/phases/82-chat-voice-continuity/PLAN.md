---
phase: 82-chat-voice-continuity
plan: 01
type: execute
wave: 2
depends_on: [79]
files_modified:
  - lib/voice/chat-context-loader.ts
  - lib/voice/transcript-injector.ts
  - workers/voice-agent/agent.ts
  - app/api/voice/context/route.ts
  - app/api/voice/transcript/route.ts
  - components/voice/last-discussed.tsx
autonomous: true

must_haves:
  truths:
    - "Voice agent preamble includes last N chat messages so FRED picks up where text left off"
    - "After a voice call ends, transcript and summary are injected back into chat history"
    - "Before a voice call starts, user sees 'Last discussed: [topic]' so they know FRED remembers"
    - "Switching between text and voice feels seamless with no context loss"
  artifacts:
    - path: "lib/voice/chat-context-loader.ts"
      provides: "Loads recent chat messages for voice agent preamble"
      exports: ["loadChatContextForVoice", "formatChatForPreamble"]
    - path: "lib/voice/transcript-injector.ts"
      provides: "Injects voice transcript back into chat history"
      exports: ["injectTranscriptToChat", "summarizeTranscript"]
    - path: "app/api/voice/context/route.ts"
      provides: "API to fetch chat context for voice agent"
      exports: ["GET"]
    - path: "app/api/voice/transcript/route.ts"
      provides: "API to store voice transcript in chat history"
      exports: ["POST"]
    - path: "components/voice/last-discussed.tsx"
      provides: "Last discussed topic display component"
      exports: ["LastDiscussed"]
  key_links:
    - from: "workers/voice-agent/agent.ts"
      to: "/api/voice/context"
      via: "fetch on session start to get chat context"
      pattern: "fetch.*api/voice/context"
    - from: "workers/voice-agent/agent.ts"
      to: "/api/voice/transcript"
      via: "POST transcript on session end"
      pattern: "fetch.*api/voice/transcript"
    - from: "components/voice/last-discussed.tsx"
      to: "fred-memory"
      via: "fetches last topic from memory"
      pattern: "fetch.*api/voice/context"
---

<objective>
Build seamless continuity between text chat and voice calls. The voice agent loads recent chat context into its preamble so it can reference what the founder discussed in text. After a call ends, the transcript is injected back into chat history. Before a call starts, users see what was last discussed.

Purpose: Switching between text and voice should feel like one continuous conversation -- no context loss, no repeating yourself.
Output: Chat context loader for voice, transcript injector for chat, LastDiscussed UI component, two API routes
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v8.0-go-live/ROADMAP.md
@.planning/STATE.md

# Voice agent -- will be modified
@workers/voice-agent/agent.ts

# Chat API -- reference for message format and memory
@app/api/fred/chat/route.ts

# Memory system
@lib/db/fred-memory.ts
@lib/fred/voice.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Chat Context Loader + Voice Transcript Injector + APIs</name>
  <files>
    lib/voice/chat-context-loader.ts
    lib/voice/transcript-injector.ts
    app/api/voice/context/route.ts
    app/api/voice/transcript/route.ts
  </files>
  <action>
1. Create `lib/voice/chat-context-loader.ts`:
   - Export `loadChatContextForVoice(userId: string, limit?: number): Promise<ChatContextForVoice>` that:
     - Queries `fred_memory` table (or wherever chat episodes are stored) for the user's last N messages (default N=10)
     - Returns `{ messages: { role: 'user'|'assistant', content: string, timestamp: string }[], lastTopic: string | null, summary: string }`
   - Export `formatChatForPreamble(context: ChatContextForVoice): string` that:
     - Formats messages into a concise preamble block: "Recent chat context:\n- User asked about X\n- You advised Y\n..."
     - Truncates to max 500 tokens to avoid bloating voice prompt
     - Extracts `lastTopic` from the most recent user message using a simple heuristic (first sentence or subject)
   - Use `createServiceClient()` for DB access

2. Create `lib/voice/transcript-injector.ts`:
   - Export `summarizeTranscript(transcript: { speaker: string, text: string }[]): Promise<string>` that:
     - Uses Vercel AI SDK `generateText` to create a 2-3 sentence summary of the voice call
     - Model: use `getModelForTier` with free tier (fast model for summarization)
   - Export `injectTranscriptToChat(userId: string, transcript: { speaker: string, text: string }[], summary: string): Promise<void>` that:
     - Stores the transcript summary as a special episode in fred_memory with `channel: 'voice'`
     - Format: "[Voice Call Summary] {summary}\n\nKey points discussed: ..."
     - Use `storeEpisode()` from `@/lib/db/fred-memory`

3. Create `app/api/voice/context/route.ts`:
   - GET endpoint requiring auth
   - Calls `loadChatContextForVoice(userId)` and returns JSON
   - Also returns `lastTopic` for the LastDiscussed component
   - Rate limit: 20/hour (voice sessions are less frequent)

4. Create `app/api/voice/transcript/route.ts`:
   - POST endpoint requiring auth
   - Accepts `{ transcript: { speaker: string, text: string, timestamp: string }[] }`
   - Calls `summarizeTranscript(transcript)` then `injectTranscriptToChat(userId, transcript, summary)`
   - Returns `{ success: true, summary: string }`
   - Rate limit: 10/hour
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `formatChatForPreamble` produces a readable preamble string under 500 tokens
    - API routes return correct shapes
  </verify>
  <done>
    - Chat context can be loaded and formatted for voice preamble
    - Voice transcripts can be summarized and injected into chat history
    - Both API routes are functional and rate-limited
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire Voice Agent + LastDiscussed UI Component</name>
  <files>
    workers/voice-agent/agent.ts
    components/voice/last-discussed.tsx
  </files>
  <action>
1. Modify `workers/voice-agent/agent.ts`:
   - In the `entry` function, BEFORE creating the agent session:
     - Extract user ID from room metadata or participant identity (the LiveKit room should have user context in metadata)
     - Fetch chat context: call the `/api/voice/context` endpoint (use the app's base URL from env var `NEXT_PUBLIC_APP_URL` or `LIVEKIT_APP_URL`)
     - Append the formatted chat context to the voice prompt: modify `buildFredVoicePrompt()` to accept an optional `chatContext: string` parameter and append it after the base prompt
   - On session end (use `AgentSessionEventTypes` or the existing transcript publish logic):
     - Collect all transcript entries that were published during the call
     - POST them to `/api/voice/transcript` endpoint
   - Handle failures gracefully: if context fetch fails, proceed without context (voice works standalone). If transcript inject fails, log error but don't crash.

2. Create `components/voice/last-discussed.tsx`:
   - Export `LastDiscussed` component that:
     - Fetches from `/api/voice/context` on mount
     - If `lastTopic` exists, displays: "Last discussed: [topic]" in a subtle Card with a chat bubble icon
     - If no previous conversation, shows nothing (returns null)
     - Styled with Tailwind: muted background, small text, subtle animation on appear
   - This component should be placed in the call-fred modal or voice call UI (reference `components/dashboard/call-fred-modal.tsx`)
   - Add the `<LastDiscussed />` component to `CallFredModal` before the "Start Call" button

3. Important: The voice agent runs as a separate worker process and may not have direct access to the app's modules. The API route approach (fetch from worker to app) is intentional -- it decouples the worker from the app's internal module system.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - Voice agent builds: `cd workers/voice-agent && npx tsc --noEmit`
    - LastDiscussed component renders correctly when topic exists
    - LastDiscussed returns null when no prior conversation
  </verify>
  <done>
    - Voice agent fetches chat context on session start and includes it in preamble
    - Voice agent posts transcript to chat history on session end
    - "Last discussed" topic shows before voice call starts
    - Failures in context loading don't break voice calls
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors in app
2. `cd workers/voice-agent && npx tsc --noEmit` -- no type errors in worker
3. Manual: have a text chat with FRED, then start a voice call -- verify voice agent references recent chat topics
4. Manual: end a voice call, then open text chat -- verify voice call summary appears in chat history
5. Manual: before starting a call, verify "Last discussed: [topic]" shows in the call modal
</verification>

<success_criteria>
- Voice agent preamble includes formatted chat context (last 10 messages)
- After voice call ends, summary appears in chat history
- LastDiscussed component shows topic before call
- Context failures degrade gracefully (voice still works without context)
- No latency impact on voice call start (context fetch < 2s)
</success_criteria>

<output>
After completion, create `.planning/phases/82-chat-voice-continuity/82-01-SUMMARY.md`
</output>
