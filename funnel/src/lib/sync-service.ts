/**
 * Funnel → Platform Sync Service
 *
 * Periodically syncs funnel data (chat messages + journey progress) to the
 * Sahara API so it can survive localStorage clears and be migrated when the
 * user signs up for the full platform.
 *
 * Linear: AI-1903
 */

import { getSessionId, loadChatHistory } from './chat-service'

const JOURNEY_STORAGE_KEY = 'sahara-funnel-journey'
const SYNC_INTERVAL_MS = 30_000 // Sync every 30 seconds when active
const SYNC_DEBOUNCE_MS = 5_000  // Wait 5s after last change before syncing

let syncTimer: ReturnType<typeof setTimeout> | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Load journey progress from localStorage
 */
function loadJourneyProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(JOURNEY_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Sync current funnel data to the platform API.
 * Fails silently — syncing is best-effort.
 */
async function syncToApi(): Promise<void> {
  const apiUrl = import.meta.env.VITE_SAHARA_API_URL
  if (!apiUrl) return // No API configured — skip sync

  try {
    const payload = {
      sessionId: getSessionId(),
      chatMessages: loadChatHistory(),
      journeyProgress: loadJourneyProgress(),
      funnelVersion: '1.0',
      exportedAt: new Date().toISOString(),
    }

    // Only sync if there's meaningful data
    if (payload.chatMessages.length === 0 && Object.keys(payload.journeyProgress).length === 0) {
      return
    }

    await fetch(`${apiUrl}/api/funnel/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silent failure — sync is best-effort
  }
}

/**
 * Schedule a debounced sync. Call this after any data change
 * (new chat message, journey milestone toggled).
 */
export function scheduleFunnelSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    syncToApi()
  }, SYNC_DEBOUNCE_MS)
}

/**
 * Start periodic background sync.
 * Call once when the funnel app mounts.
 */
export function startPeriodicSync(): void {
  // Initial sync on load
  syncToApi()

  // Periodic sync
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = setInterval(syncToApi, SYNC_INTERVAL_MS)

  // Sync on page unload (best-effort)
  window.addEventListener('beforeunload', () => {
    const apiUrl = import.meta.env.VITE_SAHARA_API_URL
    if (!apiUrl) return

    const payload = {
      sessionId: getSessionId(),
      chatMessages: loadChatHistory(),
      journeyProgress: loadJourneyProgress(),
      funnelVersion: '1.0',
      exportedAt: new Date().toISOString(),
    }

    // Use sendBeacon for reliable delivery during page unload
    navigator.sendBeacon(
      `${apiUrl}/api/funnel/sync`,
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    )
  })
}

/**
 * Stop periodic sync. Call on unmount.
 */
export function stopPeriodicSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

/**
 * Export funnel data as a migration payload.
 * Used when directing the user to the sign-up page.
 */
export function exportFunnelPayload(): string {
  const payload = {
    sessionId: getSessionId(),
    chatMessages: loadChatHistory(),
    journeyProgress: loadJourneyProgress(),
    funnelVersion: '1.0',
    exportedAt: new Date().toISOString(),
  }
  return btoa(JSON.stringify(payload))
}
