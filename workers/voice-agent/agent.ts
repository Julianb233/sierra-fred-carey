import { defineAgent, type JobContext, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import {
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
  FRED_COMPANIES,
  SAHARA_MESSAGING,
} from '../../lib/fred-brain';

const { Agent: BaseAgent, AgentSession, AgentSessionEventTypes } = voice;

// ============================================================================
// App URL for API calls (voice worker -> Next.js app)
// ============================================================================

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.LIVEKIT_APP_URL ||
  'http://localhost:3000';

// ============================================================================
// Chat Context Fetching (Phase 82)
// ============================================================================

interface VoiceContextResponse {
  preamble: string;
  lastTopic: string | null;
}

/**
 * Fetch recent chat context from the app's API.
 * Returns the formatted preamble string to inject into the voice prompt.
 * Fails gracefully -- voice works without context.
 */
async function fetchChatContext(userId: string): Promise<VoiceContextResponse | null> {
  try {
    const url = `${APP_BASE_URL}/api/voice/context`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const response = await fetch(url, {
      headers: {
        // Pass user ID as a service-level header for the worker
        'x-voice-agent-user-id': userId,
        'x-voice-agent-secret': process.env.VOICE_AGENT_SECRET || '',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Fred Voice Agent] Context fetch returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      preamble: (data.preamble as string) || '',
      lastTopic: (data.lastTopic as string) || null,
    };
  } catch (error) {
    console.warn('[Fred Voice Agent] Failed to fetch chat context (non-blocking):', error);
    return null;
  }
}

/**
 * Post transcript to the app's API for injection into chat history.
 * Fails gracefully -- call summary still works even if injection fails.
 */
async function postTranscript(
  userId: string,
  transcript: { speaker: string; text: string; timestamp: string }[]
): Promise<void> {
  if (transcript.length === 0) return;

  try {
    const url = `${APP_BASE_URL}/api/voice/transcript`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-voice-agent-user-id': userId,
        'x-voice-agent-secret': process.env.VOICE_AGENT_SECRET || '',
      },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Fred Voice Agent] Transcript post returned ${response.status}`);
    } else {
      const data = (await response.json()) as Record<string, unknown>;
      console.log('[Fred Voice Agent] Transcript injected, summary:', ((data.summary as string) || '').slice(0, 100));
    }
  } catch (error) {
    console.warn('[Fred Voice Agent] Failed to post transcript (non-blocking):', error);
  }
}

// ============================================================================
// Voice Prompt Builder
// ============================================================================

/**
 * Build Fred Cary's voice-optimized system prompt.
 * Kept concise for voice -- 2-3 sentence responses max.
 * Optionally includes recent chat context for continuity.
 */
function buildFredVoicePrompt(chatContext?: string): string {
  let prompt = `You are Fred Cary, serial entrepreneur, CEO, attorney, and business coach with over ${FRED_BIO.yearsExperience} years of experience.

Your role on this call:
- Help founders with questions about Sahara and entrepreneurship
- Provide direct, actionable guidance based on your experience
- Be conversational but purposeful -- this is a voice call, not an essay

About you:
- Founded ${FRED_BIO.companiesFounded}+ companies, taken ${FRED_BIO.ipos} public, had ${FRED_BIO.acquisitions} acquired
- Created technology used in ${FRED_COMPANIES.summaryStats.tvHouseholdsReach} of the world's TV households
- Coached 10,000+ founders through IdeaPros and now Sahara
- Your motto: ${FRED_COMMUNICATION_STYLE.voice.primary}

About Sahara (your current venture):
${SAHARA_MESSAGING.differentiators.map(d => '- ' + d).join('\n')}
- Three tiers: Free (FRED chat), Pro (Reality Lens, frameworks), Studio (virtual agent team)

Voice style:
- ${FRED_COMMUNICATION_STYLE.voice.primary}, but warm
- Use personal stories when relevant
- Emphasize action over theory
- Never sugarcoat -- founders need the truth
- Keep responses concise for voice -- 2-3 sentences max per turn
- Use natural speech patterns, contractions, and conversational language

Never refer to yourself as an "AI assistant" or "A Startup Biz." You are Fred Cary, co-founder of Sahara.`;

  // Append chat context if available (Phase 82)
  if (chatContext && chatContext.length > 0) {
    prompt += `\n\n---\n${chatContext}`;
  }

  return prompt;
}

// ============================================================================
// Voice Agent
// ============================================================================

/**
 * Fred Cary voice agent -- extends voice.Agent with Fred's persona.
 * Accepts optional chat context for text/voice continuity.
 */
class FredAgent extends BaseAgent {
  constructor(chatContext?: string) {
    super({ instructions: buildFredVoicePrompt(chatContext) });
  }
}

/**
 * Extract user ID from LiveKit room metadata or participant identity.
 */
function extractUserId(ctx: JobContext): string | null {
  try {
    // Try room metadata first (set by the call API)
    const metadata = ctx.room.metadata;
    if (metadata) {
      const parsed = JSON.parse(metadata);
      if (parsed.userId) return parsed.userId;
    }
  } catch {
    // Metadata not JSON or missing userId
  }

  // Fall back to first remote participant identity
  for (const [, participant] of ctx.room.remoteParticipants) {
    if (participant.identity) return participant.identity;
  }

  return null;
}

export default defineAgent({
  prewarm: async (proc) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const encoder = new TextEncoder();
    const transcriptLog: { speaker: string; text: string; timestamp: string }[] = [];

    function publishTranscript(speaker: 'user' | 'fred', text: string) {
      const timestamp = new Date().toISOString();
      const data = encoder.encode(
        JSON.stringify({
          speaker,
          text,
          timestamp,
        }),
      );
      ctx.room.localParticipant?.publishData(data, {
        reliable: true,
        topic: 'transcript',
      });
      // Collect transcript for post-call injection (Phase 82)
      transcriptLog.push({ speaker, text, timestamp });
    }

    // Phase 82: Load chat context for voice preamble
    // Priority: dispatch metadata (set by call API) > API fetch fallback
    const userId = extractUserId(ctx);
    let chatContextPreamble: string | undefined;
    let hasChatContext = false;

    // Try dispatch metadata first (chatContext was injected by call API)
    try {
      const metadata = ctx.room.metadata;
      if (metadata) {
        const parsed = JSON.parse(metadata);
        if (parsed.chatContext && parsed.chatContext.length > 0) {
          chatContextPreamble = parsed.chatContext;
          hasChatContext = true;
          console.log(`[Fred Voice Agent] Chat context loaded from dispatch metadata (${chatContextPreamble!.length} chars)`);
        }
      }
    } catch {
      // Metadata not available or not JSON
    }

    // Fallback: fetch context from API if not in metadata
    if (!hasChatContext && userId) {
      console.log(`[Fred Voice Agent] Fetching chat context via API for user: ${userId}`);
      const context = await fetchChatContext(userId);
      if (context?.preamble) {
        chatContextPreamble = context.preamble;
        hasChatContext = true;
        console.log(`[Fred Voice Agent] Chat context loaded via API, last topic: ${context.lastTopic || 'none'}`);
      } else {
        console.log('[Fred Voice Agent] No chat context available (new user or no prior chats)');
      }
    } else if (!userId) {
      console.log('[Fred Voice Agent] No user ID available, skipping context fetch');
    }

    const stt = new openai.STT({ model: 'whisper-1' });
    const llm = new openai.LLM({ model: 'gpt-4o', temperature: 0.7 });
    const tts = new elevenlabs.TTS({ voiceId: 'fpxks3eObfRI1jkeCD2k' });

    const session = new AgentSession({
      vad: ctx.proc.userData.vad as silero.VAD,
      stt,
      llm,
      tts,
    });

    session.on(AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (ev.isFinal) {
        console.log(`[User] ${ev.transcript}`);
        publishTranscript('user', ev.transcript);
      }
    });

    session.on(AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      if (ev.item.role === 'assistant') {
        const text = ev.item.textContent;
        if (text) {
          console.log(`[Fred] ${text}`);
          publishTranscript('fred', text);
        }
      }
    });

    session.on(AgentSessionEventTypes.Error, (ev) => {
      console.error(`[Fred Voice Agent] Error:`, ev.error);
    });

    // Phase 82: Post transcript to chat history on session close
    session.on(AgentSessionEventTypes.Close, async (ev) => {
      console.log(`[Fred Voice Agent] Session closed: ${ev.reason}`);

      if (userId && transcriptLog.length > 0) {
        console.log(`[Fred Voice Agent] Injecting ${transcriptLog.length} transcript entries into chat history`);
        await postTranscript(userId, transcriptLog);
      }
    });

    ctx.addShutdownCallback(async () => {
      console.log('[Fred Voice Agent] Shutting down, closing session...');
      await session.close();
    });

    await session.start({
      agent: new FredAgent(chatContextPreamble),
      room: ctx.room,
    });

    try {
      await ctx.connect();
    } catch (connectErr) {
      console.error('[Fred Voice Agent] Failed to connect to room:', connectErr);
      return;
    }

    console.log('[Fred Voice Agent] Connected, sending greeting...');

    const greetingInstructions = hasChatContext
      ? "Greet the user warmly as Fred Cary. Reference that you were just chatting and pick up the conversation naturally. Say something like: Hey, I see we were just talking about some things in chat. Let's keep going -- what else is on your mind?"
      : "Greet the user warmly as Fred Cary. Say something like: Hey, Fred Cary here. What's on your mind? Let's get into it.";

    session.generateReply({
      instructions: greetingInstructions,
    });
  },
});
