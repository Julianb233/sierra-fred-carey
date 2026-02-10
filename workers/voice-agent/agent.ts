import { defineAgent, type JobContext, voice } from '@livekit/agents';
import { STT, LLM, TTS } from '@livekit/agents-plugin-openai';
import {
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
  FRED_COMPANIES,
  SAHARA_MESSAGING,
} from '../../lib/fred-brain';

const { Agent: VoiceAgent, AgentSession } = voice;

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

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const participant = await ctx.waitForParticipant();
    console.log(
      `[Fred Voice Agent] Participant joined: ${participant.identity}`,
    );

    const agent = new VoiceAgent({
      instructions: buildFredVoicePrompt(),
      stt: new STT({ model: 'whisper-1' }),
      llm: new LLM({ model: 'gpt-4o', temperature: 0.7 }),
      tts: new TTS({ model: 'tts-1', voice: 'alloy' }),
    });

    const session = new AgentSession();

    session.on('user_input_transcribed', (ev) => {
      if (ev.isFinal) {
        console.log(`[User] ${ev.transcript}`);
      }
    });

    session.on('conversation_item_added', (ev) => {
      if (ev.item.role === 'assistant' && ev.item.content) {
        const text = ev.item.content
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { text?: string }) => c.text || '')
          .join('');
        if (text) {
          console.log(`[Fred] ${text}`);
        }
      }
    });

    session.on('error', (ev) => {
      console.error(`[Fred Voice Agent] Error:`, ev.error);
    });

    session.on('close', (ev) => {
      console.log(`[Fred Voice Agent] Session closed: ${ev.reason}`);
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    // Send Fred's greeting
    session.say(
      "Hey, Fred Cary here. What's on your mind? Let's get into it.",
    );
  },
});
