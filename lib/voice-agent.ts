import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { neon } from '@neondatabase/serverless';

/**
 * Voice AI Agent Service
 *
 * Manages AI voice agents that join LiveKit rooms to provide
 * automated support conversations.
 */

// Database connection
const getDb = () => neon(process.env.DATABASE_URL!);

interface AgentConfig {
  roomName: string;
  agentName?: string;
  systemPrompt?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

interface VoiceAgentDbConfig {
  id: string;
  name: string;
  system_prompt: string;
  greeting_message: string;
  voice: string;
  max_response_length: number;
  response_style: string;
  language: string;
  business_hours: Record<string, { enabled: boolean; start: string; end: string }>;
  timezone: string;
  after_hours_behavior: string;
  after_hours_message: string;
  fallback_message: string;
}

interface KnowledgeBaseEntry {
  question?: string;
  answer?: string;
  product_name?: string;
  product_description?: string;
  product_price?: number;
  document_title?: string;
  document_content?: string;
}

interface EscalationRule {
  name: string;
  trigger_type: string;
  trigger_keywords?: string[];
  sentiment_threshold?: number;
  time_limit_seconds?: number;
  action: string;
  action_message: string;
}

interface AgentSession {
  roomName: string;
  agentIdentity: string;
  token: string;
  createdAt: Date;
  status: 'pending' | 'active' | 'disconnected';
  metadata?: {
    systemPrompt: string;
    voice: string;
  };
}

// Store active agent sessions (in production, use Redis/database)
const activeSessions = new Map<string, AgentSession>();

// LiveKit configuration
const livekitHost = process.env.LIVEKIT_HOST || '';
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

/**
 * Generate token for AI agent to join room
 */
export async function generateAgentToken(config: AgentConfig): Promise<string | null> {
  if (!apiKey || !apiSecret) {
    console.error('LiveKit not configured for agent');
    return null;
  }

  const agentIdentity = config.agentName || `ai-agent-${Date.now()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: agentIdentity,
    name: 'AI Support Assistant',
    ttl: 7200, // 2 hours for agent sessions
    metadata: JSON.stringify({
      type: 'ai_agent',
      voice: config.voice || 'alloy',
      systemPrompt: config.systemPrompt || getDefaultSystemPrompt(),
    }),
  });

  at.addGrant({
    room: config.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: false,
  });

  return await at.toJwt();
}

/**
 * Spawn an AI agent for a room
 */
export async function spawnAgent(config: AgentConfig): Promise<AgentSession | null> {
  try {
    const token = await generateAgentToken(config);
    if (!token) {
      return null;
    }

    const agentIdentity = config.agentName || `ai-agent-${Date.now()}`;

    const session: AgentSession = {
      roomName: config.roomName,
      agentIdentity,
      token,
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        systemPrompt: config.systemPrompt || getDefaultSystemPrompt(),
        voice: config.voice || 'alloy',
      },
    };

    activeSessions.set(config.roomName, session);

    // In production, this would trigger a separate agent worker process
    // For now, we return the token that can be used by a frontend/worker
    console.log(`[VoiceAgent] Agent spawned for room: ${config.roomName}`);

    return session;
  } catch (error) {
    console.error('[VoiceAgent] Failed to spawn agent:', error);
    return null;
  }
}

/**
 * Get agent session for a room
 */
export function getAgentSession(roomName: string): AgentSession | null {
  return activeSessions.get(roomName) || null;
}

/**
 * Update agent session status
 */
export function updateAgentStatus(
  roomName: string,
  status: 'pending' | 'active' | 'disconnected'
): void {
  const session = activeSessions.get(roomName);
  if (session) {
    session.status = status;
    if (status === 'disconnected') {
      // Clean up after a delay
      setTimeout(() => {
        activeSessions.delete(roomName);
      }, 60000); // Keep for 1 minute for potential reconnection
    }
  }
}

/**
 * Remove agent from room
 */
export async function removeAgent(roomName: string): Promise<boolean> {
  try {
    const session = activeSessions.get(roomName);
    if (!session) {
      return false;
    }

    // Use RoomServiceClient to remove participant
    if (apiKey && apiSecret && livekitHost) {
      const client = new RoomServiceClient(
        livekitHost.replace('wss://', 'https://'),
        apiKey,
        apiSecret
      );

      await client.removeParticipant(roomName, session.agentIdentity);
    }

    activeSessions.delete(roomName);
    console.log(`[VoiceAgent] Agent removed from room: ${roomName}`);

    return true;
  } catch (error) {
    console.error('[VoiceAgent] Failed to remove agent:', error);
    return false;
  }
}

/**
 * List all active agent sessions
 */
export function listActiveSessions(): AgentSession[] {
  return Array.from(activeSessions.values());
}

// Cache for database config (refreshes every 5 minutes)
let cachedConfig: VoiceAgentDbConfig | null = null;
let cachedKnowledge: KnowledgeBaseEntry[] = [];
let cachedEscalationRules: EscalationRule[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch voice agent configuration from database
 */
export async function fetchAgentConfig(): Promise<VoiceAgentDbConfig | null> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const sql = getDb();
    const results = await sql`
      SELECT * FROM voice_agent_config
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (results.length > 0) {
      cachedConfig = results[0] as unknown as VoiceAgentDbConfig;
      cacheTimestamp = now;
      return cachedConfig;
    }
  } catch (error) {
    console.error('[VoiceAgent] Failed to fetch config from database:', error);
  }

  return null;
}

/**
 * Fetch knowledge base entries from database
 */
export async function fetchKnowledgeBase(configId?: string): Promise<KnowledgeBaseEntry[]> {
  const now = Date.now();
  if (cachedKnowledge.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedKnowledge;
  }

  try {
    const sql = getDb();
    let results;

    if (configId) {
      results = await sql`
        SELECT question, answer, product_name, product_description, product_price,
               document_title, document_content
        FROM knowledge_base
        WHERE config_id = ${configId} AND is_active = true
        ORDER BY priority DESC
      `;
    } else {
      results = await sql`
        SELECT kb.question, kb.answer, kb.product_name, kb.product_description, kb.product_price,
               kb.document_title, kb.document_content
        FROM knowledge_base kb
        JOIN voice_agent_config vac ON kb.config_id = vac.id
        WHERE vac.is_active = true AND kb.is_active = true
        ORDER BY kb.priority DESC
      `;
    }

    cachedKnowledge = results as unknown as KnowledgeBaseEntry[];
    return cachedKnowledge;
  } catch (error) {
    console.error('[VoiceAgent] Failed to fetch knowledge base:', error);
    return [];
  }
}

/**
 * Fetch escalation rules from database
 */
export async function fetchEscalationRules(configId?: string): Promise<EscalationRule[]> {
  const now = Date.now();
  if (cachedEscalationRules.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedEscalationRules;
  }

  try {
    const sql = getDb();
    let results;

    if (configId) {
      results = await sql`
        SELECT name, trigger_type, trigger_keywords, sentiment_threshold,
               time_limit_seconds, action, action_message
        FROM escalation_rules
        WHERE config_id = ${configId} AND is_active = true
        ORDER BY priority DESC
      `;
    } else {
      results = await sql`
        SELECT er.name, er.trigger_type, er.trigger_keywords, er.sentiment_threshold,
               er.time_limit_seconds, er.action, er.action_message
        FROM escalation_rules er
        JOIN voice_agent_config vac ON er.config_id = vac.id
        WHERE vac.is_active = true AND er.is_active = true
        ORDER BY er.priority DESC
      `;
    }

    cachedEscalationRules = results as unknown as EscalationRule[];
    return cachedEscalationRules;
  } catch (error) {
    console.error('[VoiceAgent] Failed to fetch escalation rules:', error);
    return [];
  }
}

/**
 * Check if currently within business hours
 */
export function isWithinBusinessHours(config: VoiceAgentDbConfig): boolean {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[now.getDay()];

  const dayConfig = config.business_hours?.[dayName];
  if (!dayConfig?.enabled) {
    return false;
  }

  // Convert current time to timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone || 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeStr = formatter.format(now);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = dayConfig.start.split(':').map(Number);
  const [endH, endM] = dayConfig.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Build system prompt with knowledge base context
 */
export async function buildEnhancedSystemPrompt(): Promise<string> {
  const config = await fetchAgentConfig();
  const knowledge = await fetchKnowledgeBase(config?.id);

  let prompt = config?.system_prompt || getDefaultSystemPrompt();

  // Add knowledge base context
  if (knowledge.length > 0) {
    prompt += '\n\n--- KNOWLEDGE BASE ---\n';

    const faqs = knowledge.filter(k => k.question && k.answer);
    if (faqs.length > 0) {
      prompt += '\nFrequently Asked Questions:\n';
      faqs.forEach(faq => {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }

    const products = knowledge.filter(k => k.product_name);
    if (products.length > 0) {
      prompt += '\nProducts & Services:\n';
      products.forEach(p => {
        prompt += `- ${p.product_name}: ${p.product_description}`;
        if (p.product_price) prompt += ` ($${p.product_price})`;
        prompt += '\n';
      });
    }
  }

  return prompt;
}

/**
 * Clear cached configuration (call after admin updates)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cachedKnowledge = [];
  cachedEscalationRules = [];
  cacheTimestamp = 0;
}

/**
 * Default system prompt for the AI support agent (fallback)
 */
function getDefaultSystemPrompt(): string {
  return `You are a helpful AI support assistant for A Startup Biz, a business consulting and services company.

Your role:
- Help users with questions about our services (business consulting, web development, marketing)
- Assist with scheduling consultations and appointments
- Answer general business inquiries
- Provide information about our partner program
- Help troubleshoot common issues

Guidelines:
- Be friendly, professional, and concise
- If you don't know something, offer to connect them with a human agent
- Keep responses focused and avoid unnecessary filler
- Acknowledge the user's needs before providing information
- For complex issues, recommend scheduling a consultation

Services we offer:
1. Business Strategy Consulting - $750/hour
2. Web Development - $1,500-$7,500 per project
3. Marketing Services - $1,500/month retainer
4. SEO Optimization - Starting at $500/month

For emergencies or urgent matters, recommend calling our main line or emailing support@astartupbiz.com.`;
}

/**
 * Custom system prompt builder
 */
export function buildSystemPrompt(options: {
  companyName?: string;
  services?: string[];
  additionalContext?: string;
}): string {
  const base = getDefaultSystemPrompt();

  if (options.additionalContext) {
    return `${base}\n\nAdditional Context:\n${options.additionalContext}`;
  }

  return base;
}

/**
 * Check if an agent is available for a room
 */
export function isAgentAvailable(roomName: string): boolean {
  const session = activeSessions.get(roomName);
  return session?.status === 'active';
}

/**
 * Get agent connection details for workers
 */
export function getAgentConnectionDetails(roomName: string): {
  serverUrl: string;
  token: string;
} | null {
  const session = activeSessions.get(roomName);
  if (!session) {
    return null;
  }

  return {
    serverUrl: livekitHost,
    token: session.token,
  };
}
