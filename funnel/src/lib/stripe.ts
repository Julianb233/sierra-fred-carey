import { BRAND } from './constants'

/**
 * Stripe checkout integration for the Sahara funnel.
 *
 * The funnel is a static Vite app with no server-side routes.
 * It calls the main Sahara app's API to create Stripe Checkout sessions.
 */

const CHECKOUT_API_URL = import.meta.env.VITE_CHECKOUT_API_URL
  || `${BRAND.url}/api/funnel/checkout`

interface CheckoutResponse {
  url?: string
  sessionId?: string
  plan?: {
    id: string
    name: string
    price: number
  }
  error?: string
  message?: string
  code?: string
}

export class CheckoutError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'CheckoutError'
    this.code = code
  }
}

/**
 * Redirect to Stripe Checkout for the Pro plan.
 * Calls the main app's /api/funnel/checkout endpoint to create a session,
 * then redirects the user to Stripe's hosted checkout page.
 */
export async function redirectToProCheckout(email?: string): Promise<void> {
  const response = await fetch(CHECKOUT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'pro', email }),
  })

  const data: CheckoutResponse = await response.json()

  if (!response.ok || data.error) {
    throw new CheckoutError(
      data.message || data.error || 'Failed to create checkout session',
      data.code,
    )
  }

  if (data.url) {
    window.location.href = data.url
    return
  }

  throw new CheckoutError('No checkout URL returned from server')
}
