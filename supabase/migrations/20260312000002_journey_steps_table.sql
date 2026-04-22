-- IdeaPros 120-Step Journey Template (AI-1802)
-- Stores the journey step definitions so they can be queried, filtered,
-- and updated without redeploying code.

create table if not exists public.journey_steps (
  id text primary key,
  stage text not null check (stage in ('clarity', 'validation', 'build', 'launch', 'grow')),
  step_order smallint not null,
  label text not null,
  description text not null,
  category text not null,
  completion_criteria text not null,
  estimated_minutes smallint not null default 15,
  requires_fred boolean not null default false,
  auto_complete boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_journey_steps_stage on public.journey_steps (stage, step_order);
create index idx_journey_steps_category on public.journey_steps (category);
create index idx_journey_steps_active on public.journey_steps (active) where active = true;

-- RLS: journey steps are public read, admin write
alter table public.journey_steps enable row level security;

create policy "Anyone can read journey steps"
  on public.journey_steps for select
  using (true);

create policy "Service role can manage journey steps"
  on public.journey_steps for all
  using (auth.role() = 'service_role');

-- Seed the 120 IdeaPros journey steps
-- Stage 1: CLARITY (20 steps)
insert into public.journey_steps (id, stage, step_order, label, description, category, completion_criteria, estimated_minutes, requires_fred, auto_complete) values
('c01_account_setup', 'clarity', 1, 'Create your Sahara account', 'Sign up and verify your email to begin your founder journey.', 'Onboarding', 'Account created and email verified', 5, false, true),
('c02_founder_profile', 'clarity', 2, 'Complete your founder profile', 'Enter your name, background, industry, and a brief bio so FRED can personalize your experience.', 'Onboarding', 'Profile fields (name, industry, bio) are filled', 10, false, true),
('c03_venture_name', 'clarity', 3, 'Name your venture', 'Provide a working name for your startup or business idea.', 'Onboarding', 'Venture name saved to profile', 5, false, true),
('c04_idea_statement', 'clarity', 4, 'Write your one-sentence idea statement', 'Describe your idea in one clear sentence: what it does, who it''s for, and why it matters.', 'Idea Definition', 'Idea statement saved (minimum 20 characters)', 15, false, true),
('c05_problem_definition', 'clarity', 5, 'Define the problem you''re solving', 'Clearly articulate the pain point or unmet need your venture addresses.', 'Idea Definition', 'Problem statement reviewed by FRED', 20, true, false),
('c06_personal_why', 'clarity', 6, 'Articulate your personal why', 'Explain why you are the right person to solve this problem. What''s your unique connection?', 'Founder Readiness', 'Personal motivation discussed with FRED', 15, true, false),
('c07_founder_strengths', 'clarity', 7, 'Identify your founder strengths', 'List your top 3-5 skills, experiences, or assets that give you an edge in building this venture.', 'Founder Readiness', 'Strengths documented in profile', 15, true, false),
('c08_founder_gaps', 'clarity', 8, 'Acknowledge your gaps', 'Honestly assess what skills or resources you lack. This shapes your team-building plan.', 'Founder Readiness', 'Gap analysis completed with FRED', 15, true, false),
('c09_reality_lens', 'clarity', 9, 'Complete your Reality Lens assessment', 'Get an honest multi-perspective evaluation of your idea''s viability, market fit, and founder readiness.', 'Assessment', 'Reality Lens score generated', 30, true, true),
('c10_target_customer_draft', 'clarity', 10, 'Draft your target customer description', 'Describe who your ideal customer is — demographics, behaviors, needs.', 'Idea Definition', 'Customer description saved', 20, true, false),
('c11_existing_solutions', 'clarity', 11, 'List existing solutions in the market', 'Identify 3-5 alternatives your target customers currently use to solve the same problem.', 'Market Awareness', 'At least 3 alternatives listed', 20, false, false),
('c12_unique_value_draft', 'clarity', 12, 'Draft your unique value proposition', 'Write a first draft of what makes your solution different and better than existing alternatives.', 'Idea Definition', 'UVP draft saved', 20, true, false),
('c13_first_fred_session', 'clarity', 13, 'Have your first deep conversation with FRED', 'Discuss your idea, motivations, and initial concerns in a substantive coaching session.', 'Coaching', 'First chat session completed (minimum 5 messages)', 30, true, true),
('c14_mindset_check', 'clarity', 14, 'Complete founder mindset check-in', 'Assess your current mental state, energy level, and commitment to the venture.', 'Wellbeing', 'Wellbeing check-in completed', 10, true, false),
('c15_cofounding_status', 'clarity', 15, 'Define your co-founding situation', 'Are you solo or with co-founders? Define roles, equity expectations, and decision-making.', 'Team', 'Co-founder status documented', 15, true, false),
('c16_timeline_goals', 'clarity', 16, 'Set your venture timeline and goals', 'Define your 30/60/90 day goals and overall timeline expectations.', 'Planning', 'Timeline goals saved to profile', 15, true, false),
('c17_resource_inventory', 'clarity', 17, 'Inventory your available resources', 'List what you currently have: savings, time availability, equipment, connections, expertise.', 'Planning', 'Resource inventory completed', 15, false, false),
('c18_risk_awareness', 'clarity', 18, 'Identify your top 3 risks', 'What are the biggest risks that could prevent your venture from succeeding?', 'Assessment', 'Risk assessment discussed with FRED', 15, true, false),
('c19_commitment_level', 'clarity', 19, 'Confirm your commitment level', 'Full-time, part-time, or side project? Be honest about your bandwidth.', 'Founder Readiness', 'Commitment level documented', 10, true, false),
('c20_clarity_review', 'clarity', 20, 'Clarity stage review with FRED', 'Review everything you''ve documented. FRED synthesizes your inputs and confirms you''re ready to move to Validation.', 'Milestone', 'FRED confirms clarity stage complete', 20, true, false);

-- Stage 2: VALIDATION (25 steps)
insert into public.journey_steps (id, stage, step_order, label, description, category, completion_criteria, estimated_minutes, requires_fred, auto_complete) values
('v01_customer_persona', 'validation', 1, 'Build detailed customer persona', 'Create a comprehensive profile of your ideal customer including demographics, psychographics, and buying behavior.', 'Customer Discovery', 'Customer persona document created', 30, true, false),
('v02_problem_interviews_plan', 'validation', 2, 'Plan customer discovery interviews', 'Design 5-10 questions to validate whether your target customers actually experience the problem you identified.', 'Customer Discovery', 'Interview script reviewed by FRED', 25, true, false),
('v03_interview_targets', 'validation', 3, 'Identify 10 potential interview targets', 'List 10 people who match your customer persona and could provide validation feedback.', 'Customer Discovery', 'At least 10 targets listed', 20, false, false),
('v04_first_interviews', 'validation', 4, 'Conduct first 3 customer interviews', 'Talk to at least 3 potential customers. Document their responses and pain points.', 'Customer Discovery', '3 interview summaries logged', 120, false, false),
('v05_interview_debrief', 'validation', 5, 'Debrief interviews with FRED', 'Review interview findings with FRED. Identify patterns, surprises, and pivot signals.', 'Customer Discovery', 'Interview debrief session completed', 30, true, false),
('v06_market_size_research', 'validation', 6, 'Research your total addressable market', 'Estimate TAM, SAM, and SOM for your venture using available data sources.', 'Market Research', 'Market size estimates documented', 45, true, false),
('v07_competitor_deep_dive', 'validation', 7, 'Analyze top 5 competitors', 'Research your 5 closest competitors: pricing, features, strengths, weaknesses, market share.', 'Market Research', 'Competitive analysis completed', 60, false, false),
('v08_positioning_statement', 'validation', 8, 'Refine your positioning statement', 'Using market research, create a positioning statement: For [target], who [need], [product] is a [category] that [benefit].', 'Positioning', 'Positioning statement approved by FRED', 25, true, false),
('v09_value_hypothesis', 'validation', 9, 'Define your value hypothesis', 'State the core assumption about why customers will use your product. Make it testable.', 'Hypothesis', 'Value hypothesis documented', 20, true, false),
('v10_growth_hypothesis', 'validation', 10, 'Define your growth hypothesis', 'State how you believe new users will discover your product. Identify your primary growth channel.', 'Hypothesis', 'Growth hypothesis documented', 20, true, false),
('v11_revenue_model_draft', 'validation', 11, 'Draft initial revenue model', 'How will you make money? Define pricing strategy, revenue streams, and initial unit economics.', 'Business Model', 'Revenue model draft saved', 30, true, false),
('v12_cost_structure', 'validation', 12, 'Estimate your cost structure', 'List fixed and variable costs. Estimate monthly burn rate for the first 6 months.', 'Business Model', 'Cost structure documented', 30, false, false),
('v13_mvp_definition', 'validation', 13, 'Define your minimum viable product', 'What is the smallest version of your product that can test your value hypothesis?', 'Product', 'MVP scope documented with FRED', 30, true, false),
('v14_validation_experiment', 'validation', 14, 'Design a validation experiment', 'Create a low-cost experiment to test demand before building. Landing page, pre-order, waitlist, etc.', 'Validation', 'Experiment plan approved by FRED', 30, true, false),
('v15_run_experiment', 'validation', 15, 'Run your validation experiment', 'Execute your experiment and collect data. Track signups, interest, or pre-orders.', 'Validation', 'Experiment results documented', 120, false, false),
('v16_experiment_analysis', 'validation', 16, 'Analyze experiment results with FRED', 'Review your experiment data. Did it validate or invalidate your hypothesis? What''s next?', 'Validation', 'Analysis session completed', 30, true, false),
('v17_pivot_or_proceed', 'validation', 17, 'Make pivot-or-proceed decision', 'Based on evidence, decide: proceed as planned, pivot the approach, or abandon and restart.', 'Decision', 'Decision documented with FRED', 25, true, false),
('v18_coaching_session_5', 'validation', 18, 'Complete 5 total coaching conversations', 'By now you should have had at least 5 substantive conversations with FRED.', 'Coaching', '5 chat sessions completed', 30, true, true),
('v19_legal_structure', 'validation', 19, 'Research legal entity options', 'Understand LLC vs C-Corp vs S-Corp. Discuss with FRED which structure fits your goals.', 'Legal', 'Legal structure discussion completed', 25, true, false),
('v20_ip_assessment', 'validation', 20, 'Assess intellectual property needs', 'Do you need patents, trademarks, or copyrights? Identify any IP risks or opportunities.', 'Legal', 'IP assessment completed', 20, true, false),
('v21_advisory_needs', 'validation', 21, 'Identify advisory board needs', 'What expertise gaps could advisors fill? List 3 types of advisors that would add value.', 'Team', 'Advisory needs documented', 15, true, false),
('v22_brand_name_check', 'validation', 22, 'Check brand name availability', 'Verify your venture name is available as a domain, social handles, and isn''t trademarked.', 'Branding', 'Brand name availability confirmed', 20, false, false),
('v23_elevator_pitch', 'validation', 23, 'Craft your 60-second elevator pitch', 'Create a compelling verbal pitch you can deliver in under 60 seconds.', 'Communication', 'Elevator pitch reviewed by FRED', 25, true, false),
('v24_validation_scorecard', 'validation', 24, 'Complete validation scorecard', 'Rate your confidence level (1-10) across: problem, customer, solution, market, team.', 'Assessment', 'Scorecard completed', 15, true, false),
('v25_validation_review', 'validation', 25, 'Validation stage review with FRED', 'Comprehensive review of all validation work. FRED confirms readiness to enter Build stage.', 'Milestone', 'FRED confirms validation stage complete', 25, true, false);

-- Stage 3: BUILD (30 steps)
insert into public.journey_steps (id, stage, step_order, label, description, category, completion_criteria, estimated_minutes, requires_fred, auto_complete) values
('b01_brand_identity', 'build', 1, 'Define brand identity basics', 'Set your brand''s mission, vision, values, and personality traits.', 'Branding', 'Brand identity document created', 30, true, false),
('b02_visual_identity', 'build', 2, 'Create visual identity guidelines', 'Define colors, fonts, logo direction, and visual style for your brand.', 'Branding', 'Visual identity documented', 30, false, false),
('b03_brand_voice', 'build', 3, 'Establish brand voice and messaging', 'Define how your brand speaks: tone, vocabulary, do/don''t examples.', 'Branding', 'Brand voice guide created', 25, true, false),
('b04_website_plan', 'build', 4, 'Plan your web presence', 'Define website structure, key pages, and content priorities. Domain secured.', 'Digital Presence', 'Website plan documented', 25, false, false),
('b05_social_setup', 'build', 5, 'Set up social media profiles', 'Create consistent profiles on 2-3 key platforms where your audience lives.', 'Digital Presence', 'Social profiles created', 30, false, false),
('b06_product_roadmap', 'build', 6, 'Create product roadmap', 'Define phases: MVP, v1, v2. Prioritize features by customer impact and feasibility.', 'Product', 'Product roadmap document created', 45, true, false),
('b07_tech_stack_decision', 'build', 7, 'Choose your technology approach', 'Build vs buy vs no-code. Discuss trade-offs with FRED based on your resources.', 'Product', 'Technology decision documented', 30, true, false),
('b08_mvp_build_plan', 'build', 8, 'Create MVP build plan', 'Break your MVP into tasks with timelines, owners, and dependencies.', 'Product', 'Build plan with milestones created', 45, true, false),
('b09_user_flow_design', 'build', 9, 'Design core user flows', 'Map the key journeys: signup, first use, core action, repeat engagement.', 'Product', 'User flows documented', 30, false, false),
('b10_prototype_wireframe', 'build', 10, 'Create prototype or wireframes', 'Build low-fidelity mockups of your key screens. Use Figma, paper, or no-code tools.', 'Product', 'Wireframes created', 60, false, false),
('b11_business_plan_draft', 'build', 11, 'Draft business plan summary', 'Write a 2-3 page business plan covering problem, solution, market, model, team, and ask.', 'Strategy', 'Business plan document created', 60, true, true),
('b12_financial_projections', 'build', 12, 'Create 12-month financial projections', 'Build revenue, expense, and cash flow projections for the first year.', 'Finance', 'Financial projections documented', 60, true, false),
('b13_pricing_strategy', 'build', 13, 'Finalize pricing strategy', 'Set your pricing model: freemium, subscription, one-time, usage-based. Test price sensitivity.', 'Business Model', 'Pricing strategy documented', 30, true, false),
('b14_entity_formation', 'build', 14, 'Form your legal entity', 'Incorporate your business. File necessary paperwork for your chosen structure.', 'Legal', 'Legal entity formation confirmed', 60, false, false),
('b15_banking_setup', 'build', 15, 'Set up business banking', 'Open a business bank account. Separate personal and business finances from day one.', 'Finance', 'Business bank account opened', 30, false, false),
('b16_accounting_setup', 'build', 16, 'Set up basic accounting', 'Choose an accounting tool (QuickBooks, Wave, etc.) and set up chart of accounts.', 'Finance', 'Accounting system configured', 30, false, false),
('b17_team_hiring_plan', 'build', 17, 'Create team hiring plan', 'Define roles needed for MVP: who to hire first, contractor vs full-time, budget.', 'Team', 'Hiring plan documented', 25, true, false),
('b18_equity_structure', 'build', 18, 'Define equity and compensation structure', 'Set founder equity splits, vesting schedules, and early employee option pool.', 'Legal', 'Equity structure documented', 30, true, false),
('b19_operations_setup', 'build', 19, 'Set up operational tools', 'Choose and configure tools for communication, project management, and file sharing.', 'Operations', 'Core tools configured', 30, false, false),
('b20_mvp_development', 'build', 20, 'Begin MVP development', 'Start building your MVP according to your build plan. Track progress weekly.', 'Product', 'MVP development started (first milestone met)', 240, false, false),
('b21_beta_testing_plan', 'build', 21, 'Plan beta testing program', 'Define beta criteria: who tests, how long, what metrics, how to collect feedback.', 'Product', 'Beta test plan documented', 25, true, false),
('b22_content_strategy', 'build', 22, 'Create content marketing strategy', 'Plan your content: topics, formats, publishing cadence, distribution channels.', 'Marketing', 'Content strategy documented', 30, true, false),
('b23_launch_landing_page', 'build', 23, 'Build pre-launch landing page', 'Create a landing page to capture early interest: waitlist, email signups, or pre-orders.', 'Digital Presence', 'Landing page live', 60, false, false),
('b24_pitch_deck_v1', 'build', 24, 'Create pitch deck v1', 'Build your first complete pitch deck: problem, solution, market, model, team, ask.', 'Fundraising', 'Pitch deck uploaded', 120, true, true),
('b25_pitch_deck_review', 'build', 25, 'Review pitch deck with FRED', 'Get detailed feedback on every slide of your pitch deck from FRED''s investor perspective.', 'Fundraising', 'Pitch deck reviewed with score generated', 30, true, true),
('b26_readiness_baseline', 'build', 26, 'Complete investor readiness assessment', 'Get your first investor readiness score to establish a baseline for improvement.', 'Fundraising', 'Investor readiness score generated', 20, true, true),
('b27_partnerships_research', 'build', 27, 'Research strategic partnerships', 'Identify 3-5 potential partners who could help with distribution, technology, or credibility.', 'Business Development', 'Partnership opportunities documented', 30, true, false),
('b28_metrics_framework', 'build', 28, 'Define your key metrics', 'Identify your North Star metric and 3-5 supporting KPIs to track from day one.', 'Analytics', 'Metrics framework documented', 25, true, false),
('b29_customer_support_plan', 'build', 29, 'Plan customer support approach', 'How will you handle customer inquiries, bugs, and feedback? Define SLAs and tools.', 'Operations', 'Support plan documented', 20, false, false),
('b30_build_review', 'build', 30, 'Build stage review with FRED', 'Comprehensive review of all build outputs. FRED assesses readiness for Launch stage.', 'Milestone', 'FRED confirms build stage complete', 30, true, false);

-- Stage 4: LAUNCH (25 steps)
insert into public.journey_steps (id, stage, step_order, label, description, category, completion_criteria, estimated_minutes, requires_fred, auto_complete) values
('l01_launch_plan', 'launch', 1, 'Create launch plan', 'Define launch strategy: timeline, channels, targets, success metrics.', 'Go-to-Market', 'Launch plan documented', 45, true, false),
('l02_gtm_channels', 'launch', 2, 'Prioritize go-to-market channels', 'Rank your top 3 customer acquisition channels and plan experiments for each.', 'Go-to-Market', 'Channel prioritization documented', 25, true, false),
('l03_marketing_budget', 'launch', 3, 'Set marketing budget', 'Allocate initial marketing spend across channels. Start small, measure, scale what works.', 'Marketing', 'Marketing budget set', 20, true, false),
('l04_launch_content', 'launch', 4, 'Prepare launch content', 'Create announcement post, demo video, FAQ page, and initial content pieces.', 'Marketing', 'Launch content prepared', 90, false, false),
('l05_beta_recruit', 'launch', 5, 'Recruit beta users', 'Get 10-20 beta users to test your MVP and provide structured feedback.', 'Product', '10+ beta users onboarded', 60, false, false),
('l06_beta_feedback', 'launch', 6, 'Collect and analyze beta feedback', 'Gather feedback from beta users. Identify critical bugs, UX issues, and feature requests.', 'Product', 'Beta feedback summary completed', 45, true, false),
('l07_iterate_mvp', 'launch', 7, 'Iterate on MVP based on feedback', 'Fix critical issues and make highest-impact improvements before public launch.', 'Product', 'MVP iteration completed', 120, false, false),
('l08_pitch_refine', 'launch', 8, 'Refine pitch deck (target score >= 60)', 'Polish your pitch deck based on beta results and FRED''s feedback until you score 60+.', 'Fundraising', 'Pitch deck score >= 60', 60, true, true),
('l09_readiness_70', 'launch', 9, 'Achieve investor readiness score >= 70', 'Improve your overall investor readiness score to at least 70 out of 100.', 'Fundraising', 'Investor readiness score >= 70', 30, true, true),
('l10_investor_story', 'launch', 10, 'Craft your investor narrative', 'Build a compelling story: why now, why you, why this market, what''s the big vision.', 'Fundraising', 'Investor narrative reviewed by FRED', 30, true, false),
('l11_financial_model', 'launch', 11, 'Build 3-year financial model', 'Extend projections to 3 years. Model scenarios: conservative, base, optimistic.', 'Finance', '3-year financial model documented', 90, true, false),
('l12_investor_list', 'launch', 12, 'Build target investor list', 'Research and list 20-30 investors who invest in your stage, sector, and geography.', 'Fundraising', 'Investor list with 20+ entries created', 60, true, false),
('l13_warm_intros', 'launch', 13, 'Map warm introduction paths', 'For each target investor, identify potential warm intro paths through your network.', 'Fundraising', 'Intro paths mapped for 10+ investors', 45, false, false),
('l14_pitch_practice', 'launch', 14, 'Practice your pitch 5 times', 'Rehearse your full pitch with FRED. Get feedback on clarity, pacing, and persuasiveness.', 'Communication', '5 pitch practice sessions logged', 75, true, false),
('l15_objection_handling', 'launch', 15, 'Prepare investor objection responses', 'Anticipate top 10 investor objections and prepare compelling responses.', 'Fundraising', 'Objection responses documented', 30, true, false),
('l16_data_room', 'launch', 16, 'Prepare due diligence data room', 'Organize key documents: incorporation, cap table, financials, team bios, IP summary.', 'Fundraising', 'Data room set up', 60, false, false),
('l17_first_customers', 'launch', 17, 'Acquire first 10 paying customers', 'Get your first paying customers through direct outreach, network, or launch channels.', 'Sales', '10 paying customers acquired', 240, false, false),
('l18_customer_feedback_loop', 'launch', 18, 'Establish customer feedback loop', 'Set up systematic processes to collect, analyze, and act on customer feedback.', 'Operations', 'Feedback loop process documented', 25, false, false),
('l19_unit_economics', 'launch', 19, 'Calculate actual unit economics', 'With real data, calculate CAC, LTV, churn, and payback period.', 'Finance', 'Unit economics documented', 30, true, false),
('l20_pr_strategy', 'launch', 20, 'Develop PR/media strategy', 'Identify media outlets, journalists, and communities where your audience pays attention.', 'Marketing', 'PR strategy documented', 25, true, false),
('l21_network_building', 'launch', 21, 'Activate professional network', 'Reach out to mentors, peers, and industry contacts. Join relevant communities.', 'Business Development', 'Networking plan executed', 30, false, false),
('l22_legal_compliance', 'launch', 22, 'Complete legal compliance checklist', 'Privacy policy, terms of service, necessary licenses, data protection compliance.', 'Legal', 'Legal compliance checklist completed', 45, false, false),
('l23_insurance_review', 'launch', 23, 'Review insurance needs', 'Assess liability, professional, and cyber insurance requirements for your venture.', 'Legal', 'Insurance review completed', 20, false, false),
('l24_public_launch', 'launch', 24, 'Execute public launch', 'Go live publicly. Announce across all channels. Track launch day metrics.', 'Go-to-Market', 'Public launch completed', 120, false, false),
('l25_launch_review', 'launch', 25, 'Launch stage review with FRED', 'Review launch results, early metrics, and lessons. FRED assesses readiness for Grow stage.', 'Milestone', 'FRED confirms launch stage complete', 30, true, false);

-- Stage 5: GROW (20 steps)
insert into public.journey_steps (id, stage, step_order, label, description, category, completion_criteria, estimated_minutes, requires_fred, auto_complete) values
('g01_growth_strategy', 'grow', 1, 'Define growth strategy', 'Based on launch data, define your primary growth strategy for the next 6 months.', 'Strategy', 'Growth strategy documented', 45, true, false),
('g02_channel_optimization', 'grow', 2, 'Optimize acquisition channels', 'Double down on what''s working. Kill what isn''t. Optimize conversion funnels.', 'Growth', 'Channel optimization plan documented', 30, true, false),
('g03_retention_strategy', 'grow', 3, 'Build retention strategy', 'Analyze churn, identify retention drivers, and build engagement loops.', 'Growth', 'Retention strategy documented', 30, true, false),
('g04_first_hire', 'grow', 4, 'Make your first key hire', 'Hire your most critical team member based on your biggest gap or opportunity.', 'Team', 'First hire made or in progress', 120, true, false),
('g05_culture_values', 'grow', 5, 'Define company culture and values', 'Articulate the culture you''re building before you grow past 5 people.', 'Team', 'Culture document created', 25, true, false),
('g06_process_automation', 'grow', 6, 'Automate key processes', 'Identify repetitive tasks and automate: onboarding, invoicing, reporting, support.', 'Operations', '3+ processes automated', 60, false, false),
('g07_data_analytics', 'grow', 7, 'Set up analytics dashboard', 'Build a dashboard tracking your North Star metric and key KPIs in real time.', 'Analytics', 'Analytics dashboard configured', 45, false, false),
('g08_fundraise_decision', 'grow', 8, 'Make fundraising decision', 'Evaluate: do you need to raise? Bootstrap? Revenue-based financing? Discuss with FRED.', 'Fundraising', 'Fundraising decision documented', 30, true, false),
('g09_investor_outreach', 'grow', 9, 'Begin investor outreach', 'Start reaching out to your target investor list. Track responses and meetings.', 'Fundraising', 'Outreach to 10+ investors initiated', 60, false, false),
('g10_boardy_matching', 'grow', 10, 'Activate Boardy fund matching', 'Connect with potential investors through Sahara''s network matching system.', 'Fundraising', 'Boardy matching activated', 15, false, true),
('g11_product_iteration', 'grow', 11, 'Plan next product iteration', 'Based on customer data, plan v2 features that drive retention and expansion.', 'Product', 'v2 roadmap documented', 45, true, false),
('g12_pricing_optimization', 'grow', 12, 'Optimize pricing', 'Test pricing changes based on actual willingness-to-pay data. Consider tiers.', 'Business Model', 'Pricing optimization documented', 30, true, false),
('g13_partnership_execution', 'grow', 13, 'Execute first strategic partnership', 'Formalize at least one partnership: co-marketing, integration, or distribution.', 'Business Development', 'Partnership agreement in place', 60, false, false),
('g14_community_building', 'grow', 14, 'Build customer community', 'Create a space for customers to connect, share, and become advocates.', 'Community', 'Community launched', 30, false, false),
('g15_referral_program', 'grow', 15, 'Create referral program', 'Design and launch a customer referral program to drive word-of-mouth growth.', 'Growth', 'Referral program launched', 30, false, false),
('g16_scaling_plan', 'grow', 16, 'Create scaling plan', 'Document what needs to change to 10x your current capacity: team, tech, processes.', 'Strategy', 'Scaling plan documented', 45, true, false),
('g17_advisory_board', 'grow', 17, 'Assemble advisory board', 'Recruit 2-3 advisors who bring expertise, credibility, and connections.', 'Team', 'Advisory board formed', 60, true, false),
('g18_milestone_tracker', 'grow', 18, 'Set next 6-month milestones', 'Define specific, measurable milestones for the next 6 months.', 'Planning', 'Milestones documented', 25, true, false),
('g19_investor_update', 'grow', 19, 'Write first investor update', 'Practice transparency: write an investor-style update even if not yet funded.', 'Communication', 'Investor update written', 25, true, false),
('g20_grow_review', 'grow', 20, 'Journey completion review with FRED', 'Comprehensive review of your entire journey. Celebrate progress, identify next challenges, plan forward.', 'Milestone', 'FRED confirms full journey complete', 30, true, false);

-- Verify count
-- SELECT stage, count(*) FROM journey_steps GROUP BY stage ORDER BY
--   CASE stage WHEN 'clarity' THEN 1 WHEN 'validation' THEN 2 WHEN 'build' THEN 3 WHEN 'launch' THEN 4 WHEN 'grow' THEN 5 END;
-- Expected: clarity=20, validation=25, build=30, launch=25, grow=20 = 120 total
