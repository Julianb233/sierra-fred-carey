"use client"

/**
 * Event Signup Form
 * Phase 88: Event Launch Kit
 *
 * Streamlined email+password signup for event landing pages.
 * Mobile-first with large touch targets.
 */

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trackEvent } from "@/lib/analytics"
import { EVENT_ANALYTICS } from "@/lib/event/analytics"

interface EventSignupFormProps {
  eventSlug: string
  onSuccess: (redirectTo: string) => void
}

export function EventSignupForm({ eventSlug, onSuccess }: EventSignupFormProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const hasTrackedStart = useRef(false)

  const handleInputFocus = () => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      trackEvent(EVENT_ANALYTICS.SIGNUP_START, { eventSlug })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDuplicate(false)

    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/event/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          eventSlug,
          fullName: fullName.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        setDuplicate(true)
        setError(data.error || "Account already exists.")
        return
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed")
      }

      onSuccess(data.redirectTo || "/onboarding")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed"
      setError(msg)
      trackEvent(EVENT_ANALYTICS.SIGNUP_ERROR, { eventSlug, error: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto">
      <div>
        <Label htmlFor="fullName" className="text-sm text-gray-300">
          Full Name (optional)
        </Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Jane Doe"
          className="mt-1 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          autoComplete="name"
        />
      </div>

      <div>
        <Label htmlFor="email" className="text-sm text-gray-300">
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="you@startup.com"
          required
          className="mt-1 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          autoComplete="email"
        />
      </div>

      <div>
        <Label htmlFor="password" className="text-sm text-gray-300">
          Password *
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Min 6 characters"
          required
          minLength={6}
          className="mt-1 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 text-center">
          {error}
          {duplicate && (
            <a
              href="/login"
              className="block mt-1 text-[#ff6a1a] hover:underline"
            >
              Already have an account? Sign in
            </a>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 text-base font-semibold bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
      >
        {submitting ? "Creating account..." : "Get Started Free"}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        14-day free Pro trial. No credit card required.
      </p>
    </form>
  )
}
