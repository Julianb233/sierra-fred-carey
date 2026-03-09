-- Journey Steps: IdeaPros 120-step template mapped to Sahara Oases stages
-- Linear: AI-1802
-- Each row is a discrete step in the founder journey with completion criteria.

-- ============================================================================
-- Table: journey_steps (reference/template table, not user-scoped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journey_steps (
  id SERIAL PRIMARY KEY,
  step_id TEXT NOT NULL UNIQUE,
  stage TEXT NOT NULL CHECK (stage IN ('clarity', 'validation', 'build', 'launch', 'grow')),
  group_key TEXT NOT NULL,
  group_label TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  completion_type TEXT NOT NULL CHECK (completion_type IN (
    'profile_field', 'reality_lens_done', 'chat_sessions',
    'document_created', 'pitch_deck_uploaded', 'investor_readiness_scored',
    'metric_threshold', 'boardy_ready', 'manual'
  )),
  completion_field TEXT,
  completion_threshold NUMERIC,
  nine_step_mapping INTEGER CHECK (nine_step_mapping BETWEEN 1 AND 9),
  sort_order INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for stage-based queries
CREATE INDEX IF NOT EXISTS idx_journey_steps_stage ON journey_steps(stage, sort_order);
CREATE INDEX IF NOT EXISTS idx_journey_steps_step_id ON journey_steps(step_id);

-- RLS: journey_steps is a read-only reference table, accessible to all authenticated users
ALTER TABLE journey_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read journey_steps"
  ON journey_steps FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role manages journey_steps"
  ON journey_steps FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Seed: 120 steps across 5 stages
-- ============================================================================

INSERT INTO journey_steps (step_id, stage, group_key, group_label, step_number, label, description, completion_type, completion_field, completion_threshold, nine_step_mapping, sort_order) VALUES
-- ============================================================================
-- STAGE 1: CLARITY (Steps 1-28)
-- ============================================================================
-- Group 1.1: Founder Self-Assessment
('c_profile_basics', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 1, 'Complete founder profile basics', 'Fill out your name, venture name, industry, and bio so FRED can personalize guidance.', 'profile_field', 'name', NULL, NULL, 1),
('c_define_why', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 2, 'Define your "why"', 'Write a clear statement of why you are pursuing this venture. What drives you?', 'manual', NULL, NULL, 1, 2),
('c_strengths', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 3, 'Identify personal strengths', 'List at least 3 strengths you bring to this venture.', 'manual', NULL, NULL, 3, 3),
('c_weaknesses', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 4, 'Identify personal weaknesses', 'Honestly list 3+ weaknesses or skill gaps you need to address.', 'manual', NULL, NULL, 3, 4),
('c_time_commit', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 5, 'Define time commitment', 'Document how many hours per week you can dedicate to this venture.', 'manual', NULL, NULL, NULL, 5),
('c_financial_runway', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 6, 'Assess financial runway', 'Estimate how many months you can sustain without revenue.', 'manual', NULL, NULL, NULL, 6),
('c_cofounder_status', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 7, 'Identify co-founder status', 'Document whether you are solo or have a co-founder, and identify key skills gaps.', 'profile_field', 'co_founder', NULL, 3, 7),
('c_mindset_check', 'clarity', 'founder_assessment', 'Founder Self-Assessment', 8, 'Complete founder mindset check', 'Take the mindset assessment to understand your entrepreneurial readiness.', 'manual', NULL, NULL, NULL, 8),

-- Group 1.2: Problem Definition
('c_problem_statement', 'clarity', 'problem_definition', 'Problem Definition', 9, 'Describe the problem in plain language', 'Write a clear, jargon-free description of the problem you are solving.', 'manual', NULL, NULL, 1, 9),
('c_who_has_problem', 'clarity', 'problem_definition', 'Problem Definition', 10, 'Identify who has this problem', 'Describe the specific person or business that experiences this pain.', 'manual', NULL, NULL, 1, 10),
('c_pain_level', 'clarity', 'problem_definition', 'Problem Definition', 11, 'Quantify the pain level (1-10)', 'Rate how urgent and painful this problem is for your target customer.', 'manual', NULL, NULL, 1, 11),
('c_alternatives', 'clarity', 'problem_definition', 'Problem Definition', 12, 'Describe current alternatives', 'List at least 2 ways people currently try to solve this problem.', 'manual', NULL, NULL, 1, 12),
('c_alternatives_fail', 'clarity', 'problem_definition', 'Problem Definition', 13, 'Explain why alternatives fail', 'Document the specific gaps in existing solutions that create your opportunity.', 'manual', NULL, NULL, 1, 13),
('c_market_size', 'clarity', 'problem_definition', 'Problem Definition', 14, 'Estimate market size (TAM/SAM/SOM)', 'Provide rough estimates for total, serviceable, and obtainable market.', 'manual', NULL, NULL, 2, 14),
('c_buyer_vs_user', 'clarity', 'problem_definition', 'Problem Definition', 15, 'Define the buyer vs the user', 'Clarify who pays vs who uses your product if they differ.', 'manual', NULL, NULL, 2, 15),
('c_reality_lens', 'clarity', 'problem_definition', 'Problem Definition', 16, 'Complete Reality Lens assessment', 'Get an honest AI-powered evaluation of your idea across 5 dimensions.', 'reality_lens_done', NULL, NULL, 1, 16),

-- Group 1.3: Idea Crystallization
('c_one_sentence', 'clarity', 'idea_crystallization', 'Idea Crystallization', 17, 'One-sentence idea description', 'Describe your idea in one sentence under 140 characters with no jargon.', 'manual', NULL, NULL, 1, 17),
('c_unique_insight', 'clarity', 'idea_crystallization', 'Idea Crystallization', 18, 'Define your unique insight', 'What do you know or see that others in this space do not?', 'manual', NULL, NULL, 3, 18),
('c_10x_factor', 'clarity', 'idea_crystallization', 'Idea Crystallization', 19, 'Identify the 10x better factor', 'What makes your approach dramatically better than alternatives?', 'manual', NULL, NULL, 3, 19),
('c_why_now', 'clarity', 'idea_crystallization', 'Idea Crystallization', 20, 'Explain timing -- why now', 'What has changed recently that makes this the right time for your solution?', 'manual', NULL, NULL, NULL, 20),
('c_assumptions_list', 'clarity', 'idea_crystallization', 'Idea Crystallization', 21, 'Identify initial assumptions (5+)', 'List at least 5 assumptions your venture depends on that need testing.', 'manual', NULL, NULL, 1, 21),
('c_assumptions_ranked', 'clarity', 'idea_crystallization', 'Idea Crystallization', 22, 'Rank assumptions by risk', 'Order your assumptions from riskiest to safest. Focus testing on the top one.', 'manual', NULL, NULL, 1, 22),
('c_first_chat', 'clarity', 'idea_crystallization', 'Idea Crystallization', 23, 'First FRED coaching session', 'Have your first conversation with FRED to explore your venture idea.', 'chat_sessions', NULL, 1, NULL, 23),
('c_review_assessment', 'clarity', 'idea_crystallization', 'Idea Crystallization', 24, 'Review FRED initial assessment', 'Read and reflect on FRED''s assessment of your idea. Take notes on key feedback.', 'manual', NULL, NULL, NULL, 24),

-- Group 1.4: Founder Edge
('c_founder_market_fit', 'clarity', 'founder_edge', 'Founder Edge', 25, 'Define founder-market fit', 'Explain why you are the right person to solve this specific problem.', 'manual', NULL, NULL, 3, 25),
('c_unfair_advantages', 'clarity', 'founder_edge', 'Founder Edge', 26, 'Identify unfair advantages', 'List 2+ advantages you have that competitors cannot easily replicate.', 'manual', NULL, NULL, 3, 26),
('c_relevant_experience', 'clarity', 'founder_edge', 'Founder Edge', 27, 'Document relevant experience', 'Summarize your background, expertise, and network relevant to this venture.', 'manual', NULL, NULL, 3, 27),
('c_stage_review', 'clarity', 'founder_edge', 'Founder Edge', 28, 'Clarity stage self-review with FRED', 'Complete a stage review conversation with FRED before advancing to Validation.', 'chat_sessions', NULL, 3, NULL, 28),

-- ============================================================================
-- STAGE 2: VALIDATION (Steps 29-56)
-- ============================================================================
-- Group 2.1: Customer Discovery
('v_icp_defined', 'validation', 'customer_discovery', 'Customer Discovery', 29, 'Define ideal customer profile (ICP)', 'Document demographics, psychographics, and behaviors of your ideal customer.', 'manual', NULL, NULL, 2, 29),
('v_interview_script', 'validation', 'customer_discovery', 'Customer Discovery', 30, 'Create customer interview script', 'Prepare 10+ open-ended questions to validate problem and willingness to pay.', 'manual', NULL, NULL, 5, 30),
('v_discovery_calls', 'validation', 'customer_discovery', 'Customer Discovery', 31, 'Conduct 5 customer discovery calls', 'Interview at least 5 potential customers and document findings.', 'manual', NULL, NULL, 5, 31),
('v_top_pain_points', 'validation', 'customer_discovery', 'Customer Discovery', 32, 'Identify top 3 pain points from interviews', 'Rank the most common pain points discovered in your interviews.', 'manual', NULL, NULL, 5, 32),
('v_willingness_pay', 'validation', 'customer_discovery', 'Customer Discovery', 33, 'Validate willingness to pay', 'Collect data on what customers would pay and how they value the solution.', 'manual', NULL, NULL, 5, 33),
('v_customer_quotes', 'validation', 'customer_discovery', 'Customer Discovery', 34, 'Document customer quotes/evidence', 'Save 5+ verbatim quotes that validate the problem and demand.', 'manual', NULL, NULL, 5, 34),
('v_early_adopters', 'validation', 'customer_discovery', 'Customer Discovery', 35, 'Identify early adopter characteristics', 'Define the profile of customers most likely to adopt first.', 'manual', NULL, NULL, 2, 35),
('v_decision_process', 'validation', 'customer_discovery', 'Customer Discovery', 36, 'Map the buyer decision process', 'Document how your buyer discovers, evaluates, and purchases solutions.', 'manual', NULL, NULL, 2, 36),
('v_purchase_triggers', 'validation', 'customer_discovery', 'Customer Discovery', 37, 'Identify purchase triggers', 'List 3+ events or conditions that trigger a purchase decision.', 'manual', NULL, NULL, 2, 37),
('v_distribution_channels', 'validation', 'customer_discovery', 'Customer Discovery', 38, 'Assess distribution channels', 'Identify 2+ channels to reach your target customers cost-effectively.', 'manual', NULL, NULL, 6, 38),

-- Group 2.2: Competitive Landscape
('v_direct_competitors', 'validation', 'competitive_landscape', 'Competitive Landscape', 39, 'List direct competitors (5+)', 'Identify and document at least 5 direct competitors in your space.', 'manual', NULL, NULL, 2, 39),
('v_indirect_competitors', 'validation', 'competitive_landscape', 'Competitive Landscape', 40, 'List indirect competitors/substitutes', 'Map 3+ indirect alternatives or substitute behaviors.', 'manual', NULL, NULL, 2, 40),
('v_positioning_matrix', 'validation', 'competitive_landscape', 'Competitive Landscape', 41, 'Create competitive positioning matrix', 'Build a matrix comparing you vs competitors on 4+ dimensions.', 'manual', NULL, NULL, 3, 41),
('v_competitive_gaps', 'validation', 'competitive_landscape', 'Competitive Landscape', 42, 'Identify competitive gaps', 'Document 2+ gaps in the market that your solution exploits.', 'manual', NULL, NULL, 3, 42),
('v_competitor_pricing', 'validation', 'competitive_landscape', 'Competitive Landscape', 43, 'Analyze competitor pricing', 'Document the price range and models of competitors in your space.', 'manual', NULL, NULL, 2, 43),
('v_positioning_statement', 'validation', 'competitive_landscape', 'Competitive Landscape', 44, 'Define your positioning statement', 'Write a one-paragraph positioning statement that differentiates you.', 'manual', NULL, NULL, 3, 44),

-- Group 2.3: Solution Validation
('v_simplest_solution', 'validation', 'solution_validation', 'Solution Validation', 45, 'Define the simplest viable solution', 'Scope the minimal product that solves the core problem.', 'manual', NULL, NULL, 4, 45),
('v_feature_priority', 'validation', 'solution_validation', 'Solution Validation', 46, 'List must-have vs nice-to-have features', 'Categorize features into must-have, should-have, and nice-to-have.', 'manual', NULL, NULL, 4, 46),
('v_prototype', 'validation', 'solution_validation', 'Solution Validation', 47, 'Create low-fidelity prototype/mockup', 'Build a wireframe, mockup, or clickable prototype of your solution.', 'manual', NULL, NULL, 4, 47),
('v_prototype_test', 'validation', 'solution_validation', 'Solution Validation', 48, 'Test prototype with 5+ potential users', 'Show your prototype to at least 5 users and document reactions.', 'manual', NULL, NULL, 5, 48),
('v_wow_moment', 'validation', 'solution_validation', 'Solution Validation', 49, 'Identify the wow moment', 'Define the moment when a user first experiences your core value.', 'manual', NULL, NULL, 4, 49),
('v_success_metrics', 'validation', 'solution_validation', 'Solution Validation', 50, 'Define success metrics for MVP', 'Set 3+ measurable targets that indicate your MVP is working.', 'manual', NULL, NULL, 5, 50),
('v_tech_feasibility', 'validation', 'solution_validation', 'Solution Validation', 51, 'Validate technical feasibility', 'Confirm the solution can be built with available resources and technology.', 'manual', NULL, NULL, 4, 51),
('v_deep_coaching', 'validation', 'solution_validation', 'Solution Validation', 52, 'Complete 5 deep coaching sessions', 'Have at least 5 substantive coaching conversations with FRED.', 'chat_sessions', NULL, 5, NULL, 52),

-- Group 2.4: Business Model Basics
('v_revenue_model', 'validation', 'business_model', 'Business Model Basics', 53, 'Define revenue model', 'Document your pricing structure, payment model, and revenue streams.', 'manual', NULL, NULL, 4, 53),
('v_unit_economics', 'validation', 'business_model', 'Business Model Basics', 54, 'Estimate unit economics', 'Calculate initial estimates for CAC, LTV, gross margin, and payback period.', 'manual', NULL, NULL, 4, 54),
('v_cost_drivers', 'validation', 'business_model', 'Business Model Basics', 55, 'Identify key cost drivers', 'List the top 5 costs required to build and deliver your product.', 'manual', NULL, NULL, 4, 55),
('v_stage_review', 'validation', 'business_model', 'Business Model Basics', 56, 'Validation stage review with FRED', 'Complete a stage review conversation with FRED before advancing to Build.', 'chat_sessions', NULL, 8, NULL, 56),

-- ============================================================================
-- STAGE 3: BUILD (Steps 57-84)
-- ============================================================================
-- Group 3.1: Product Development
('b_feature_set', 'build', 'product_development', 'Product Development', 57, 'Finalize MVP feature set', 'Lock the feature list based on validation learnings. No scope creep.', 'manual', NULL, NULL, 4, 57),
('b_product_roadmap', 'build', 'product_development', 'Product Development', 58, 'Create product roadmap (3-month)', 'Plan your next 3 months of product development with milestones.', 'manual', NULL, NULL, 7, 58),
('b_tech_architecture', 'build', 'product_development', 'Product Development', 59, 'Define technical architecture', 'Document your tech stack, infrastructure, and key architectural decisions.', 'manual', NULL, NULL, 4, 59),
('b_build_mvp', 'build', 'product_development', 'Product Development', 60, 'Build or commission MVP', 'Have a working MVP that can be demonstrated to users.', 'manual', NULL, NULL, 4, 60),
('b_qa_testing', 'build', 'product_development', 'Product Development', 61, 'Internal QA and testing', 'Test your product thoroughly and fix critical bugs before launch.', 'manual', NULL, NULL, 7, 61),
('b_analytics_setup', 'build', 'product_development', 'Product Development', 62, 'Set up analytics/tracking', 'Install analytics to track user behavior, conversion, and key events.', 'manual', NULL, NULL, 7, 62),
('b_user_onboarding', 'build', 'product_development', 'Product Development', 63, 'Create onboarding flow for users', 'Design the first-time user experience that gets users to value quickly.', 'manual', NULL, NULL, 6, 63),
('b_data_strategy', 'build', 'product_development', 'Product Development', 64, 'Define data collection strategy', 'Identify what data you need to collect and how to store it responsibly.', 'manual', NULL, NULL, 7, 64),
('b_feedback_plan', 'build', 'product_development', 'Product Development', 65, 'Plan for user feedback collection', 'Set up mechanisms to collect ongoing user feedback (surveys, NPS, etc).', 'manual', NULL, NULL, 7, 65),
('b_decision_log', 'build', 'product_development', 'Product Development', 66, 'Document product decisions', 'Maintain a decision log explaining key product choices and trade-offs.', 'manual', NULL, NULL, 7, 66),

-- Group 3.2: Strategy & Planning
('b_strategy_doc', 'build', 'strategy_planning', 'Strategy & Planning', 67, 'Create a strategy document', 'Draft a comprehensive strategy document covering problem, solution, market, and plan.', 'document_created', NULL, NULL, 7, 67),
('b_okrs', 'build', 'strategy_planning', 'Strategy & Planning', 68, 'Define 90-day OKRs', 'Set 3+ objectives with measurable key results for the next quarter.', 'manual', NULL, NULL, 7, 68),
('b_financial_projections', 'build', 'strategy_planning', 'Strategy & Planning', 69, 'Create financial projections (12-month)', 'Build a financial model projecting revenue, costs, and cash flow for 12 months.', 'manual', NULL, NULL, 7, 69),
('b_hiring_plan', 'build', 'strategy_planning', 'Strategy & Planning', 70, 'Define team hiring plan', 'Map the roles you need to hire, when, and the budget for each.', 'manual', NULL, NULL, 7, 70),
('b_advisory_targets', 'build', 'strategy_planning', 'Strategy & Planning', 71, 'Identify advisory board targets', 'List 3+ potential advisors who could strengthen your venture.', 'manual', NULL, NULL, NULL, 71),
('b_legal_checklist', 'build', 'strategy_planning', 'Strategy & Planning', 72, 'Create legal checklist', 'Document entity formation, IP protection, and contract needs.', 'manual', NULL, NULL, NULL, 72),
('b_brand_identity', 'build', 'strategy_planning', 'Strategy & Planning', 73, 'Define brand identity basics', 'Establish your name, logo, colors, and brand voice.', 'manual', NULL, NULL, 6, 73),
('b_content_strategy', 'build', 'strategy_planning', 'Strategy & Planning', 74, 'Create content strategy outline', 'Plan 3+ content channels and themes for building awareness.', 'manual', NULL, NULL, 6, 74),

-- Group 3.3: Investor Materials
('b_pitch_deck_v1', 'build', 'investor_materials', 'Investor Materials', 75, 'Upload or create pitch deck (v1)', 'Create your first investor pitch deck and upload it for review.', 'pitch_deck_uploaded', NULL, NULL, NULL, 75),
('b_deck_review', 'build', 'investor_materials', 'Investor Materials', 76, 'Get FRED pitch deck review', 'Submit your deck for AI-powered review and get a detailed scorecard.', 'manual', NULL, NULL, NULL, 76),
('b_exec_summary', 'build', 'investor_materials', 'Investor Materials', 77, 'Write executive summary (1-page)', 'Create a one-page executive summary of your venture for investors.', 'manual', NULL, NULL, NULL, 77),
('b_financial_model', 'build', 'investor_materials', 'Investor Materials', 78, 'Create financial model', 'Build a detailed financial model with revenue projections and assumptions.', 'manual', NULL, NULL, NULL, 78),
('b_use_of_funds', 'build', 'investor_materials', 'Investor Materials', 79, 'Prepare use-of-funds breakdown', 'Define how you will allocate raised capital across categories.', 'manual', NULL, NULL, NULL, 79),
('b_funding_ask', 'build', 'investor_materials', 'Investor Materials', 80, 'Define funding ask and terms', 'State your raise amount, instrument type, and key terms.', 'manual', NULL, NULL, NULL, 80),
('b_investor_faq', 'build', 'investor_materials', 'Investor Materials', 81, 'Draft investor FAQ (10+ questions)', 'Prepare answers to the 10+ most common investor questions.', 'manual', NULL, NULL, NULL, 81),
('b_irs_baseline', 'build', 'investor_materials', 'Investor Materials', 82, 'Complete investor readiness assessment', 'Get your first investor readiness score to establish a baseline.', 'investor_readiness_scored', NULL, NULL, NULL, 82),
('b_investor_targets', 'build', 'investor_materials', 'Investor Materials', 83, 'Identify initial investor targets (10+)', 'Research and list 10+ investors aligned with your stage and sector.', 'manual', NULL, NULL, NULL, 83),
('b_stage_review', 'build', 'investor_materials', 'Investor Materials', 84, 'Build stage review with FRED', 'Complete a stage review conversation with FRED before advancing to Launch.', 'chat_sessions', NULL, 10, NULL, 84),

-- ============================================================================
-- STAGE 4: LAUNCH (Steps 85-108)
-- ============================================================================
-- Group 4.1: Go-To-Market Execution
('l_launch_strategy', 'launch', 'gtm_execution', 'Go-To-Market Execution', 85, 'Define launch strategy', 'Document your complete go-to-market plan including channels, timing, and tactics.', 'manual', NULL, NULL, 6, 85),
('l_landing_page', 'launch', 'gtm_execution', 'Go-To-Market Execution', 86, 'Create landing page/website', 'Have a live, professional landing page that converts visitors to users.', 'manual', NULL, NULL, 6, 86),
('l_crm_setup', 'launch', 'gtm_execution', 'Go-To-Market Execution', 87, 'Set up CRM/lead tracking', 'Implement a system to track leads, conversations, and pipeline.', 'manual', NULL, NULL, 7, 87),
('l_marketing_channels', 'launch', 'gtm_execution', 'Go-To-Market Execution', 88, 'Define marketing channels (top 3)', 'Prioritize your top 3 marketing channels based on where your customers are.', 'manual', NULL, NULL, 6, 88),
('l_marketing_content', 'launch', 'gtm_execution', 'Go-To-Market Execution', 89, 'Create initial marketing content', 'Produce at least 5 pieces of content (posts, emails, ads, articles).', 'manual', NULL, NULL, 6, 89),
('l_first_10_users', 'launch', 'gtm_execution', 'Go-To-Market Execution', 90, 'Launch to first 10 beta users', 'Onboard your first 10 real users and get them using the product.', 'metric_threshold', 'active_users', 10, 8, 90),
('l_beta_feedback', 'launch', 'gtm_execution', 'Go-To-Market Execution', 91, 'Collect beta user feedback', 'Gather structured feedback from at least 5 beta users.', 'manual', NULL, NULL, 8, 91),
('l_iterate_product', 'launch', 'gtm_execution', 'Go-To-Market Execution', 92, 'Iterate on product based on feedback', 'Ship at least 3 improvements based on real user feedback.', 'manual', NULL, NULL, 8, 92),
('l_first_customer', 'launch', 'gtm_execution', 'Go-To-Market Execution', 93, 'Achieve first paying customer', 'Get your first customer to pay for your product or service.', 'manual', NULL, NULL, 8, 93),
('l_success_playbook', 'launch', 'gtm_execution', 'Go-To-Market Execution', 94, 'Define customer success playbook', 'Document onboarding, support, and retention processes for customers.', 'manual', NULL, NULL, 7, 94),

-- Group 4.2: Traction Building
('l_25_users', 'launch', 'traction_building', 'Traction Building', 95, 'Reach 25 active users', 'Grow your active user base to at least 25 people.', 'metric_threshold', 'active_users', 25, 8, 95),
('l_retention', 'launch', 'traction_building', 'Traction Building', 96, 'Achieve 40%+ weekly retention', 'Demonstrate that users are coming back with at least 40% weekly retention.', 'metric_threshold', 'weekly_retention', 40, 8, 96),
('l_testimonials', 'launch', 'traction_building', 'Traction Building', 97, 'Collect 5+ testimonials', 'Get written or video testimonials from at least 5 satisfied users.', 'manual', NULL, NULL, 8, 97),
('l_case_studies', 'launch', 'traction_building', 'Traction Building', 98, 'Generate 3+ case studies', 'Document 3+ detailed stories of how customers benefit from your product.', 'manual', NULL, NULL, 8, 98),
('l_funnel_optimization', 'launch', 'traction_building', 'Traction Building', 99, 'Optimize conversion funnel', 'Analyze and improve your signup-to-activation conversion rates.', 'manual', NULL, NULL, 8, 99),
('l_repeatable_channel', 'launch', 'traction_building', 'Traction Building', 100, 'Establish repeatable acquisition channel', 'Prove at least one channel delivers customers at a predictable cost.', 'manual', NULL, NULL, 9, 100),
('l_weekly_reporting', 'launch', 'traction_building', 'Traction Building', 101, 'Track and report key metrics weekly', 'Complete at least 4 weekly metric reports tracking growth and retention.', 'manual', NULL, NULL, 7, 101),
('l_1k_mrr', 'launch', 'traction_building', 'Traction Building', 102, 'Reach $1K MRR or equivalent milestone', 'Achieve $1,000 in monthly recurring revenue or an equivalent traction metric.', 'metric_threshold', 'mrr', 1000, 8, 102),

-- Group 4.3: Fundraise Preparation
('l_irs_70', 'launch', 'fundraise_prep', 'Fundraise Preparation', 103, 'Achieve investor readiness score >= 70', 'Improve your investor readiness score to at least 70 out of 100.', 'investor_readiness_scored', NULL, 70, NULL, 103),
('l_deck_60', 'launch', 'fundraise_prep', 'Fundraise Preparation', 104, 'Refine pitch deck to score >= 60', 'Iterate on your pitch deck until it scores at least 60 in FRED review.', 'pitch_deck_uploaded', NULL, 60, NULL, 104),
('l_pitch_practice', 'launch', 'fundraise_prep', 'Fundraise Preparation', 105, 'Practice pitch delivery (3+ sessions)', 'Record or log at least 3 pitch practice sessions with feedback.', 'manual', NULL, NULL, NULL, 105),
('l_investor_list', 'launch', 'fundraise_prep', 'Fundraise Preparation', 106, 'Build investor target list (25+)', 'Research and compile a qualified list of 25+ target investors.', 'manual', NULL, NULL, NULL, 106),
('l_data_room', 'launch', 'fundraise_prep', 'Fundraise Preparation', 107, 'Prepare due diligence data room', 'Organize all key documents investors will request during due diligence.', 'manual', NULL, NULL, NULL, 107),
('l_stage_review', 'launch', 'fundraise_prep', 'Fundraise Preparation', 108, 'Launch stage review with FRED', 'Complete a stage review conversation with FRED before advancing to Grow.', 'chat_sessions', NULL, 15, NULL, 108),

-- ============================================================================
-- STAGE 5: GROW (Steps 109-120)
-- ============================================================================
-- Group 5.1: Scale Operations
('g_all_stages_complete', 'grow', 'scale_operations', 'Scale Operations', 109, 'Complete all prior Oases stages', 'Finish every step in Clarity, Validation, Build, and Launch.', 'manual', NULL, NULL, 9, 109),
('g_pmf_signals', 'grow', 'scale_operations', 'Scale Operations', 110, 'Achieve product-market fit signals', 'Demonstrate PMF through retention, NPS, or organic growth metrics.', 'manual', NULL, NULL, 9, 110),
('g_first_hire', 'grow', 'scale_operations', 'Scale Operations', 111, 'Hire first key team member', 'Successfully recruit and onboard your first key hire.', 'manual', NULL, NULL, 9, 111),
('g_scalable_processes', 'grow', 'scale_operations', 'Scale Operations', 112, 'Implement scalable processes', 'Document and implement 3+ processes that can scale with growth.', 'manual', NULL, NULL, 9, 112),
('g_board_meetings', 'grow', 'scale_operations', 'Scale Operations', 113, 'Set up board/advisory meetings', 'Establish a regular cadence for board or advisory check-ins.', 'manual', NULL, NULL, NULL, 113),
('g_scaling_dashboard', 'grow', 'scale_operations', 'Scale Operations', 114, 'Define scaling metrics and dashboards', 'Create a dashboard tracking 5+ KPIs critical for growth decisions.', 'manual', NULL, NULL, 9, 114),

-- Group 5.2: Fundraise & Network
('g_fund_matching', 'grow', 'fundraise_network', 'Fundraise & Network', 115, 'Prepare for fund matching', 'Complete your Boardy profile and preferences for investor matching.', 'boardy_ready', NULL, NULL, NULL, 115),
('g_investor_outreach', 'grow', 'fundraise_network', 'Fundraise & Network', 116, 'Complete investor outreach (10+ intros)', 'Make at least 10 warm introductions to qualified investors.', 'manual', NULL, NULL, NULL, 116),
('g_investor_meetings', 'grow', 'fundraise_network', 'Fundraise & Network', 117, 'Conduct investor meetings (5+)', 'Complete at least 5 investor meetings with substantive discussions.', 'manual', NULL, NULL, NULL, 117),
('g_close_funding', 'grow', 'fundraise_network', 'Fundraise & Network', 118, 'Negotiate and close funding round', 'Receive a term sheet or funding commitment from an investor.', 'manual', NULL, NULL, NULL, 118),

-- Group 5.3: Growth Optimization
('g_10k_mrr', 'grow', 'growth_optimization', 'Growth Optimization', 119, 'Reach $10K MRR or Series A metrics', 'Achieve $10K MRR or meet the traction benchmarks expected for your next raise.', 'metric_threshold', 'mrr', 10000, 9, 119),
('g_graduate', 'grow', 'growth_optimization', 'Growth Optimization', 120, 'Graduate from Sahara program', 'Complete the full 120-step journey with a final review and celebration.', 'manual', NULL, NULL, 9, 120)

ON CONFLICT (step_id) DO NOTHING;

-- ============================================================================
-- Comment on table
-- ============================================================================
COMMENT ON TABLE journey_steps IS 'IdeaPros 120-step founder journey template mapped to Sahara Oases stages. Read-only reference table. User progress tracked in oases_progress.';
