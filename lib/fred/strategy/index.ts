/**
 * Strategy Document Module
 * Phase 03: Pro Tier Features
 */

// Types
export * from './types';

// Templates
export { TEMPLATES, getTemplate } from './templates';

// Generator
export { generateDocument, generateSection } from './generator';

// Database
export {
  saveStrategyDocument,
  getStrategyDocuments,
  getStrategyDocumentById,
  updateStrategyDocument,
  deleteStrategyDocument,
} from './db';
