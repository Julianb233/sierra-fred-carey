import { defineAgent, type JobContext, voice } from '@livekit/agents';
import { STT, LLM, TTS } from '@livekit/agents-plugin-openai';
import {
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
  FRED_COMPANIES,
  SAHARA_MESSAGING,
} from '../../lib/fred-brain';
import { buildFounderContextWithFacts } from '../../lib/fred/context-builder';
import { getConversationContext } from '../../lib/channels/conversation-context';

const { Agent: VoiceAgent, AgentSession, AgentSessionEventTypes } = voice;

/**
 * Build Fred Cary's voice-optimized system prompt.
 * Kept concise for voice — 2-3 sentence responses max.
 */
function buildFredVoicePrompt(extraContext?: { founderContext?: string; recentConversation?: string }): string {
  const founderContext = extraContext?.founderContext?.trim();
  const conversationContext = extraContext?.recentConversation?.trim();

  return `You are Fred Cary, serial entrepreneur, CEO, attorney, and business coach with over ${FRED_BIO.yearsExperience} years of experience.

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

Never refer to yourself as an "AI assistant" or "A Startup Biz." You are Fred Cary, co-founder of Sahara.

Founder context (confidential, do not read verbatim):
${founderContext || 'Not provided. Ask a quick question to learn context.'}

Recent conversations across chat/voice/sms (use to avoid repetition):
${conversationContext || 'No recent history available.'}`;
}

function truncate(str: string, max = 1200) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

async function loadVoiceContext(userId: string) {
  try {
    const [founder, conversation] = await Promise.all([
      buildFounderContextWithFacts(userId, true).catch(() => ({ context: '' })),
      getConversationContext(userId, 12).catch(() => null),
    ]);

    // Format conversation snippets (most recent first)
    const recentConversation = conversation?.recentEntries
      ?.slice(0, 8)
      .map((entry) => {
        const prefix = `[${entry.channel}] ${entry.role === 'assistant' ? 'Fred' : 'Founder'}`;
        const text = typeof entry.content === 'string' ? entry.content : '';
        return `${prefix}: ${text}`;
      })
      .join('\n');

    return {
      founderContext: truncate(founder?.context || ''),
      recentConversation: truncate(recentConversation || ''),
    };
  } catch (err) {
    console.warn('[Fred Voice Agent] Failed to load voice context:', err);
    return { founderContext: '', recentConversation: '' };
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    try {
      await ctx.connect();
    } catch (err) {
      console.error('[Fred Voice Agent] Failed to connect:', err);
      return;
    }

    let participant;
    try {
      participant = await ctx.waitForParticipant();
    } catch (err) {
      console.error('[Fred Voice Agent] Participant wait failed:', err);
      return;
    }

    console.log(
      `[Fred Voice Agent] Participant joined: ${participant.identity}`,
    );

    const encoder = new TextEncoder();

    function publishTranscript(speaker: 'user' | 'fred', text: string) {
      const data = encoder.encode(
        JSON.stringify({
          speaker,
          text,
          timestamp: new Date().toISOString(),
        }),
      );
      ctx.room.localParticipant?.publishData(data, {
        reliable: true,
        topic: 'transcript',
      });
    }

    const context = await loadVoiceContext(participant.identity);

    const stt = new STT({ model: 'whisper-1' });
    const llm = new LLM({ model: 'gpt-4o', temperature: 0.7 });
    const tts = new TTS({ model: 'tts-1', voice: 'alloy' });

    const agent = new VoiceAgent({
      instructions: buildFredVoicePrompt(context),
      stt,
      llm,
      tts,
    });

    const session = new AgentSession();

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

    session.on(AgentSessionEventTypes.Close, (ev) => {
      console.log(`[Fred Voice Agent] Session closed: ${ev.reason}`);
    });

    // P1 Fix: Register shutdown callback to close session cleanly
    ctx.addShutdownCallback(async () => {
      console.log('[Fred Voice Agent] Shutting down, closing session...');
      await session.close();
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    // P1 Fix: Small delay to let audio output track initialize before greeting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send Fred's greeting
    session.say(
      "Hey, Fred Cary here. What's on your mind? Let's get into it.",
    );
  },
});
