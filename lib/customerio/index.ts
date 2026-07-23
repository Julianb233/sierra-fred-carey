/**
 * Customer.io integration — public surface.
 *
 * AI-13316: Sahara member lifecycle email on saharamembers.com.
 *
 * Server-side only. Import from '@/lib/customerio'.
 */

export {
  getCustomerIoConfig,
  isCustomerIoConfigured,
  type CustomerIoConfig,
} from './client';

export {
  CUSTOMERIO_EVENTS,
  CUSTOMERIO_EVENT_NAMES,
  isCustomerIoEvent,
  SUPPRESSION_STATE,
  type CustomerIoEventName,
  type SuppressionState,
} from './events';

export {
  identifyMember,
  trackMemberEvent,
  suppressMember,
  unsuppressMember,
  setMemberSuppression,
} from './track';

export {
  buildMemberAttributes,
  syncMemberLifecycle,
  type MemberLifecycleInput,
  type MemberLifecycleSyncResult,
} from './member-lifecycle';

export type {
  CustomerIoRegion,
  CustomerIoResult,
  MemberAttributes,
  MemberId,
} from './types';
