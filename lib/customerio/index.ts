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
  LIFECYCLE_CONSENT,
  type CustomerIoEventName,
  type LifecycleConsent,
  type LifecycleEventContext,
  type SuppressionState,
} from './events';

export {
  identifyMember,
  trackMemberEvent,
  trackLifecycleEvent,
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

export {
  identifyCanonicalMember,
  trackCanonicalLifecycleEvent,
  type CanonicalMemberOverrides,
} from './canonical-profile';

export type {
  CustomerIoRegion,
  CustomerIoResult,
  MemberAttributes,
  MemberId,
} from './types';
