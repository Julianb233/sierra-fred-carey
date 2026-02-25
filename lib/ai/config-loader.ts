import { sql } from "@/lib/db/supabase-sql";
import { logger } from "@/lib/logger";

export interface AIConfig {
  analyzer: string;
  model: string;
  temperature: number;
  maxTokens: number;
  dimensionWeights: Record<string, number> | null;
  scoreThresholds: Record<string, number> | null;
  customSettings: Record<string, unknown>;
}

export interface AIPrompt {
  id: string;
  name: string;
  version: number;
  content: string;
}

// In-memory cache with 5-minute TTL
const configCache = new Map<string, { config: AIConfig; expiry: number }>();
const promptCache = new Map<string, { prompt: AIPrompt; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get AI configuration for a specific analyzer with caching
 * @param analyzer - The analyzer name (e.g., 'reality_lens', 'investor_score')
 * @returns AI configuration or throws if not found
 */
export async function getAIConfig(analyzer: string): Promise<AIConfig> {
  // Check cache first
  const cached = configCache.get(analyzer);
  if (cached && cached.expiry > Date.now()) {
    logger.log(`[AI Config] Cache hit for ${analyzer}`);
    return cached.config;
  }

  logger.log(`[AI Config] Loading config for ${analyzer} from database`);

  try {
    const result = await sql`
      SELECT
        analyzer,
        model,
        temperature,
        max_tokens as "maxTokens",
        dimension_weights as "dimensionWeights",
        score_thresholds as "scoreThresholds",
        custom_settings as "customSettings"
      FROM ai_config
      WHERE analyzer = ${analyzer}
      LIMIT 1
    `;

    if (result.length === 0) {
      throw new Error(`No AI config found for analyzer: ${analyzer}`);
    }

    const config: AIConfig = result[0] as unknown as AIConfig;

    // Cache the config
    configCache.set(analyzer, {
      config,
      expiry: Date.now() + CACHE_TTL,
    });

    logger.log(`[AI Config] Loaded and cached config for ${analyzer}`);
    return config;
  } catch (error) {
    console.error(`[AI Config] Error loading config for ${analyzer}:`, error);
    throw error;
  }
}

/**
 * Get the active prompt by name
 * @param promptName - The prompt name (e.g., 'reality_lens_system')
 * @returns Active prompt or null if not found
 */
export async function getActivePrompt(
  promptName: string
): Promise<AIPrompt | null> {
  // Check cache first
  const cached = promptCache.get(promptName);
  if (cached && cached.expiry > Date.now()) {
    logger.log(`[AI Prompt] Cache hit for ${promptName}`);
    return cached.prompt;
  }

  logger.log(`[AI Prompt] Loading prompt ${promptName} from database`);

  try {
    const result = await sql`
      SELECT
        id,
        name,
        version,
        content
      FROM ai_prompts
      WHERE name = ${promptName}
        AND is_active = true
      ORDER BY version DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      logger.log(`[AI Prompt] No active prompt found for ${promptName}`);
      return null;
    }

    const prompt: AIPrompt = result[0] as unknown as AIPrompt;

    // Cache the prompt
    promptCache.set(promptName, {
      prompt,
      expiry: Date.now() + CACHE_TTL,
    });

    logger.log(
      `[AI Prompt] Loaded and cached prompt ${promptName} (v${prompt.version})`
    );
    return prompt;
  } catch (error) {
    console.error(`[AI Prompt] Error loading prompt ${promptName}:`, error);
    throw error;
  }
}

/**
 * Clear the configuration cache
 * Useful when configs are updated and need to be reloaded
 */
export function clearConfigCache(): void {
  logger.log("[AI Config] Clearing config cache");
  configCache.clear();
  promptCache.clear();
}

/**
 * Get multiple configs at once (batch operation)
 * @param analyzers - Array of analyzer names
 * @returns Map of analyzer name to config
 */
export async function getMultipleConfigs(
  analyzers: string[]
): Promise<Map<string, AIConfig>> {
  const configs = new Map<string, AIConfig>();
  const toLoad: string[] = [];

  // Check cache first
  for (const analyzer of analyzers) {
    const cached = configCache.get(analyzer);
    if (cached && cached.expiry > Date.now()) {
      configs.set(analyzer, cached.config);
    } else {
      toLoad.push(analyzer);
    }
  }

  // Load uncached configs
  if (toLoad.length > 0) {
    logger.log(`[AI Config] Batch loading configs for: ${toLoad.join(", ")}`);

    try {
      const result = await sql`
        SELECT
          analyzer,
          model,
          temperature,
          max_tokens as "maxTokens",
          dimension_weights as "dimensionWeights",
          score_thresholds as "scoreThresholds",
          custom_settings as "customSettings"
        FROM ai_config
        WHERE analyzer = ANY(${toLoad})
      `;

      for (const row of result) {
        const config = row as unknown as AIConfig;
        configs.set(config.analyzer, config);

        // Cache it
        configCache.set(config.analyzer, {
          config,
          expiry: Date.now() + CACHE_TTL,
        });
      }

      logger.log(`[AI Config] Loaded ${result.length} configs from database`);
    } catch (error) {
      console.error("[AI Config] Error batch loading configs:", error);
      throw error;
    }
  }

  return configs;
}

/**
 * Update AI config for an analyzer
 * @param analyzer - The analyzer name
 * @param updates - Partial config updates
 */
export async function updateAIConfig(
  analyzer: string,
  updates: Partial<
    Omit<AIConfig, "analyzer" | "dimensionWeights" | "scoreThresholds">
  > & {
    dimensionWeights?: Record<string, number>;
    scoreThresholds?: Record<string, number>;
  }
): Promise<AIConfig> {
  logger.log(`[AI Config] Updating config for ${analyzer}`, updates);

  try {
    const setters: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.model !== undefined) {
      setters.push(`model = $${paramIndex++}`);
      values.push(updates.model);
    }
    if (updates.temperature !== undefined) {
      setters.push(`temperature = $${paramIndex++}`);
      values.push(updates.temperature);
    }
    if (updates.maxTokens !== undefined) {
      setters.push(`max_tokens = $${paramIndex++}`);
      values.push(updates.maxTokens);
    }
    if (updates.dimensionWeights !== undefined) {
      setters.push(`dimension_weights = $${paramIndex++}`);
      values.push(JSON.stringify(updates.dimensionWeights));
    }
    if (updates.scoreThresholds !== undefined) {
      setters.push(`score_thresholds = $${paramIndex++}`);
      values.push(JSON.stringify(updates.scoreThresholds));
    }
    if (updates.customSettings !== undefined) {
      setters.push(`custom_settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.customSettings));
    }

    if (setters.length === 0) {
      throw new Error("No updates provided");
    }

    setters.push(`updated_at = NOW()`);
    values.push(analyzer);

    const query = `
      UPDATE ai_config
      SET ${setters.join(", ")}
      WHERE analyzer = $${paramIndex}
      RETURNING
        analyzer,
        model,
        temperature,
        max_tokens as "maxTokens",
        dimension_weights as "dimensionWeights",
        score_thresholds as "scoreThresholds",
        custom_settings as "customSettings"
    `;

    const result: Record<string, unknown>[] = await sql.execute(query, values);

    if (!result || result.length === 0) {
      throw new Error(`No config found for analyzer: ${analyzer}`);
    }

    const config = result[0] as unknown as AIConfig;

    // Update cache
    configCache.set(analyzer, {
      config,
      expiry: Date.now() + CACHE_TTL,
    });

    logger.log(`[AI Config] Updated config for ${analyzer}`);
    return config;
  } catch (error) {
    console.error(`[AI Config] Error updating config for ${analyzer}:`, error);
    throw error;
  }
}
