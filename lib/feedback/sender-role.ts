/**
 * Sender Role Resolution — AI-4111
 *
 * Maps users to sender roles based on their email address.
 * Product owner (Fred Cary) gets 5x priority weighting.
 */
import { createServiceClient } from "@/lib/supabase/server"
import { KNOWN_SENDER_ROLES, ROLE_WEIGHTS } from "@/lib/feedback/constants"
import type { SenderRole } from "@/lib/feedback/constants"

// Cache resolved roles to avoid repeated DB lookups within a request
const roleCache = new Map<string, SenderRole>()

/**
 * Resolve the sender role for a user ID by looking up their email.
 * Returns 'user' as default if email is not in the known roles map.
 */
export async function getSenderRole(userId: string): Promise<SenderRole> {
  const cached = roleCache.get(userId)
  if (cached) return cached

  try {
    const supabase = createServiceClient()
    const { data } = await supabase.auth.admin.getUserById(userId)
    const email = data?.user?.email?.toLowerCase()

    const role: SenderRole = (email && KNOWN_SENDER_ROLES[email]) || 'user'
    roleCache.set(userId, role)
    return role
  } catch {
    return 'user'
  }
}

/**
 * Compute the weight multiplier for a sender role.
 */
export function getRoleWeight(role: SenderRole): number {
  return ROLE_WEIGHTS[role] || 1
}
