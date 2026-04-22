/**
 * IdeaPros 120-Step Journey Template
 * Linear: AI-1802
 *
 * Maps IdeaPros' ~120-step founder program to Sahara's 5 Oases stages.
 * Each step has an ID, label, description, and completion criteria.
 *
 * This module provides the static step definitions that correspond to the
 * journey_steps database table. Used by the Oases visualizer for
 * drill-down sub-milestone tracking.
 */

import type { OasesStage } from "@/types/oases"

// ============================================================================
// Types
// ============================================================================

export type CompletionType =
  | "profile_field"
  | "reality_lens_done"
  | "chat_sessions"
  | "document_created"
  | "pitch_deck_uploaded"
  | "investor_readiness_scored"
  | "metric_threshold"
  | "boardy_ready"
  | "manual"

export interface JourneyStep {
  stepId: string
  stage: OasesStage
  groupKey: string
  groupLabel: string
  stepNumber: number
  label: string
  description: string
  completionType: CompletionType
  completionField?: string
  completionThreshold?: number
  nineStepMapping?: number
  sortOrder: number
}

export interface JourneyStepGroup {
  key: string
  label: string
  stage: OasesStage
  steps: JourneyStep[]
}

// ============================================================================
// Step Definitions
// ============================================================================

export const JOURNEY_STEPS: JourneyStep[] = [
  // STAGE 1: CLARITY (Steps 1-28)
  // Group 1.1: Founder Self-Assessment
  { stepId: "c_profile_basics", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 1, label: "Complete founder profile basics", description: "Fill out your name, venture name, industry, and bio so FRED can personalize guidance.", completionType: "profile_field", completionField: "name", nineStepMapping: undefined, sortOrder: 1 },
  { stepId: "c_define_why", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 2, label: 'Define your "why"', description: "Write a clear statement of why you are pursuing this venture.", completionType: "manual", nineStepMapping: 1, sortOrder: 2 },
  { stepId: "c_strengths", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 3, label: "Identify personal strengths", description: "List at least 3 strengths you bring to this venture.", completionType: "manual", nineStepMapping: 3, sortOrder: 3 },
  { stepId: "c_weaknesses", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 4, label: "Identify personal weaknesses", description: "Honestly list 3+ weaknesses or skill gaps you need to address.", completionType: "manual", nineStepMapping: 3, sortOrder: 4 },
  { stepId: "c_time_commit", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 5, label: "Define time commitment", description: "Document how many hours per week you can dedicate to this venture.", completionType: "manual", sortOrder: 5 },
  { stepId: "c_financial_runway", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 6, label: "Assess financial runway", description: "Estimate how many months you can sustain without revenue.", completionType: "manual", sortOrder: 6 },
  { stepId: "c_cofounder_status", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 7, label: "Identify co-founder status", description: "Document whether you are solo or have a co-founder, and identify key skills gaps.", completionType: "profile_field", completionField: "co_founder", nineStepMapping: 3, sortOrder: 7 },
  { stepId: "c_mindset_check", stage: "clarity", groupKey: "founder_assessment", groupLabel: "Founder Self-Assessment", stepNumber: 8, label: "Complete founder mindset check", description: "Take the mindset assessment to understand your entrepreneurial readiness.", completionType: "manual", sortOrder: 8 },

  // Group 1.2: Problem Definition
  { stepId: "c_problem_statement", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 9, label: "Describe the problem in plain language", description: "Write a clear, jargon-free description of the problem you are solving.", completionType: "manual", nineStepMapping: 1, sortOrder: 9 },
  { stepId: "c_who_has_problem", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 10, label: "Identify who has this problem", description: "Describe the specific person or business that experiences this pain.", completionType: "manual", nineStepMapping: 1, sortOrder: 10 },
  { stepId: "c_pain_level", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 11, label: "Quantify the pain level (1-10)", description: "Rate how urgent and painful this problem is for your target customer.", completionType: "manual", nineStepMapping: 1, sortOrder: 11 },
  { stepId: "c_alternatives", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 12, label: "Describe current alternatives", description: "List at least 2 ways people currently try to solve this problem.", completionType: "manual", nineStepMapping: 1, sortOrder: 12 },
  { stepId: "c_alternatives_fail", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 13, label: "Explain why alternatives fail", description: "Document the specific gaps in existing solutions that create your opportunity.", completionType: "manual", nineStepMapping: 1, sortOrder: 13 },
  { stepId: "c_market_size", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 14, label: "Estimate market size (TAM/SAM/SOM)", description: "Provide rough estimates for total, serviceable, and obtainable market.", completionType: "manual", nineStepMapping: 2, sortOrder: 14 },
  { stepId: "c_buyer_vs_user", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 15, label: "Define the buyer vs the user", description: "Clarify who pays vs who uses your product if they differ.", completionType: "manual", nineStepMapping: 2, sortOrder: 15 },
  { stepId: "c_reality_lens", stage: "clarity", groupKey: "problem_definition", groupLabel: "Problem Definition", stepNumber: 16, label: "Complete Reality Lens assessment", description: "Get an honest AI-powered evaluation of your idea across 5 dimensions.", completionType: "reality_lens_done", nineStepMapping: 1, sortOrder: 16 },

  // Group 1.3: Idea Crystallization
  { stepId: "c_one_sentence", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 17, label: "One-sentence idea description", description: "Describe your idea in one sentence under 140 characters with no jargon.", completionType: "manual", nineStepMapping: 1, sortOrder: 17 },
  { stepId: "c_unique_insight", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 18, label: "Define your unique insight", description: "What do you know or see that others in this space do not?", completionType: "manual", nineStepMapping: 3, sortOrder: 18 },
  { stepId: "c_10x_factor", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 19, label: "Identify the 10x better factor", description: "What makes your approach dramatically better than alternatives?", completionType: "manual", nineStepMapping: 3, sortOrder: 19 },
  { stepId: "c_why_now", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 20, label: "Explain timing -- why now", description: "What has changed recently that makes this the right time for your solution?", completionType: "manual", sortOrder: 20 },
  { stepId: "c_assumptions_list", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 21, label: "Identify initial assumptions (5+)", description: "List at least 5 assumptions your venture depends on that need testing.", completionType: "manual", nineStepMapping: 1, sortOrder: 21 },
  { stepId: "c_assumptions_ranked", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 22, label: "Rank assumptions by risk", description: "Order your assumptions from riskiest to safest. Focus testing on the top one.", completionType: "manual", nineStepMapping: 1, sortOrder: 22 },
  { stepId: "c_first_chat", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 23, label: "First FRED coaching session", description: "Have your first conversation with FRED to explore your venture idea.", completionType: "chat_sessions", completionThreshold: 1, sortOrder: 23 },
  { stepId: "c_review_assessment", stage: "clarity", groupKey: "idea_crystallization", groupLabel: "Idea Crystallization", stepNumber: 24, label: "Review FRED initial assessment", description: "Read and reflect on FRED's assessment of your idea. Take notes on key feedback.", completionType: "manual", sortOrder: 24 },

  // Group 1.4: Founder Edge
  { stepId: "c_founder_market_fit", stage: "clarity", groupKey: "founder_edge", groupLabel: "Founder Edge", stepNumber: 25, label: "Define founder-market fit", description: "Explain why you are the right person to solve this specific problem.", completionType: "manual", nineStepMapping: 3, sortOrder: 25 },
  { stepId: "c_unfair_advantages", stage: "clarity", groupKey: "founder_edge", groupLabel: "Founder Edge", stepNumber: 26, label: "Identify unfair advantages", description: "List 2+ advantages you have that competitors cannot easily replicate.", completionType: "manual", nineStepMapping: 3, sortOrder: 26 },
  { stepId: "c_relevant_experience", stage: "clarity", groupKey: "founder_edge", groupLabel: "Founder Edge", stepNumber: 27, label: "Document relevant experience", description: "Summarize your background, expertise, and network relevant to this venture.", completionType: "manual", nineStepMapping: 3, sortOrder: 27 },
  { stepId: "c_stage_review", stage: "clarity", groupKey: "founder_edge", groupLabel: "Founder Edge", stepNumber: 28, label: "Clarity stage self-review with FRED", description: "Complete a stage review conversation with FRED before advancing to Validation.", completionType: "chat_sessions", completionThreshold: 3, sortOrder: 28 },

  // STAGE 2: VALIDATION (Steps 29-56)
  // Group 2.1: Customer Discovery
  { stepId: "v_icp_defined", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 29, label: "Define ideal customer profile (ICP)", description: "Document demographics, psychographics, and behaviors of your ideal customer.", completionType: "manual", nineStepMapping: 2, sortOrder: 29 },
  { stepId: "v_interview_script", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 30, label: "Create customer interview script", description: "Prepare 10+ open-ended questions to validate problem and willingness to pay.", completionType: "manual", nineStepMapping: 5, sortOrder: 30 },
  { stepId: "v_discovery_calls", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 31, label: "Conduct 5 customer discovery calls", description: "Interview at least 5 potential customers and document findings.", completionType: "manual", nineStepMapping: 5, sortOrder: 31 },
  { stepId: "v_top_pain_points", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 32, label: "Identify top 3 pain points from interviews", description: "Rank the most common pain points discovered in your interviews.", completionType: "manual", nineStepMapping: 5, sortOrder: 32 },
  { stepId: "v_willingness_pay", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 33, label: "Validate willingness to pay", description: "Collect data on what customers would pay and how they value the solution.", completionType: "manual", nineStepMapping: 5, sortOrder: 33 },
  { stepId: "v_customer_quotes", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 34, label: "Document customer quotes/evidence", description: "Save 5+ verbatim quotes that validate the problem and demand.", completionType: "manual", nineStepMapping: 5, sortOrder: 34 },
  { stepId: "v_early_adopters", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 35, label: "Identify early adopter characteristics", description: "Define the profile of customers most likely to adopt first.", completionType: "manual", nineStepMapping: 2, sortOrder: 35 },
  { stepId: "v_decision_process", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 36, label: "Map the buyer decision process", description: "Document how your buyer discovers, evaluates, and purchases solutions.", completionType: "manual", nineStepMapping: 2, sortOrder: 36 },
  { stepId: "v_purchase_triggers", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 37, label: "Identify purchase triggers", description: "List 3+ events or conditions that trigger a purchase decision.", completionType: "manual", nineStepMapping: 2, sortOrder: 37 },
  { stepId: "v_distribution_channels", stage: "validation", groupKey: "customer_discovery", groupLabel: "Customer Discovery", stepNumber: 38, label: "Assess distribution channels", description: "Identify 2+ channels to reach your target customers cost-effectively.", completionType: "manual", nineStepMapping: 6, sortOrder: 38 },

  // Group 2.2: Competitive Landscape
  { stepId: "v_direct_competitors", stage: "validation", groupKey: "competitive_landscape", groupLabel: "Competitive Landscape", stepNumber: 39, label: "List direct competitors (5+)", description: "Identify and document at least 5 direct competitors in your space.", completionType: "manual", nineStepMapping: 2, sortOrder: 39 },
  { stepId: "v_indirect_competitors", stage: "validation", groupKey: "competitive_landscape", groupLabel: "Competitive Landscape", stepNumber: 40, label: "List indirect competitors/substitutes", description: "Map 3+ indirect alternatives or substitute behaviors.", completionType: "manual", nineStepMapping: 2, sortOrder: 40 },
  { stepId: "v_positioning_matrix", stage: "validation", groupKey: "competitive_landscape", groupLabel: "Competitive Landscape", stepNumber: 41, label: "Create competitive positioning matrix", description: "Build a matrix comparing you vs competitors on 4+ dimensions.", completionType: "manual", nineStepMapping: 3, sortOrder: 41 },
  { stepId: "v_competitive_gaps", stage: "validation", groupKey: "competitive_landscape", groupLabel: "Competitive Landscape", stepNumber: 42, label: "Identify competitive gaps", description: "Document 2+ gaps in the market that your solution exploits.", completionType: "manual", nineStepMapping: 3, sortOrder: 42 },
  { stepId: "v_competitor_pricing", stage: "validation", groupKey: "competitive_landscape", groupLabel: "Competitive Landscape", stepNumber: 43, label: "Analyze competitor pricing", description: "Document the price range and models of competitors in your space.", completionType: "manual", nineStepMapping: 2, sortOrder: 43 },
  { stepId: "v_positioning_statement", stage: "validation", groupKey: "competitive_landscape", groupLabel: "Competitive Landscape", stepNumber: 44, label: "Define your positioning statement", description: "Write a one-paragraph positioning statement that differentiates you.", completionType: "manual", nineStepMapping: 3, sortOrder: 44 },

  // Group 2.3: Solution Validation
  { stepId: "v_simplest_solution", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 45, label: "Define the simplest viable solution", description: "Scope the minimal product that solves the core problem.", completionType: "manual", nineStepMapping: 4, sortOrder: 45 },
  { stepId: "v_feature_priority", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 46, label: "List must-have vs nice-to-have features", description: "Categorize features into must-have, should-have, and nice-to-have.", completionType: "manual", nineStepMapping: 4, sortOrder: 46 },
  { stepId: "v_prototype", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 47, label: "Create low-fidelity prototype/mockup", description: "Build a wireframe, mockup, or clickable prototype of your solution.", completionType: "manual", nineStepMapping: 4, sortOrder: 47 },
  { stepId: "v_prototype_test", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 48, label: "Test prototype with 5+ potential users", description: "Show your prototype to at least 5 users and document reactions.", completionType: "manual", nineStepMapping: 5, sortOrder: 48 },
  { stepId: "v_wow_moment", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 49, label: "Identify the wow moment", description: "Define the moment when a user first experiences your core value.", completionType: "manual", nineStepMapping: 4, sortOrder: 49 },
  { stepId: "v_success_metrics", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 50, label: "Define success metrics for MVP", description: "Set 3+ measurable targets that indicate your MVP is working.", completionType: "manual", nineStepMapping: 5, sortOrder: 50 },
  { stepId: "v_tech_feasibility", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 51, label: "Validate technical feasibility", description: "Confirm the solution can be built with available resources and technology.", completionType: "manual", nineStepMapping: 4, sortOrder: 51 },
  { stepId: "v_deep_coaching", stage: "validation", groupKey: "solution_validation", groupLabel: "Solution Validation", stepNumber: 52, label: "Complete 5 deep coaching sessions", description: "Have at least 5 substantive coaching conversations with FRED.", completionType: "chat_sessions", completionThreshold: 5, sortOrder: 52 },

  // Group 2.4: Business Model Basics
  { stepId: "v_revenue_model", stage: "validation", groupKey: "business_model", groupLabel: "Business Model Basics", stepNumber: 53, label: "Define revenue model", description: "Document your pricing structure, payment model, and revenue streams.", completionType: "manual", nineStepMapping: 4, sortOrder: 53 },
  { stepId: "v_unit_economics", stage: "validation", groupKey: "business_model", groupLabel: "Business Model Basics", stepNumber: 54, label: "Estimate unit economics", description: "Calculate initial estimates for CAC, LTV, gross margin, and payback period.", completionType: "manual", nineStepMapping: 4, sortOrder: 54 },
  { stepId: "v_cost_drivers", stage: "validation", groupKey: "business_model", groupLabel: "Business Model Basics", stepNumber: 55, label: "Identify key cost drivers", description: "List the top 5 costs required to build and deliver your product.", completionType: "manual", nineStepMapping: 4, sortOrder: 55 },
  { stepId: "v_stage_review", stage: "validation", groupKey: "business_model", groupLabel: "Business Model Basics", stepNumber: 56, label: "Validation stage review with FRED", description: "Complete a stage review conversation with FRED before advancing to Build.", completionType: "chat_sessions", completionThreshold: 8, sortOrder: 56 },

  // STAGE 3: BUILD (Steps 57-84)
  // Group 3.1: Product Development
  { stepId: "b_feature_set", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 57, label: "Finalize MVP feature set", description: "Lock the feature list based on validation learnings. No scope creep.", completionType: "manual", nineStepMapping: 4, sortOrder: 57 },
  { stepId: "b_product_roadmap", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 58, label: "Create product roadmap (3-month)", description: "Plan your next 3 months of product development with milestones.", completionType: "manual", nineStepMapping: 7, sortOrder: 58 },
  { stepId: "b_tech_architecture", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 59, label: "Define technical architecture", description: "Document your tech stack, infrastructure, and key architectural decisions.", completionType: "manual", nineStepMapping: 4, sortOrder: 59 },
  { stepId: "b_build_mvp", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 60, label: "Build or commission MVP", description: "Have a working MVP that can be demonstrated to users.", completionType: "manual", nineStepMapping: 4, sortOrder: 60 },
  { stepId: "b_qa_testing", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 61, label: "Internal QA and testing", description: "Test your product thoroughly and fix critical bugs before launch.", completionType: "manual", nineStepMapping: 7, sortOrder: 61 },
  { stepId: "b_analytics_setup", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 62, label: "Set up analytics/tracking", description: "Install analytics to track user behavior, conversion, and key events.", completionType: "manual", nineStepMapping: 7, sortOrder: 62 },
  { stepId: "b_user_onboarding", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 63, label: "Create onboarding flow for users", description: "Design the first-time user experience that gets users to value quickly.", completionType: "manual", nineStepMapping: 6, sortOrder: 63 },
  { stepId: "b_data_strategy", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 64, label: "Define data collection strategy", description: "Identify what data you need to collect and how to store it responsibly.", completionType: "manual", nineStepMapping: 7, sortOrder: 64 },
  { stepId: "b_feedback_plan", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 65, label: "Plan for user feedback collection", description: "Set up mechanisms to collect ongoing user feedback (surveys, NPS, etc).", completionType: "manual", nineStepMapping: 7, sortOrder: 65 },
  { stepId: "b_decision_log", stage: "build", groupKey: "product_development", groupLabel: "Product Development", stepNumber: 66, label: "Document product decisions", description: "Maintain a decision log explaining key product choices and trade-offs.", completionType: "manual", nineStepMapping: 7, sortOrder: 66 },

  // Group 3.2: Strategy & Planning
  { stepId: "b_strategy_doc", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 67, label: "Create a strategy document", description: "Draft a comprehensive strategy document covering problem, solution, market, and plan.", completionType: "document_created", nineStepMapping: 7, sortOrder: 67 },
  { stepId: "b_okrs", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 68, label: "Define 90-day OKRs", description: "Set 3+ objectives with measurable key results for the next quarter.", completionType: "manual", nineStepMapping: 7, sortOrder: 68 },
  { stepId: "b_financial_projections", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 69, label: "Create financial projections (12-month)", description: "Build a financial model projecting revenue, costs, and cash flow for 12 months.", completionType: "manual", nineStepMapping: 7, sortOrder: 69 },
  { stepId: "b_hiring_plan", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 70, label: "Define team hiring plan", description: "Map the roles you need to hire, when, and the budget for each.", completionType: "manual", nineStepMapping: 7, sortOrder: 70 },
  { stepId: "b_advisory_targets", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 71, label: "Identify advisory board targets", description: "List 3+ potential advisors who could strengthen your venture.", completionType: "manual", sortOrder: 71 },
  { stepId: "b_legal_checklist", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 72, label: "Create legal checklist", description: "Document entity formation, IP protection, and contract needs.", completionType: "manual", sortOrder: 72 },
  { stepId: "b_brand_identity", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 73, label: "Define brand identity basics", description: "Establish your name, logo, colors, and brand voice.", completionType: "manual", nineStepMapping: 6, sortOrder: 73 },
  { stepId: "b_content_strategy", stage: "build", groupKey: "strategy_planning", groupLabel: "Strategy & Planning", stepNumber: 74, label: "Create content strategy outline", description: "Plan 3+ content channels and themes for building awareness.", completionType: "manual", nineStepMapping: 6, sortOrder: 74 },

  // Group 3.3: Investor Materials
  { stepId: "b_pitch_deck_v1", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 75, label: "Upload or create pitch deck (v1)", description: "Create your first investor pitch deck and upload it for review.", completionType: "pitch_deck_uploaded", sortOrder: 75 },
  { stepId: "b_deck_review", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 76, label: "Get FRED pitch deck review", description: "Submit your deck for AI-powered review and get a detailed scorecard.", completionType: "manual", sortOrder: 76 },
  { stepId: "b_exec_summary", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 77, label: "Write executive summary (1-page)", description: "Create a one-page executive summary of your venture for investors.", completionType: "manual", sortOrder: 77 },
  { stepId: "b_financial_model", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 78, label: "Create financial model", description: "Build a detailed financial model with revenue projections and assumptions.", completionType: "manual", sortOrder: 78 },
  { stepId: "b_use_of_funds", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 79, label: "Prepare use-of-funds breakdown", description: "Define how you will allocate raised capital across categories.", completionType: "manual", sortOrder: 79 },
  { stepId: "b_funding_ask", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 80, label: "Define funding ask and terms", description: "State your raise amount, instrument type, and key terms.", completionType: "manual", sortOrder: 80 },
  { stepId: "b_investor_faq", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 81, label: "Draft investor FAQ (10+ questions)", description: "Prepare answers to the 10+ most common investor questions.", completionType: "manual", sortOrder: 81 },
  { stepId: "b_irs_baseline", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 82, label: "Complete investor readiness assessment", description: "Get your first investor readiness score to establish a baseline.", completionType: "investor_readiness_scored", sortOrder: 82 },
  { stepId: "b_investor_targets", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 83, label: "Identify initial investor targets (10+)", description: "Research and list 10+ investors aligned with your stage and sector.", completionType: "manual", sortOrder: 83 },
  { stepId: "b_stage_review", stage: "build", groupKey: "investor_materials", groupLabel: "Investor Materials", stepNumber: 84, label: "Build stage review with FRED", description: "Complete a stage review conversation with FRED before advancing to Launch.", completionType: "chat_sessions", completionThreshold: 10, sortOrder: 84 },

  // STAGE 4: LAUNCH (Steps 85-108)
  // Group 4.1: Go-To-Market Execution
  { stepId: "l_launch_strategy", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 85, label: "Define launch strategy", description: "Document your complete go-to-market plan including channels, timing, and tactics.", completionType: "manual", nineStepMapping: 6, sortOrder: 85 },
  { stepId: "l_landing_page", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 86, label: "Create landing page/website", description: "Have a live, professional landing page that converts visitors to users.", completionType: "manual", nineStepMapping: 6, sortOrder: 86 },
  { stepId: "l_crm_setup", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 87, label: "Set up CRM/lead tracking", description: "Implement a system to track leads, conversations, and pipeline.", completionType: "manual", nineStepMapping: 7, sortOrder: 87 },
  { stepId: "l_marketing_channels", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 88, label: "Define marketing channels (top 3)", description: "Prioritize your top 3 marketing channels based on where your customers are.", completionType: "manual", nineStepMapping: 6, sortOrder: 88 },
  { stepId: "l_marketing_content", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 89, label: "Create initial marketing content", description: "Produce at least 5 pieces of content (posts, emails, ads, articles).", completionType: "manual", nineStepMapping: 6, sortOrder: 89 },
  { stepId: "l_first_10_users", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 90, label: "Launch to first 10 beta users", description: "Onboard your first 10 real users and get them using the product.", completionType: "metric_threshold", completionField: "active_users", completionThreshold: 10, nineStepMapping: 8, sortOrder: 90 },
  { stepId: "l_beta_feedback", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 91, label: "Collect beta user feedback", description: "Gather structured feedback from at least 5 beta users.", completionType: "manual", nineStepMapping: 8, sortOrder: 91 },
  { stepId: "l_iterate_product", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 92, label: "Iterate on product based on feedback", description: "Ship at least 3 improvements based on real user feedback.", completionType: "manual", nineStepMapping: 8, sortOrder: 92 },
  { stepId: "l_first_customer", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 93, label: "Achieve first paying customer", description: "Get your first customer to pay for your product or service.", completionType: "manual", nineStepMapping: 8, sortOrder: 93 },
  { stepId: "l_success_playbook", stage: "launch", groupKey: "gtm_execution", groupLabel: "Go-To-Market Execution", stepNumber: 94, label: "Define customer success playbook", description: "Document onboarding, support, and retention processes for customers.", completionType: "manual", nineStepMapping: 7, sortOrder: 94 },

  // Group 4.2: Traction Building
  { stepId: "l_25_users", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 95, label: "Reach 25 active users", description: "Grow your active user base to at least 25 people.", completionType: "metric_threshold", completionField: "active_users", completionThreshold: 25, nineStepMapping: 8, sortOrder: 95 },
  { stepId: "l_retention", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 96, label: "Achieve 40%+ weekly retention", description: "Demonstrate that users are coming back with at least 40% weekly retention.", completionType: "metric_threshold", completionField: "weekly_retention", completionThreshold: 40, nineStepMapping: 8, sortOrder: 96 },
  { stepId: "l_testimonials", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 97, label: "Collect 5+ testimonials", description: "Get written or video testimonials from at least 5 satisfied users.", completionType: "manual", nineStepMapping: 8, sortOrder: 97 },
  { stepId: "l_case_studies", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 98, label: "Generate 3+ case studies", description: "Document 3+ detailed stories of how customers benefit from your product.", completionType: "manual", nineStepMapping: 8, sortOrder: 98 },
  { stepId: "l_funnel_optimization", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 99, label: "Optimize conversion funnel", description: "Analyze and improve your signup-to-activation conversion rates.", completionType: "manual", nineStepMapping: 8, sortOrder: 99 },
  { stepId: "l_repeatable_channel", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 100, label: "Establish repeatable acquisition channel", description: "Prove at least one channel delivers customers at a predictable cost.", completionType: "manual", nineStepMapping: 9, sortOrder: 100 },
  { stepId: "l_weekly_reporting", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 101, label: "Track and report key metrics weekly", description: "Complete at least 4 weekly metric reports tracking growth and retention.", completionType: "manual", nineStepMapping: 7, sortOrder: 101 },
  { stepId: "l_1k_mrr", stage: "launch", groupKey: "traction_building", groupLabel: "Traction Building", stepNumber: 102, label: "Reach $1K MRR or equivalent milestone", description: "Achieve $1,000 in monthly recurring revenue or an equivalent traction metric.", completionType: "metric_threshold", completionField: "mrr", completionThreshold: 1000, nineStepMapping: 8, sortOrder: 102 },

  // Group 4.3: Fundraise Preparation
  { stepId: "l_irs_70", stage: "launch", groupKey: "fundraise_prep", groupLabel: "Fundraise Preparation", stepNumber: 103, label: "Achieve investor readiness score >= 70", description: "Improve your investor readiness score to at least 70 out of 100.", completionType: "investor_readiness_scored", completionThreshold: 70, sortOrder: 103 },
  { stepId: "l_deck_60", stage: "launch", groupKey: "fundraise_prep", groupLabel: "Fundraise Preparation", stepNumber: 104, label: "Refine pitch deck to score >= 60", description: "Iterate on your pitch deck until it scores at least 60 in FRED review.", completionType: "pitch_deck_uploaded", completionThreshold: 60, sortOrder: 104 },
  { stepId: "l_pitch_practice", stage: "launch", groupKey: "fundraise_prep", groupLabel: "Fundraise Preparation", stepNumber: 105, label: "Practice pitch delivery (3+ sessions)", description: "Record or log at least 3 pitch practice sessions with feedback.", completionType: "manual", sortOrder: 105 },
  { stepId: "l_investor_list", stage: "launch", groupKey: "fundraise_prep", groupLabel: "Fundraise Preparation", stepNumber: 106, label: "Build investor target list (25+)", description: "Research and compile a qualified list of 25+ target investors.", completionType: "manual", sortOrder: 106 },
  { stepId: "l_data_room", stage: "launch", groupKey: "fundraise_prep", groupLabel: "Fundraise Preparation", stepNumber: 107, label: "Prepare due diligence data room", description: "Organize all key documents investors will request during due diligence.", completionType: "manual", sortOrder: 107 },
  { stepId: "l_stage_review", stage: "launch", groupKey: "fundraise_prep", groupLabel: "Fundraise Preparation", stepNumber: 108, label: "Launch stage review with FRED", description: "Complete a stage review conversation with FRED before advancing to Grow.", completionType: "chat_sessions", completionThreshold: 15, sortOrder: 108 },

  // STAGE 5: GROW (Steps 109-120)
  // Group 5.1: Scale Operations
  { stepId: "g_all_stages_complete", stage: "grow", groupKey: "scale_operations", groupLabel: "Scale Operations", stepNumber: 109, label: "Complete all prior Oases stages", description: "Finish every step in Clarity, Validation, Build, and Launch.", completionType: "manual", nineStepMapping: 9, sortOrder: 109 },
  { stepId: "g_pmf_signals", stage: "grow", groupKey: "scale_operations", groupLabel: "Scale Operations", stepNumber: 110, label: "Achieve product-market fit signals", description: "Demonstrate PMF through retention, NPS, or organic growth metrics.", completionType: "manual", nineStepMapping: 9, sortOrder: 110 },
  { stepId: "g_first_hire", stage: "grow", groupKey: "scale_operations", groupLabel: "Scale Operations", stepNumber: 111, label: "Hire first key team member", description: "Successfully recruit and onboard your first key hire.", completionType: "manual", nineStepMapping: 9, sortOrder: 111 },
  { stepId: "g_scalable_processes", stage: "grow", groupKey: "scale_operations", groupLabel: "Scale Operations", stepNumber: 112, label: "Implement scalable processes", description: "Document and implement 3+ processes that can scale with growth.", completionType: "manual", nineStepMapping: 9, sortOrder: 112 },
  { stepId: "g_board_meetings", stage: "grow", groupKey: "scale_operations", groupLabel: "Scale Operations", stepNumber: 113, label: "Set up board/advisory meetings", description: "Establish a regular cadence for board or advisory check-ins.", completionType: "manual", sortOrder: 113 },
  { stepId: "g_scaling_dashboard", stage: "grow", groupKey: "scale_operations", groupLabel: "Scale Operations", stepNumber: 114, label: "Define scaling metrics and dashboards", description: "Create a dashboard tracking 5+ KPIs critical for growth decisions.", completionType: "manual", nineStepMapping: 9, sortOrder: 114 },

  // Group 5.2: Fundraise & Network
  { stepId: "g_fund_matching", stage: "grow", groupKey: "fundraise_network", groupLabel: "Fundraise & Network", stepNumber: 115, label: "Prepare for fund matching", description: "Complete your Boardy profile and preferences for investor matching.", completionType: "boardy_ready", sortOrder: 115 },
  { stepId: "g_investor_outreach", stage: "grow", groupKey: "fundraise_network", groupLabel: "Fundraise & Network", stepNumber: 116, label: "Complete investor outreach (10+ intros)", description: "Make at least 10 warm introductions to qualified investors.", completionType: "manual", sortOrder: 116 },
  { stepId: "g_investor_meetings", stage: "grow", groupKey: "fundraise_network", groupLabel: "Fundraise & Network", stepNumber: 117, label: "Conduct investor meetings (5+)", description: "Complete at least 5 investor meetings with substantive discussions.", completionType: "manual", sortOrder: 117 },
  { stepId: "g_close_funding", stage: "grow", groupKey: "fundraise_network", groupLabel: "Fundraise & Network", stepNumber: 118, label: "Negotiate and close funding round", description: "Receive a term sheet or funding commitment from an investor.", completionType: "manual", sortOrder: 118 },

  // Group 5.3: Growth Optimization
  { stepId: "g_10k_mrr", stage: "grow", groupKey: "growth_optimization", groupLabel: "Growth Optimization", stepNumber: 119, label: "Reach $10K MRR or Series A metrics", description: "Achieve $10K MRR or meet the traction benchmarks expected for your next raise.", completionType: "metric_threshold", completionField: "mrr", completionThreshold: 10000, nineStepMapping: 9, sortOrder: 119 },
  { stepId: "g_graduate", stage: "grow", groupKey: "growth_optimization", groupLabel: "Growth Optimization", stepNumber: 120, label: "Graduate from Sahara program", description: "Complete the full 120-step journey with a final review and celebration.", completionType: "manual", nineStepMapping: 9, sortOrder: 120 },
]

// ============================================================================
// Helpers
// ============================================================================

/** Get all steps for a given Oases stage */
export function getStepsForStage(stage: OasesStage): JourneyStep[] {
  return JOURNEY_STEPS.filter((s) => s.stage === stage)
}

/** Get steps grouped by their group_key within a stage */
export function getGroupedStepsForStage(stage: OasesStage): JourneyStepGroup[] {
  const steps = getStepsForStage(stage)
  const groups: Map<string, JourneyStepGroup> = new Map()

  for (const step of steps) {
    if (!groups.has(step.groupKey)) {
      groups.set(step.groupKey, {
        key: step.groupKey,
        label: step.groupLabel,
        stage,
        steps: [],
      })
    }
    groups.get(step.groupKey)!.steps.push(step)
  }

  return Array.from(groups.values())
}

/** Get a single step by its ID */
export function getStepById(stepId: string): JourneyStep | undefined {
  return JOURNEY_STEPS.find((s) => s.stepId === stepId)
}

/** Total number of steps in the journey */
export const TOTAL_JOURNEY_STEPS = JOURNEY_STEPS.length

/** Number of steps per stage */
export const STEPS_PER_STAGE: Record<OasesStage, number> = {
  clarity: JOURNEY_STEPS.filter((s) => s.stage === "clarity").length,
  validation: JOURNEY_STEPS.filter((s) => s.stage === "validation").length,
  build: JOURNEY_STEPS.filter((s) => s.stage === "build").length,
  launch: JOURNEY_STEPS.filter((s) => s.stage === "launch").length,
  grow: JOURNEY_STEPS.filter((s) => s.stage === "grow").length,
}
