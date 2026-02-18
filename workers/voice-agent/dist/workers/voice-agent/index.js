import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Load .env.local before anything else
const envPath = resolve(fileURLToPath(import.meta.url), '../../../.env.local');
try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1)
            continue;
        const key = trimmed.slice(0, eqIdx);
        let value = trimmed.slice(eqIdx + 1);
        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
    console.log('[env] Loaded .env.local');
}
catch {
    console.warn('[env] No .env.local found, using existing env vars');
}
import { cli, ServerOptions } from '@livekit/agents';
/**
 * LiveKit Voice Agent Worker - Entry Point
 *
 * This worker connects to LiveKit Cloud and auto-joins rooms
 * when participants arrive. Run with: npm run worker:voice
 *
 * Environment variables required:
 *   LIVEKIT_URL - wss://your-project.livekit.cloud
 *   LIVEKIT_API_KEY - from LiveKit Cloud dashboard
 *   LIVEKIT_API_SECRET - from LiveKit Cloud dashboard
 *   OPENAI_API_KEY - for STT (Whisper), LLM (GPT-4o), TTS
 */
cli.runApp(new ServerOptions({
    agent: fileURLToPath(new URL('./agent.ts', import.meta.url)),
    agentName: 'fred-cary-voice',
}));
