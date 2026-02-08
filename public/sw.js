/// <reference lib="webworker" />

const CACHE_NAME = "sahara-v2";
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = [
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon-180.png",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip API routes and auth — always go to network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Cache-first for static assets (images, fonts, CSS, JS chunks)
  if (
    url.pathname.match(
      /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|css|js)$/
    ) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for pages (HTML navigation)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// ---------- Web Push Notification Handlers ----------

/**
 * Handle incoming push notifications.
 * Payload is expected to be JSON: { title, body, icon?, badge?, url?, tag?, data? }
 */
self.addEventListener("push", (event) => {
  const DEFAULT_ICON = "/icon-192.png";
  const DEFAULT_BADGE = "/icon-192.png";

  let payload = {
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
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag || undefined,
    data: {
      url: payload.url,
      ...(payload.data || {}),
    },
    // Vibrate pattern for mobile devices
    vibrate: [100, 50, 100],
    // Require interaction on desktop
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
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
            client.focus();
            client.navigate(targetUrl);
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
