const CACHE_NAME = "notifier-v6";

let storedBadge = null;
let notifCount = 0;
let hasRestamped = false; // only restamp once per consolidation cycle

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

function updateAppBadge(count) {
  if (!("setAppBadge" in self.registration)) return Promise.resolve();
  return count > 0
    ? self.registration.setAppBadge(count)
    : self.registration.clearAppBadge();
}

// Restamp badge image on all live notifications — runs once when count hits 2
async function restampOnce() {
  if (!storedBadge || hasRestamped) return;
  hasRestamped = true;

  // Small delay — give Chrome a moment to consolidate before we restamp
  await new Promise((r) => setTimeout(r, 500));

  const notifications = await self.registration.getNotifications();
  for (const n of notifications) {
    const opts = {
      body: n.body,
      icon: n.icon,
      badge: storedBadge,
      timestamp: n.timestamp,
      requireInteraction: n.requireInteraction,
      tag: n.tag,
      data: n.data,
      vibrate: [], // silent — no re-alert
      silent: true,
    };
    n.close();
    // Small gap between close and reshow to avoid Android dropping it
    await new Promise((r) => setTimeout(r, 100));
    await self.registration.showNotification(n.title, opts);
  }
}

self.addEventListener("message", (e) => {
  if (e.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, badge } = e.data;
    if (badge) storedBadge = badge;

    notifCount++;

    const opts = {
      body: body || "",
      vibrate: [100, 50, 100],
      timestamp: Date.now(),
      requireInteraction: false,
      tag: "notifier-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    };
    if (icon) opts.icon = icon;
    if (storedBadge) opts.badge = storedBadge;

    e.waitUntil(
      self.registration
        .showNotification(title || "Notification", opts)
        .then(() => updateAppBadge(notifCount))
        .then(() => {
          // Only restamp at the consolidation boundary (count == 2), never again
          if (notifCount === 2) return restampOnce();
        }),
    );
  }

  if (e.data?.type === "STORE_BADGE") {
    if (e.data.badge) storedBadge = e.data.badge;
  }
});

// When count drops back to 1 (user dismissed some), reset so restamp fires again
// if notifications build up to 2 a second time
self.addEventListener("notificationclose", (e) => {
  notifCount = Math.max(0, notifCount - 1);
  if (notifCount <= 1) hasRestamped = false;
  e.waitUntil(updateAppBadge(notifCount));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  notifCount = Math.max(0, notifCount - 1);
  if (notifCount <= 1) hasRestamped = false;
  e.waitUntil(
    Promise.all([
      updateAppBadge(notifCount),
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((list) => {
          for (const c of list) {
            if ("focus" in c) return c.focus();
          }
          if (clients.openWindow)
            return clients.openWindow(self.location.origin);
        }),
    ]),
  );
});
