// Database schema types for subscriptions
// Implemented with Supabase

import { createServiceClient } from "@/lib/supabase/server";

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

// Supabase database functions
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    status: data.status,
    currentPeriodStart: new Date(data.current_period_start),
    currentPeriodEnd: new Date(data.current_period_end),
    canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialStart: data.trial_start ? new Date(data.trial_start) : null,
    trialEnd: data.trial_end ? new Date(data.trial_end) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function createOrUpdateSubscription(
  subscription: Partial<UserSubscription>
): Promise<UserSubscription> {
  const supabase = createServiceClient();

  const dbData = {
    user_id: subscription.userId,
    stripe_customer_id: subscription.stripeCustomerId,
    stripe_subscription_id: subscription.stripeSubscriptionId,
    stripe_price_id: subscription.stripePriceId,
    status: subscription.status,
    current_period_start: subscription.currentPeriodStart?.toISOString(),
    current_period_end: subscription.currentPeriodEnd?.toISOString(),
    canceled_at: subscription.canceledAt?.toISOString(),
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    trial_start: subscription.trialStart?.toISOString(),
    trial_end: subscription.trialEnd?.toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Remove undefined values
  const cleanData = Object.fromEntries(
    Object.entries(dbData).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from("user_subscriptions")
    .upsert(cleanData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);

  return {
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    status: data.status,
    currentPeriodStart: new Date(data.current_period_start),
    currentPeriodEnd: new Date(data.current_period_end),
    canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialStart: data.trial_start ? new Date(data.trial_start) : null,
    trialEnd: data.trial_end ? new Date(data.trial_end) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function recordStripeEvent(
  event: Partial<StripeEvent>
): Promise<StripeEvent> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("stripe_events")
    .insert({
      stripe_event_id: event.stripeEventId,
      stripe_customer_id: event.stripeCustomerId,
      type: event.type,
      status: event.status || "pending",
      payload: event.payload,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record event: ${error.message}`);

  return {
    id: data.id,
    stripeEventId: data.stripe_event_id,
    stripeCustomerId: data.stripe_customer_id,
    type: data.type,
    status: data.status,
    payload: data.payload,
    error: data.error,
    createdAt: new Date(data.created_at),
    processedAt: data.processed_at ? new Date(data.processed_at) : null,
  };
}

export async function getStripeEventById(stripeEventId: string): Promise<StripeEvent | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("stripe_events")
    .select("*")
    .eq("stripe_event_id", stripeEventId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    stripeEventId: data.stripe_event_id,
    stripeCustomerId: data.stripe_customer_id,
    type: data.type,
    status: data.status,
    payload: data.payload,
    error: data.error,
    createdAt: new Date(data.created_at),
    processedAt: data.processed_at ? new Date(data.processed_at) : null,
  };
}

export async function markEventAsProcessed(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("stripe_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to mark event as processed: ${error.message}`);
}