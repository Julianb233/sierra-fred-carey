/**
 * Strategy Template Registry
 * Maps document types to their template definitions.
 */

import type { StrategyTemplate, StrategyDocType } from '../types';
import { executiveSummaryTemplate } from './executive-summary';
import { marketAnalysisTemplate } from './market-analysis';
import { plan306090Template } from './30-60-90-plan';
import { competitiveAnalysisTemplate } from './competitive-analysis';
import { gtmPlanTemplate } from './gtm-plan';

export const TEMPLATES: Record<StrategyDocType, StrategyTemplate> = {
  executive_summary: executiveSummaryTemplate,
  market_analysis: marketAnalysisTemplate,
  '30_60_90_plan': plan306090Template,
  competitive_analysis: competitiveAnalysisTemplate,
  gtm_plan: gtmPlanTemplate,
};

export function getTemplate(type: StrategyDocType): StrategyTemplate {
  const template = TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown document type: ${type}`);
  }
  return template;
}
