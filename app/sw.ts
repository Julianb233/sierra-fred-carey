import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// ---------- Old Cache Cleanup ----------
// Remove caches from the previous custom service worker (sahara-v2)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("sahara-"))
          .map((key) => caches.delete(key))
      )
    )
  );
});

// ---------- Web Push Notification Handlers ----------

/**
 * Handle incoming push notifications.
 * Payload is expected to be JSON: { title, body, icon?, badge?, url?, tag?, data? }
 */
self.addEventListener("push", (event) => {
  const DEFAULT_ICON = "/icon-192.png";
  const DEFAULT_BADGE = "/icon-192.png";

  let payload: Record<string, unknown> = {
    title: "Sahara",
    body: "You have a new notification",
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: "/dashboard",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        icon: data.icon || DEFAULT_ICON,
        badge: data.badge || DEFAULT_BADGE,
        url: data.url || "/dashboard",
      };
      // Preserve extra data fields
      if (data.data) {
        payload.data = data.data;
      }
      if (data.tag) {
        payload.tag = data.tag;
      }
    } catch {
      // If JSON parsing fails, try to use as plain text
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const options = {
    body: payload.body as string,
    icon: payload.icon as string,
    badge: payload.badge as string,
    tag: (payload.tag as string) || undefined,
    data: {
      url: payload.url,
      ...((payload.data as Record<string, unknown>) || {}),
    },
    // Vibrate pattern for mobile devices
    vibrate: [100, 50, 100],
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(payload.title as string, options)
  );
});

/**
 * Handle notification click events.
 * Opens the URL from the notification data, or falls back to /dashboard.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            (client as WindowClient).focus();
            (client as WindowClient).navigate(targetUrl);
            return;
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ---------- Register Serwist Event Listeners ----------
// Must be called last so Serwist's install/activate/fetch handlers are registered
serwist.addEventListeners();
