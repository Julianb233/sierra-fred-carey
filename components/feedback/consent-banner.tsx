'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface FeedbackConsentBannerProps {
  onConsent: (agreed: boolean) => void
  compact?: boolean
}

/**
 * Compact mode: single-line banner for inline use (e.g., chat).
 * Full mode: card with explanation, toggle, and delete button (e.g., settings).
 */
export function FeedbackConsentBanner({
  onConsent,
  compact = false,
}: FeedbackConsentBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConsent = useCallback(
    (agreed: boolean) => {
      setConsentGiven(agreed)
      onConsent(agreed)
      if (compact) {
        setDismissed(true)
      }
    },
    [onConsent, compact]
  )

  const handleDeleteAll = useCallback(async () => {
    setDeleting(true)
    try {
      await fetch('/api/feedback/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: false }),
      })
      setConsentGiven(false)
      onConsent(false)
    } catch (err) {
      console.error('[consent-banner] Failed to delete feedback data:', err)
    } finally {
      setDeleting(false)
    }
  }, [onConsent])

  if (compact) {
    if (dismissed) return null

    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50',
          'px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50'
        )}
        role="alert"
        aria-label="Feedback consent request"
      >
        <span className="flex-1 text-zinc-600 dark:text-zinc-400">
          Help improve FRED? Your feedback is stored for 90 days.
        </span>
        <button
          onClick={() => handleConsent(true)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium text-white',
            'bg-[#ff6a1a] hover:bg-[#e55e15] transition-colors'
          )}
        >
          Yes
        </button>
        <button
          onClick={() => handleConsent(false)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium',
            'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            'transition-colors'
          )}
        >
          No
        </button>
      </div>
    )
  }

  // Full mode for settings page
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-white p-6',
        'dark:border-zinc-700 dark:bg-zinc-900'
      )}
      role="region"
      aria-label="Feedback data consent settings"
    >
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Feedback Data Consent
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        When enabled, we collect anonymized feedback about your interactions with
        FRED to improve the experience. Here is what you should know:
      </p>

      <ul className="mt-3 space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <li>
          <strong>What we collect:</strong> Thumbs up/down ratings, optional
          comments, and sentiment signals.
        </li>
        <li>
          <strong>How long:</strong> Feedback data is automatically deleted after
          90 days.
        </li>
        <li>
          <strong>Your control:</strong> You can revoke consent and delete all
          feedback data at any time.
        </li>
      </ul>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="feedback-consent-toggle" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Allow feedback collection
          </label>
          <button
            id="feedback-consent-toggle"
            role="switch"
            aria-checked={consentGiven}
            onClick={() => handleConsent(!consentGiven)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2',
              'border-transparent transition-colors duration-200 ease-in-out',
              consentGiven
                ? 'bg-[#ff6a1a]'
                : 'bg-zinc-200 dark:bg-zinc-700'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
                'transform transition duration-200 ease-in-out',
                consentGiven ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {consentGiven && (
          <button
            onClick={handleDeleteAll}
            disabled={deleting}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {deleting ? 'Deleting...' : 'Delete all my feedback data'}
          </button>
        )}
      </div>
    </div>
  )
}
