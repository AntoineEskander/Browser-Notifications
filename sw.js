const CACHE_NAME = 'notifier-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Called via postMessage from the page — more reliable than push on desktop
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body } = e.data;
    e.waitUntil(
      self.registration.showNotification(title || 'Notification', {
        body: body || '',
        icon: '/notifier-icon.png',   // will 404 gracefully — Chrome handles missing icons fine
        badge: '/notifier-icon.png',
        vibrate: [100, 50, 100],
        timestamp: Date.now(),
        requireInteraction: false,
        tag: 'notifier-' + Date.now()
      })
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(self.location.origin);
    })
  );
});
