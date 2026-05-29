// Naadanu Web Push Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'නාදනූ 2.0';
    const options = {
      body: data.body || '',
      icon: '/nadanu.png',
      badge: '/nadanu.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    // Fallback if payload is plain text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('නාදනූ 2.0', {
        body: text,
        icon: '/nadanu.png',
        badge: '/nadanu.png'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        const clientUrl = new URL(client.url, self.location.origin).pathname;
        const targetPath = new URL(targetUrl, self.location.origin).pathname;
        if (clientUrl === targetPath && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
