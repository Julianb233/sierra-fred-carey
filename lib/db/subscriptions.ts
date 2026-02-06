// Database schema types for subscriptions
// Implemented with Supabase PostgreSQL

import { sql } from "./supabase-sql";

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

// Supabase database functions
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const result = await sql`
      SELECT * FROM user_subscriptions WHERE user_id = ${userId} LIMIT 1
    `;

    if (!result || result.length === 0) return null;

    const data = result[0];
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
  } catch (error) {
    console.error("[getUserSubscription] Error (table may not exist):", error);
    return null;
  }
}

export async function getSubscriptionByCustomerId(customerId: string): Promise<UserSubscription | null> {
  try {
    const result = await sql`
      SELECT * FROM user_subscriptions WHERE stripe_customer_id = ${customerId} LIMIT 1
    `;

    if (!result || result.length === 0) return null;

    const data = result[0];
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
  } catch (error) {
    console.error("[getSubscriptionByCustomerId] Error (table may not exist):", error);
    return null;
  }
}

export async function createOrUpdateSubscription(
  subscription: Partial<UserSubscription>
): Promise<UserSubscription> {
  const now = new Date().toISOString();

  const result = await sql`
    INSERT INTO user_subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      status,
      current_period_start,
      current_period_end,
      canceled_at,
      cancel_at_period_end,
      trial_start,
      trial_end,
      updated_at
    ) VALUES (
      ${subscription.userId},
      ${subscription.stripeCustomerId},
      ${subscription.stripeSubscriptionId || null},
      ${subscription.stripePriceId},
      ${subscription.status},
      ${subscription.currentPeriodStart?.toISOString()},
      ${subscription.currentPeriodEnd?.toISOString()},
      ${subscription.canceledAt?.toISOString() || null},
      ${subscription.cancelAtPeriodEnd || false},
      ${subscription.trialStart?.toISOString() || null},
      ${subscription.trialEnd?.toISOString() || null},
      ${now}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      canceled_at = EXCLUDED.canceled_at,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      trial_start = EXCLUDED.trial_start,
      trial_end = EXCLUDED.trial_end,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `;

  const data = result[0];
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
): Promise<StripeEvent | null> {
  const result = await sql`
    INSERT INTO stripe_events (
      stripe_event_id,
      stripe_customer_id,
      type,
      status,
      payload
    ) VALUES (
      ${event.stripeEventId},
      ${event.stripeCustomerId || null},
      ${event.type},
      ${event.status || "pending"},
      ${JSON.stringify(event.payload)}
    )
    ON CONFLICT (stripe_event_id) DO NOTHING
    RETURNING *
  `;

  if (!result || result.length === 0) return null;

  const data = result[0];
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
  const result = await sql`
    SELECT * FROM stripe_events WHERE stripe_event_id = ${stripeEventId} LIMIT 1
  `;

  if (!result || result.length === 0) return null;

  const data = result[0];
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
  await sql`
    UPDATE stripe_events
    SET status = 'processed', processed_at = NOW()
    WHERE id = ${id}::uuid
  `;
}

export async function markEventAsFailed(id: string, error: string): Promise<void> {
  await sql`
    UPDATE stripe_events
    SET status = 'failed', error = ${error}, processed_at = NOW()
    WHERE id = ${id}::uuid
  `;
}
