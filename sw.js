const CACHE_NAME = "notifier-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon } = e.data;
    const opts = {
      body: body || "",
      vibrate: [100, 50, 100],
      timestamp: Date.now(),
      requireInteraction: false,
      tag: "notifier-" + Date.now(),
    };
    // Only set icon if one was provided — avoids silent Chrome suppression on bad URLs
    if (icon) opts.icon = icon;
    e.waitUntil(
      self.registration.showNotification(title || "Notification", opts),
    );
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ("focus" in c) return c.focus();
        }
        if (clients.openWindow) return clients.openWindow(self.location.origin);
      }),
  );
});
