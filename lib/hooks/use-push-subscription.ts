"use client";

/**
 * usePushSubscription Hook
 *
 * Client-side hook for managing browser push notification subscriptions.
 * Handles permission requests, PushManager subscription, and API sync.
 * Includes retry with exponential backoff, permission state tracking,
 * and iOS standalone detection.
 */

import { useCallback, useEffect, useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface UsePushSubscriptionReturn {
  /** Current push subscription (null if not subscribed) */
  subscription: PushSubscription | null;
  /** Whether the user has an active push subscription */
  isSubscribed: boolean;
  /** Loading state for subscribe/unsubscribe operations */
  isLoading: boolean;
  /** Error message from the last operation */
  error: string | null;
  /** Current Notification permission state */
  permissionState: PermissionState;
  /** Whether the device is running iOS */
  isIOS: boolean;
  /** Whether the app is running in iOS standalone (PWA) mode */
  isIOSStandalone: boolean;
  /** Subscribe to push notifications (requests permission if needed) */
  subscribe: () => Promise<void>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>;
}

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for PushManager.subscribe
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detect if the current device is running iOS.
 */
function detectIsIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Detect if the app is running in iOS standalone (PWA) mode.
 * Push notifications on iOS require the app to be added to the home screen.
 */
function detectIsIOSStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "standalone" in window.navigator &&
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  );
}

/**
 * Subscribe to push notifications with exponential backoff retry.
 * Retries up to `maxRetries` times with delays of 1s, 2s, 4s.
 */
async function subscribeWithRetry(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
  maxRetries = 3,
): Promise<PushSubscription> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      // Register with backend
      const subJson = pushSubscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to register subscription");
      }

      return pushSubscription;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error("Failed to subscribe after retries");
}

export function usePushSubscription(): UsePushSubscriptionReturn {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>("unsupported");
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSStandalone, setIsIOSStandalone] = useState(false);

  // Derived state
  const isSubscribed = subscription !== null;

  // Check browser support and initial state on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    // iOS detection
    setIsIOS(detectIsIOS());
    setIsIOSStandalone(detectIsIOSStandalone());

    if (!supported) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PermissionState);

    // Check if there is an existing push subscription
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((existingSub) => {
        setSubscription(existingSub);
      })
      .catch(() => {
        // SW not ready yet -- that's fine
      });
  }, []);

  const subscribe = useCallback(async () => {
    // Early return if permission is denied
    if (permissionState === "denied") {
      setError("Notification permission denied. Please update your browser settings.");
      return;
    }

    if (permissionState === "unsupported") {
      setError("Push notifications are not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermissionState(perm as PermissionState);

      if (perm !== "granted") {
        setError("Notification permission denied");
        return;
      }

      // 2. Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError("Push notifications are not configured");
        return;
      }

      // 3. Subscribe with retry logic
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await subscribeWithRetry(registration, vapidPublicKey);

      setSubscription(pushSubscription);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to subscribe";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [permissionState]);

  const unsubscribe = useCallback(async () => {
    if (permissionState === "unsupported") return;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      if (existingSub) {
        // 1. Unsubscribe from PushManager
        await existingSub.unsubscribe();

        // 2. Remove from server
        const endpoint = existingSub.endpoint;
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`,
          { method: "DELETE" },
        );
      }

      setSubscription(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [permissionState]);

  return {
    subscription,
    isSubscribed,
    isLoading,
    error,
    permissionState,
    isIOS,
    isIOSStandalone,
    subscribe,
    unsubscribe,
  };
}
