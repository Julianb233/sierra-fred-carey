// Database schema types for subscriptions
// In production, implement with your database (Supabase, Postgres, etc.)

export interface UserSubscription {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  trialStart: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeEvent {
  id: string;
  type: string;
  stripeEventId: string;
  stripeCustomerId: string | null;
  status: "processed" | "pending" | "failed";
  payload: Record<string, unknown>;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

// IMPLEMENTATION GUIDE:
// 1. Replace these types with your database client
// 2. Create tables:
//
//    CREATE TABLE user_subscriptions (
//      user_id TEXT PRIMARY KEY,
//      stripe_customer_id TEXT NOT NULL UNIQUE,
//      stripe_subscription_id TEXT,
//      stripe_price_id TEXT NOT NULL,
//      status TEXT NOT NULL,
//      current_period_start TIMESTAMP NOT NULL,
//      current_period_end TIMESTAMP NOT NULL,
//      canceled_at TIMESTAMP,
//      cancel_at_period_end BOOLEAN DEFAULT FALSE,
//      trial_start TIMESTAMP,
//      trial_end TIMESTAMP,
//      created_at TIMESTAMP DEFAULT NOW(),
//      updated_at TIMESTAMP DEFAULT NOW()
//    );
//
//    CREATE TABLE stripe_events (
//      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//      stripe_event_id TEXT NOT NULL UNIQUE,
//      stripe_customer_id TEXT,
//      type TEXT NOT NULL,
//      status TEXT NOT NULL,
//      payload JSONB NOT NULL,
//      error TEXT,
//      created_at TIMESTAMP DEFAULT NOW(),
//      processed_at TIMESTAMP
//    );
//
// 3. Create functions to interact with these tables

// Example placeholder functions (implement with your DB)
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  // TODO: Implement
  throw new Error("Not implemented");
}

export async function createOrUpdateSubscription(
  subscription: Partial<UserSubscription>
): Promise<UserSubscription> {
  // TODO: Implement
  throw new Error("Not implemented");
}

export async function recordStripeEvent(
  event: Partial<StripeEvent>
): Promise<StripeEvent> {
  // TODO: Implement
  throw new Error("Not implemented");
}

export async function getStripeEventById(id: string): Promise<StripeEvent | null> {
  // TODO: Implement
  throw new Error("Not implemented");
}

export async function markEventAsProcessed(id: string): Promise<void> {
  // TODO: Implement
  throw new Error("Not implemented");
}