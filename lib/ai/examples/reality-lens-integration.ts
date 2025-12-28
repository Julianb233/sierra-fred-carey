/**
 * Example: Integrating Reality Lens with Unified Intelligence Architecture
 *
 * This shows how to migrate Reality Lens to use the new AI library
 * with configuration, logging, and insight extraction.
 */

import { generateTrackedResponse, extractAndSaveInsights } from "@/lib/ai";

interface RealityLensInput {
  userId: string;
  checkinId: string;
  checkinText: string;
}

interface RealityLensOutput {
  dimensions: {
    market_fit: { score: number; reasoning: string };
    traction: { score: number; reasoning: string };
    team: { score: number; reasoning: string };
    vision: { score: number; reasoning: string };
    execution: { score: number; reasoning: string };
  };
  overall_score: number;
  key_insights: string[];
}

/**
 * Analyze a check-in with Reality Lens
 * Uses database config, A/B testing, and auto-extracts insights
 */
export async function analyzeWithRealityLens(
  input: RealityLensInput
): Promise<{
  analysis: RealityLensOutput;
  requestId: string;
  insights: Array<any>;
}> {
  // Build the user prompt
  const userPrompt = `Analyze this startup check-in:

${input.checkinText}

Provide scores (1-10) and reasoning for each dimension.`;

  // Generate AI response with tracking
  // - Loads config from ai_config table (analyzer='reality_lens')
  // - Loads system prompt from ai_prompts table if available
  // - Checks for A/B test variant assignment
  // - Logs request and response to database
  const result = await generateTrackedResponse(
    [{ role: "user", content: userPrompt }],
    undefined, // System prompt loaded from database
    {
      userId: input.userId,
      analyzer: "reality_lens",
      sourceId: input.checkinId,
      inputData: {
        checkinText: input.checkinText,
        checkinId: input.checkinId,
      },
    }
  );

  console.log(`[Reality Lens] Analysis complete in ${result.latencyMs}ms`);
  if (result.variant) {
    console.log(`[Reality Lens] Using A/B variant: ${result.variant}`);
  }

  // Parse the AI response
  const analysis: RealityLensOutput = JSON.parse(result.content);

  // Extract and save insights automatically
  const insights = await extractAndSaveInsights(
    input.userId,
    "checkin",
    input.checkinId,
    result.content,
    "Reality Lens analysis of check-in"
  );

  console.log(`[Reality Lens] Extracted ${insights.length} insights`);

  return {
    analysis,
    requestId: result.requestId,
    insights,
  };
}

/**
 * Example: Migrating existing Reality Lens route
 */
export async function migrateRealityLensRoute() {
  // BEFORE: Direct AI call
  /*
  const response = await generateChatResponse(
    [{ role: "user", content: checkinText }],
    REALITY_LENS_PROMPT
  );
  const analysis = JSON.parse(response);

  // Save to database
  await sql`
    INSERT INTO reality_lens_analyses (checkin_id, analysis)
    VALUES (${checkinId}, ${JSON.stringify(analysis)})
  `;
  */

  // AFTER: Tracked with auto-insights
  const result = await analyzeWithRealityLens({
    userId: "user-123",
    checkinId: "checkin-456",
    checkinText: "We launched our MVP and got 100 signups in the first week!",
  });

  // Everything is automatically:
  // ✅ Logged (request + response)
  // ✅ Configured from database
  // ✅ A/B tested (if experiments exist)
  // ✅ Insight extraction
  // ✅ Performance tracked

  return result;
}

/**
 * Example: Creating a Reality Lens A/B test
 */
export async function setupRealityLensABTest() {
  const { createExperiment } = await import("@/lib/ai");

  // Test a more empathetic prompt version
  await createExperiment(
    "reality_lens_empathetic",
    "Testing more supportive and empathetic feedback style",
    [
      {
        variantName: "control",
        trafficPercentage: 50,
        // Uses default prompt
      },
      {
        variantName: "empathetic",
        trafficPercentage: 50,
        configOverrides: {
          temperature: 0.8, // Slightly more creative
        },
        // Would need to create a new prompt first and pass promptId
      },
    ],
    "admin-user-id"
  );

  console.log("A/B test created! 50% of users will see the empathetic variant");
}

/**
 * Example: Analyzing A/B test results
 */
export async function analyzeRealityLensExperiment() {
  const { getVariantStats } = await import("@/lib/ai");

  const stats = await getVariantStats("reality_lens_empathetic");

  for (const variant of stats) {
    console.log(`\nVariant: ${variant.variantName}`);
    console.log(`  Requests: ${variant.totalRequests}`);
    console.log(`  Avg Latency: ${variant.avgLatency}ms`);
    console.log(`  Error Rate: ${(variant.errorRate * 100).toFixed(2)}%`);
  }

  // You could also query ai_responses to compare quality
  // by looking at the parsed_response field or user feedback
}

/**
 * Example: Updating Reality Lens configuration
 */
export async function updateRealityLensConfig() {
  const { updateAIConfig } = await import("@/lib/ai");

  // Make Reality Lens more focused and cheaper
  await updateAIConfig("reality_lens", {
    model: "gpt-3.5-turbo", // Cheaper model
    temperature: 0.5, // More focused
    maxTokens: 1000, // Shorter responses
  });

  console.log("Reality Lens config updated - will use GPT-3.5 from now on");
  console.log("No code deployment needed!");
}
