/**
 * Voice AI Agent Service
 *
 * Manages AI voice agents that join LiveKit rooms to provide
 * automated support conversations.
 */
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
    business_hours: Record<string, {
        enabled: boolean;
        start: string;
        end: string;
    }>;
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
/**
 * Generate token for AI agent to join room
 */
export declare function generateAgentToken(config: AgentConfig): Promise<string | null>;
/**
 * Spawn an AI agent for a room
 */
export declare function spawnAgent(config: AgentConfig): Promise<AgentSession | null>;
/**
 * Get agent session for a room
 */
export declare function getAgentSession(roomName: string): AgentSession | null;
/**
 * Update agent session status
 */
export declare function updateAgentStatus(roomName: string, status: 'pending' | 'active' | 'disconnected'): void;
/**
 * Remove agent from room
 */
export declare function removeAgent(roomName: string): Promise<boolean>;
/**
 * List all active agent sessions
 */
export declare function listActiveSessions(): AgentSession[];
/**
 * Fetch voice agent configuration from database
 */
export declare function fetchAgentConfig(): Promise<VoiceAgentDbConfig | null>;
/**
 * Fetch knowledge base entries from database
 */
export declare function fetchKnowledgeBase(configId?: string): Promise<KnowledgeBaseEntry[]>;
/**
 * Fetch escalation rules from database
 */
export declare function fetchEscalationRules(configId?: string): Promise<EscalationRule[]>;
/**
 * Check if currently within business hours
 */
export declare function isWithinBusinessHours(config: VoiceAgentDbConfig): boolean;
/**
 * Build system prompt with knowledge base context
 */
export declare function buildEnhancedSystemPrompt(): Promise<string>;
/**
 * Clear cached configuration (call after admin updates)
 */
export declare function clearConfigCache(): void;
/**
 * Custom system prompt builder (extends Fred Cary persona with additional context)
 */
export declare function buildSystemPrompt(options: {
    companyName?: string;
    services?: string[];
    additionalContext?: string;
}): string;
/**
 * Check if an agent is available for a room
 */
export declare function isAgentAvailable(roomName: string): boolean;
/**
 * Get agent connection details for workers
 */
export declare function getAgentConnectionDetails(roomName: string): {
    serverUrl: string;
    token: string;
} | null;
export {};
