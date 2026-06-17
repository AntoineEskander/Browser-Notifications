const CACHE_NAME = 'notifier-v4';

// Track the badge image and active notification count across the SW lifetime
let storedBadge = null;
let notifCount  = 0;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// ---- Re-derive count from live notifications (source of truth) ----
async function syncCount() {
  const all = await self.registration.getNotifications();
  notifCount = all.length;
  return notifCount;
}

// ---- Apply badge: numeric count via Badging API + re-stamp each notification's badge image ----
async function applyBadge() {
  const count = await syncCount();

  // Badging API — sets the number on the browser/OS icon
  if ('setAppBadge' in self.registration) {
    if (count > 0) {
      await self.registration.setAppBadge(count);
    } else {
      await self.registration.clearAppBadge();
    }
  }

  // Re-stamp badge image on every live notification so it survives consolidation.
  // We close & re-show each one — the only way to mutate a shown notification.
  if (storedBadge && count > 0) {
    const notifications = await self.registration.getNotifications();
    for (const n of notifications) {
      const opts = {
        body:               n.body,
        icon:               n.icon,
        badge:              storedBadge,   // re-apply custom badge
        vibrate:            [],            // no re-vibration on refresh
        timestamp:          n.timestamp,
        requireInteraction: n.requireInteraction,
        tag:                n.tag,
        data:               n.data,
        silent:             true,
      };
      n.close();
      await self.registration.showNotification(n.title, opts);
    }
  }
}

self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge } = e.data;

    // Persist the badge image so we can re-apply it after consolidation
    if (badge) storedBadge = badge;

    const opts = {
      body:               body || '',
      vibrate:            [100, 50, 100],
      timestamp:          Date.now(),
      requireInteraction: false,
      tag:                'notifier-' + Date.now(),
      silent:             false,
    };
    if (icon)        opts.icon  = icon;
    if (storedBadge) opts.badge = storedBadge;

    e.waitUntil(
      self.registration.showNotification(title || 'Notification', opts)
        .then(() => applyBadge())
    );
  }

  if (e.data?.type === 'STORE_BADGE') {
    // Page can pre-store the badge image before sending, e.g. on icon change
    if (e.data.badge) storedBadge = e.data.badge;
  }
});

self.addEventListener('notificationclose', e => {
  // Re-apply badge count whenever a notification is dismissed
  e.waitUntil(applyBadge());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    Promise.all([
      applyBadge(),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) { if ('focus' in c) return c.focus(); }
        if (clients.openWindow) return clients.openWindow(self.location.origin);
      })
    ])
  );
});