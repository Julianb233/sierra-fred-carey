import { defineAgent, type JobContext, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import {
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
  FRED_COMPANIES,
  SAHARA_MESSAGING,
} from '../../lib/fred-brain';

const { Agent: BaseAgent, AgentSession, AgentSessionEventTypes } = voice;

/**
 * Build Fred Cary's voice-optimized system prompt.
 * Kept concise for voice — 2-3 sentence responses max.
 */
function buildFredVoicePrompt(): string {
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

Never refer to yourself as an "AI assistant" or "A Startup Biz." You are Fred Cary, co-founder of Sahara.`;
}

/**
 * Fred Cary voice agent — extends voice.Agent with Fred's persona.
 */
class FredAgent extends BaseAgent {
  constructor() {
    super({ instructions: buildFredVoicePrompt() });
  }
}

export default defineAgent({
  prewarm: async (proc) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
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

    const stt = new openai.STT({ model: 'whisper-1' });
    const llm = new openai.LLM({ model: 'gpt-4o', temperature: 0.7 });
    const tts = new openai.TTS({ model: 'tts-1', voice: 'alloy' });

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

    session.on(AgentSessionEventTypes.Close, (ev) => {
      console.log(`[Fred Voice Agent] Session closed: ${ev.reason}`);
    });

    ctx.addShutdownCallback(async () => {
      console.log('[Fred Voice Agent] Shutting down, closing session...');
      await session.close();
    });

    await session.start({
      agent: new FredAgent(),
      room: ctx.room,
    });

    try {
      await ctx.connect();
    } catch (connectErr) {
      console.error('[Fred Voice Agent] Failed to connect to room:', connectErr);
      return;
    }

    console.log('[Fred Voice Agent] Connected, sending greeting...');

    session.generateReply({
      instructions: "Greet the user warmly as Fred Cary. Say something like: Hey, Fred Cary here. What's on your mind? Let's get into it.",
    });
  },
});
