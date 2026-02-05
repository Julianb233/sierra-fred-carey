/**
 * Seed A/B Testing Data
 *
 * This script seeds sample A/B testing data for the monitoring dashboard.
 * Prerequisites: The ab_experiments, ab_variants, and ai_insights tables must exist.
 *
 * To create the tables first, run the migration SQL in Supabase SQL Editor:
 * lib/db/migrations/007_unified_intelligence_supabase.sql
 *
 * Usage:
 *   npx tsx scripts/seed-ab-testing.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedData() {
  console.log("🌱 Seeding A/B Testing data...\n");

  // 1. Create sample experiments
  console.log("Creating experiments...");
  const experiments = [
    {
      name: "chat_prompt_v2",
      description: "Testing new FRED prompt with enhanced empathy",
      is_active: true,
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: "reality_lens_scoring",
      description: "Testing adjusted scoring weights for feasibility",
      is_active: true,
      start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: "investor_score_format",
      description: "Testing new format for investor score presentation",
      is_active: false,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const { data: insertedExperiments, error: expError } = await supabase
    .from("ab_experiments")
    .upsert(experiments, { onConflict: "name" })
    .select();

  if (expError) {
    console.error("  ❌ Failed to create experiments:", expError.message);
    if (expError.message.includes("does not exist") || expError.message.includes("schema cache")) {
      console.error("\n" + "=".repeat(60));
      console.error("⚠️  MISSING DATABASE TABLES");
      console.error("=".repeat(60));
      console.error("\nThe required A/B testing tables don't exist in the database.");
      console.error("\nTo create them:");
      console.error("  1. Go to: https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new");
      console.error("  2. Copy the contents of: lib/db/migrations/007_unified_intelligence_supabase.sql");
      console.error("  3. Paste and execute in the SQL Editor");
      console.error("  4. Run this script again: npx tsx scripts/seed-ab-testing.ts");
      console.error("\n" + "=".repeat(60) + "\n");
      process.exit(0); // Exit cleanly, not an error
    }
    throw expError;
  }
  console.log(`  ✓ Created ${insertedExperiments?.length || 0} experiments`);

  // 2. Create variants for each experiment
  console.log("\nCreating variants...");
  const variantsToCreate = [];

  for (const exp of insertedExperiments || []) {
    // Control variant
    variantsToCreate.push({
      experiment_id: exp.id,
      variant_name: "control",
      traffic_percentage: 50,
      config_overrides: {},
    });

    // Treatment variant
    variantsToCreate.push({
      experiment_id: exp.id,
      variant_name: "treatment",
      traffic_percentage: 50,
      config_overrides: exp.name === "chat_prompt_v2"
        ? { empathy_boost: 1.2, response_length: "medium" }
        : { weight_adjustment: 0.1 },
    });
  }

  const { data: insertedVariants, error: varError } = await supabase
    .from("ab_variants")
    .upsert(variantsToCreate, { onConflict: "experiment_id,variant_name" })
    .select();

  if (varError) {
    console.error("  ❌ Failed to create variants:", varError.message);
    throw varError;
  }
  console.log(`  ✓ Created ${insertedVariants?.length || 0} variants`);

  // 3. Create sample AI requests linked to variants
  console.log("\nCreating sample AI requests...");

  const sampleUserId = "00000000-0000-0000-0000-000000000001"; // Placeholder user
  const requestsToCreate = [];

  for (const variant of insertedVariants || []) {
    // Create 10-50 requests per variant
    const requestCount = Math.floor(Math.random() * 40) + 10;

    for (let i = 0; i < requestCount; i++) {
      const createdAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      requestsToCreate.push({
        user_id: sampleUserId,
        analyzer: "chat",
        input_data: { message: `Sample message ${i}`, context: "seed data" },
        user_prompt: `Sample prompt for ${variant.variant_name}`,
        variant_id: variant.id,
        model: "gpt-4-turbo-preview",
        temperature: 0.7,
        max_tokens: 1000,
        created_at: createdAt,
      });
    }
  }

  // Insert in batches of 100
  for (let i = 0; i < requestsToCreate.length; i += 100) {
    const batch = requestsToCreate.slice(i, i + 100);
    const { error: reqError } = await supabase
      .from("ai_requests")
      .insert(batch);

    if (reqError) {
      console.error(`  ⚠️ Batch ${Math.floor(i/100) + 1} failed:`, reqError.message);
    }
  }
  console.log(`  ✓ Created ${requestsToCreate.length} AI requests`);

  // 4. Create sample responses
  console.log("\nCreating sample AI responses...");

  const { data: recentRequests } = await supabase
    .from("ai_requests")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const responsesToCreate = [];

  for (const req of recentRequests || []) {
    const hasError = Math.random() < 0.03; // 3% error rate
    const latency = hasError ? 0 : Math.floor(Math.random() * 2000) + 200;

    responsesToCreate.push({
      request_id: req.id,
      response_text: hasError
        ? ""
        : "This is a sample response from FRED. Your startup idea shows promise...",
      parsed_response: hasError ? null : { score: Math.floor(Math.random() * 40) + 60 },
      tokens_used: hasError ? 0 : Math.floor(Math.random() * 800) + 200,
      latency_ms: latency,
      provider: "openai",
      error: hasError ? "Rate limit exceeded" : null,
      created_at: req.created_at,
    });
  }

  // Insert in batches
  for (let i = 0; i < responsesToCreate.length; i += 100) {
    const batch = responsesToCreate.slice(i, i + 100);
    const { error: respError } = await supabase
      .from("ai_responses")
      .insert(batch);

    if (respError) {
      console.error(`  ⚠️ Response batch ${Math.floor(i/100) + 1} failed:`, respError.message);
    }
  }
  console.log(`  ✓ Created ${responsesToCreate.length} AI responses`);

  // 5. Create sample insights
  console.log("\nCreating sample insights...");

  const insights = [
    {
      user_id: sampleUserId,
      source_type: "checkin",
      source_id: "00000000-0000-0000-0000-000000000001",
      insight_type: "breakthrough",
      title: "Product-Market Fit Signal",
      content: "Your recent pivot to B2B shows strong early traction. Consider doubling down on enterprise features.",
      importance: 8,
      tags: ["product", "strategy", "growth"],
    },
    {
      user_id: sampleUserId,
      source_type: "pitch_deck",
      source_id: "00000000-0000-0000-0000-000000000002",
      insight_type: "warning",
      title: "Competitive Landscape Gap",
      content: "Your competitive analysis is missing two major players that investors will likely ask about.",
      importance: 7,
      tags: ["pitch", "competition", "fundraising"],
    },
    {
      user_id: sampleUserId,
      source_type: "chat",
      source_id: "00000000-0000-0000-0000-000000000003",
      insight_type: "opportunity",
      title: "Partnership Opportunity",
      content: "Based on your market position, a strategic partnership with a complementary SaaS could accelerate growth.",
      importance: 6,
      tags: ["partnerships", "growth", "strategy"],
    },
  ];

  const { error: insightError } = await supabase
    .from("ai_insights")
    .insert(insights);

  if (insightError) {
    console.error("  ❌ Failed to create insights:", insightError.message);
    if (insightError.message.includes("does not exist")) {
      console.log("  ⚠️ Table 'ai_insights' does not exist, skipping...");
    }
  } else {
    console.log(`  ✓ Created ${insights.length} insights`);
  }

  console.log("\n✅ Seed data created successfully!");
  console.log("\nYou can now:");
  console.log("  1. Start the dev server: npm run dev");
  console.log("  2. Visit the monitoring dashboard: http://localhost:3000/dashboard/monitoring");
}

seedData().catch((err) => {
  console.error("\n❌ Seeding failed:", err.message);
  process.exit(1);
});
