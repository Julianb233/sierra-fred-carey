-- FRED Procedural Memory Seed Data
-- Phase 01-01: Default decision frameworks and analysis patterns
-- Created: 2026-02-05

-- ============================================================================
-- 7-Factor Scoring Framework
-- The core decision scoring model based on Fred Cary's methodology
-- ============================================================================

INSERT INTO fred_procedural_memory (
  name,
  description,
  procedure_type,
  steps,
  triggers,
  input_schema,
  output_schema,
  success_rate,
  is_active
) VALUES (
  'seven_factor_scoring',
  'Score decisions using Fred Cary''s 7-factor model: strategic alignment, leverage, speed, revenue, time, risk, relationships',
  'scoring_model',
  '[
    {
      "step": 1,
      "name": "strategic_alignment",
      "description": "Evaluate how well this decision aligns with long-term vision and mission",
      "weight": 0.20,
      "scale": "1-10",
      "criteria": [
        "Does it move toward the stated vision?",
        "Is it consistent with core values?",
        "Does it support the primary business model?"
      ]
    },
    {
      "step": 2,
      "name": "leverage",
      "description": "Assess the multiplier effect - how much output per unit of input",
      "weight": 0.15,
      "scale": "1-10",
      "criteria": [
        "Can this be repeated or scaled?",
        "Does it create compounding returns?",
        "Will it open doors to other opportunities?"
      ]
    },
    {
      "step": 3,
      "name": "speed",
      "description": "Evaluate execution velocity and time to results",
      "weight": 0.15,
      "scale": "1-10",
      "criteria": [
        "How quickly can we see initial results?",
        "What is the feedback loop time?",
        "Does this accelerate or slow our trajectory?"
      ]
    },
    {
      "step": 4,
      "name": "revenue_impact",
      "description": "Assess direct and indirect revenue implications",
      "weight": 0.15,
      "scale": "1-10",
      "criteria": [
        "What is the potential revenue impact?",
        "How certain is the revenue outcome?",
        "What is the revenue timeline?"
      ]
    },
    {
      "step": 5,
      "name": "time_cost",
      "description": "Evaluate the time investment required vs available capacity",
      "weight": 0.10,
      "scale": "1-10 (inverted - higher is less time)",
      "criteria": [
        "What founder/team time is required?",
        "Is this the best use of that time?",
        "What is the opportunity cost?"
      ]
    },
    {
      "step": 6,
      "name": "risk_assessment",
      "description": "Evaluate downside exposure and reversibility",
      "weight": 0.15,
      "scale": "1-10 (inverted - higher is lower risk)",
      "criteria": [
        "What is the worst-case scenario?",
        "Is this decision reversible?",
        "What are we risking (money, reputation, relationships)?"
      ]
    },
    {
      "step": 7,
      "name": "relationship_impact",
      "description": "Assess effect on key stakeholder relationships",
      "weight": 0.10,
      "scale": "1-10",
      "criteria": [
        "How does this affect investor relationships?",
        "Impact on team morale and trust?",
        "Customer relationship implications?"
      ]
    }
  ]'::jsonb,
  '{"context": ["decision_required", "strategy_question", "resource_allocation"]}'::jsonb,
  '{
    "decision_description": "string",
    "context": "object",
    "alternatives": "array"
  }'::jsonb,
  '{
    "total_score": "number (0-100)",
    "factor_scores": "object",
    "confidence": "number (0-1)",
    "recommendation": "string",
    "reasoning": "string"
  }'::jsonb,
  0.5,
  true
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  steps = EXCLUDED.steps,
  triggers = EXCLUDED.triggers,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = now();

-- ============================================================================
-- Reality Lens Assessment
-- 5-factor startup viability assessment
-- ============================================================================

INSERT INTO fred_procedural_memory (
  name,
  description,
  procedure_type,
  steps,
  triggers,
  input_schema,
  output_schema,
  success_rate,
  is_active
) VALUES (
  'reality_lens_assessment',
  'Assess startup viability using 5 key factors: feasibility, economics, demand, distribution, timing',
  'assessment_rubric',
  '[
    {
      "step": 1,
      "name": "feasibility",
      "description": "Can you actually build and deliver this?",
      "weight": 0.20,
      "questions": [
        "Do you have the technical capability?",
        "What resources are required vs available?",
        "What are the key technical risks?",
        "Is the scope realistic for your stage?"
      ],
      "scoring": {
        "1-3": "Major feasibility concerns - significant pivots needed",
        "4-6": "Moderate challenges - addressable with focus",
        "7-10": "Strong feasibility - clear path to execution"
      }
    },
    {
      "step": 2,
      "name": "economics",
      "description": "Do the numbers work?",
      "weight": 0.25,
      "questions": [
        "What is the unit economics (CAC, LTV)?",
        "What margins can you achieve at scale?",
        "What is the path to profitability?",
        "How much capital is required?"
      ],
      "scoring": {
        "1-3": "Economics don''t work - fundamental model issues",
        "4-6": "Economics unclear - more validation needed",
        "7-10": "Strong unit economics - clear path to profitability"
      }
    },
    {
      "step": 3,
      "name": "demand",
      "description": "Do people actually want this?",
      "weight": 0.25,
      "questions": [
        "What evidence of demand do you have?",
        "How painful is the problem you solve?",
        "How are customers solving this today?",
        "Will they pay for your solution?"
      ],
      "scoring": {
        "1-3": "Weak demand signals - may be solution in search of problem",
        "4-6": "Some demand indicators - needs more validation",
        "7-10": "Strong pull - clear evidence customers want this"
      }
    },
    {
      "step": 4,
      "name": "distribution",
      "description": "Can you reach your customers?",
      "weight": 0.20,
      "questions": [
        "What is your go-to-market strategy?",
        "Do you have unfair distribution advantages?",
        "What is your customer acquisition cost?",
        "Can you reach customers profitably?"
      ],
      "scoring": {
        "1-3": "No clear distribution - major GTM risk",
        "4-6": "Distribution possible but competitive",
        "7-10": "Strong distribution advantage or clear path"
      }
    },
    {
      "step": 5,
      "name": "timing",
      "description": "Is now the right time?",
      "weight": 0.10,
      "questions": [
        "Why is now the right time for this?",
        "What has changed to enable this?",
        "Are you too early or too late?",
        "What market tailwinds support you?"
      ],
      "scoring": {
        "1-3": "Poor timing - market not ready or too late",
        "4-6": "Timing neutral - no major advantages or disadvantages",
        "7-10": "Excellent timing - clear market momentum"
      }
    }
  ]'::jsonb,
  '{"context": ["startup_assessment", "idea_validation", "pivot_consideration"]}'::jsonb,
  '{
    "startup_description": "string",
    "stage": "string (idea/mvp/growth/scale)",
    "market": "string",
    "current_metrics": "object"
  }'::jsonb,
  '{
    "overall_score": "number (0-100)",
    "factor_scores": "object",
    "strengths": "array",
    "concerns": "array",
    "recommendations": "array",
    "next_steps": "array"
  }'::jsonb,
  0.5,
  true
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  steps = EXCLUDED.steps,
  triggers = EXCLUDED.triggers,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = now();

-- ============================================================================
-- Investor Readiness Assessment
-- Evaluate preparedness for fundraising
-- ============================================================================

INSERT INTO fred_procedural_memory (
  name,
  description,
  procedure_type,
  steps,
  triggers,
  input_schema,
  output_schema,
  success_rate,
  is_active
) VALUES (
  'investor_readiness_assessment',
  'Evaluate startup''s readiness for investor conversations and fundraising',
  'assessment_rubric',
  '[
    {
      "step": 1,
      "name": "story_clarity",
      "description": "Is the narrative compelling and clear?",
      "weight": 0.15,
      "checks": [
        "Can you explain what you do in one sentence?",
        "Is the problem statement clear and urgent?",
        "Is the solution differentiated?",
        "Is the vision inspiring but achievable?"
      ]
    },
    {
      "step": 2,
      "name": "market_understanding",
      "description": "Do you deeply understand your market?",
      "weight": 0.15,
      "checks": [
        "What is the TAM/SAM/SOM?",
        "Who are the key competitors?",
        "What are the market trends?",
        "Why will you win?"
      ]
    },
    {
      "step": 3,
      "name": "traction_evidence",
      "description": "Do you have proof points?",
      "weight": 0.25,
      "checks": [
        "What metrics demonstrate progress?",
        "Do you have paying customers?",
        "What is your growth rate?",
        "Any notable partnerships or pilots?"
      ]
    },
    {
      "step": 4,
      "name": "team_credibility",
      "description": "Is the team fundable?",
      "weight": 0.15,
      "checks": [
        "Does the team have relevant experience?",
        "What unique insights does the team have?",
        "Is the team complete for this stage?",
        "Have founders worked together before?"
      ]
    },
    {
      "step": 5,
      "name": "financial_clarity",
      "description": "Are the financials solid?",
      "weight": 0.15,
      "checks": [
        "Do you have a clear financial model?",
        "What are your key assumptions?",
        "How will you use the funds?",
        "What runway do you need?"
      ]
    },
    {
      "step": 6,
      "name": "materials_quality",
      "description": "Are your materials investor-ready?",
      "weight": 0.15,
      "checks": [
        "Is your deck polished and professional?",
        "Do you have a data room prepared?",
        "Are your documents organized?",
        "Is your cap table clean?"
      ]
    }
  ]'::jsonb,
  '{"context": ["fundraising", "investor_meeting", "pitch_prep"]}'::jsonb,
  '{
    "startup_info": "object",
    "target_raise": "number",
    "stage": "string",
    "materials_provided": "array"
  }'::jsonb,
  '{
    "readiness_score": "number (0-100)",
    "category_scores": "object",
    "gaps": "array",
    "strengths": "array",
    "priority_actions": "array",
    "estimated_prep_time": "string"
  }'::jsonb,
  0.5,
  true
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  steps = EXCLUDED.steps,
  triggers = EXCLUDED.triggers,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = now();

-- ============================================================================
-- FRED Analysis Framework
-- Core intake → validation → mental models → synthesis flow
-- ============================================================================

INSERT INTO fred_procedural_memory (
  name,
  description,
  procedure_type,
  steps,
  triggers,
  input_schema,
  output_schema,
  success_rate,
  is_active
) VALUES (
  'analysis_framework',
  'FRED''s core analysis flow: intake information, validate assumptions, apply mental models, synthesize recommendation',
  'analysis_pattern',
  '[
    {
      "step": 1,
      "name": "intake",
      "description": "Gather and structure the input information",
      "actions": [
        "Identify the core question or decision",
        "Extract relevant facts and context",
        "Note any assumptions being made",
        "Identify what information is missing"
      ],
      "output": "structured_input"
    },
    {
      "step": 2,
      "name": "validation",
      "description": "Validate assumptions and check for blind spots",
      "actions": [
        "Challenge stated assumptions",
        "Look for contradictions",
        "Identify cognitive biases at play",
        "Assess confidence in key facts"
      ],
      "output": "validated_facts"
    },
    {
      "step": 3,
      "name": "mental_models",
      "description": "Apply relevant mental models and frameworks",
      "actions": [
        "Select appropriate frameworks for this problem type",
        "Apply 7-factor scoring if decision-related",
        "Use Reality Lens if viability question",
        "Consider second-order effects"
      ],
      "output": "analyzed_situation"
    },
    {
      "step": 4,
      "name": "synthesis",
      "description": "Synthesize insights into actionable recommendation",
      "actions": [
        "Summarize key findings",
        "State clear recommendation",
        "Explain reasoning chain",
        "Identify risks and mitigations",
        "Provide specific next steps"
      ],
      "output": "final_recommendation"
    }
  ]'::jsonb,
  '{"context": ["any_query", "analysis_needed"]}'::jsonb,
  '{
    "query": "string",
    "context": "object",
    "user_facts": "object"
  }'::jsonb,
  '{
    "analysis": "object",
    "recommendation": "string",
    "confidence": "number",
    "reasoning": "string",
    "next_steps": "array",
    "follow_up_questions": "array"
  }'::jsonb,
  0.5,
  true
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  steps = EXCLUDED.steps,
  triggers = EXCLUDED.triggers,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = now();

-- ============================================================================
-- Auto-Decide vs Escalate Framework
-- Determine when FRED can decide autonomously vs needs human input
-- ============================================================================

INSERT INTO fred_procedural_memory (
  name,
  description,
  procedure_type,
  steps,
  triggers,
  input_schema,
  output_schema,
  success_rate,
  is_active
) VALUES (
  'auto_decide_framework',
  'Determine whether FRED should auto-decide or escalate to human decision-maker',
  'decision_framework',
  '[
    {
      "step": 1,
      "name": "assess_reversibility",
      "description": "How reversible is this decision?",
      "criteria": {
        "fully_reversible": "Auto-decide allowed",
        "partially_reversible": "Consider escalation",
        "irreversible": "Must escalate"
      }
    },
    {
      "step": 2,
      "name": "assess_impact",
      "description": "What is the potential impact?",
      "criteria": {
        "low_impact": "Auto-decide allowed (< $1000, < 1 week)",
        "medium_impact": "Consider confidence level",
        "high_impact": "Must escalate (> $10000, > 1 month, reputation)"
      }
    },
    {
      "step": 3,
      "name": "assess_confidence",
      "description": "How confident is FRED in the recommendation?",
      "criteria": {
        "high_confidence": "> 0.85 - can auto-decide if reversible/low-impact",
        "medium_confidence": "0.65-0.85 - provide recommendation, ask for approval",
        "low_confidence": "< 0.65 - must escalate with options"
      }
    },
    {
      "step": 4,
      "name": "check_precedent",
      "description": "Has user decided similar before?",
      "criteria": {
        "clear_precedent": "Follow past pattern, note it",
        "no_precedent": "Escalate for preference learning"
      }
    },
    {
      "step": 5,
      "name": "final_determination",
      "description": "Make the call",
      "outcomes": {
        "auto_decide": "Execute the decision, log it, notify user",
        "recommend": "Present recommendation with reasoning, ask for approval",
        "escalate": "Present options with analysis, require human decision"
      }
    }
  ]'::jsonb,
  '{"context": ["decision_point", "action_required"]}'::jsonb,
  '{
    "decision": "object",
    "confidence": "number",
    "impact_assessment": "object",
    "user_preferences": "object"
  }'::jsonb,
  '{
    "action": "string (auto_decide|recommend|escalate)",
    "reasoning": "string",
    "decision_if_auto": "object",
    "options_if_escalate": "array"
  }'::jsonb,
  0.5,
  true
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  steps = EXCLUDED.steps,
  triggers = EXCLUDED.triggers,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = now();

-- ============================================================================
-- Pitch Deck Review Framework
-- Systematic analysis of pitch deck slides
-- ============================================================================

INSERT INTO fred_procedural_memory (
  name,
  description,
  procedure_type,
  steps,
  triggers,
  input_schema,
  output_schema,
  success_rate,
  is_active
) VALUES (
  'pitch_deck_review',
  'Systematic review of pitch deck with slide-by-slide analysis and objection identification',
  'analysis_pattern',
  '[
    {
      "step": 1,
      "name": "structure_check",
      "description": "Verify deck has essential slides",
      "required_slides": [
        "Problem",
        "Solution",
        "Market",
        "Business Model",
        "Traction",
        "Team",
        "Ask"
      ]
    },
    {
      "step": 2,
      "name": "slide_analysis",
      "description": "Analyze each slide for effectiveness",
      "criteria": {
        "clarity": "Is the message clear?",
        "evidence": "Are claims supported?",
        "design": "Is it visually effective?",
        "flow": "Does it connect to other slides?"
      }
    },
    {
      "step": 3,
      "name": "objection_identification",
      "description": "Identify likely investor objections",
      "categories": [
        "Market size concerns",
        "Competition concerns",
        "Team gaps",
        "Unit economics questions",
        "Defensibility questions",
        "Timeline concerns"
      ]
    },
    {
      "step": 4,
      "name": "scoring",
      "description": "Score overall deck effectiveness",
      "factors": [
        "Story clarity (0-20)",
        "Evidence quality (0-20)",
        "Design quality (0-20)",
        "Completeness (0-20)",
        "Differentiation (0-20)"
      ]
    },
    {
      "step": 5,
      "name": "recommendations",
      "description": "Provide specific improvement recommendations",
      "priority_levels": [
        "Critical - must fix before sending",
        "Important - significantly improves deck",
        "Nice to have - would polish the presentation"
      ]
    }
  ]'::jsonb,
  '{"context": ["pitch_deck_upload", "deck_review_request"]}'::jsonb,
  '{
    "slides": "array of slide content",
    "stage": "string",
    "target_investors": "string"
  }'::jsonb,
  '{
    "overall_score": "number (0-100)",
    "slide_scores": "object",
    "objections": "array",
    "critical_fixes": "array",
    "improvements": "array",
    "rewrite_suggestions": "object"
  }'::jsonb,
  0.5,
  true
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  steps = EXCLUDED.steps,
  triggers = EXCLUDED.triggers,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = now();
