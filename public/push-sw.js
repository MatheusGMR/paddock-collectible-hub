// Paddock Push Notifications Service Worker
// Standalone in dev/preview, and imported by the generated PWA worker in production.

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'Paddock', body: 'Nova notícia disponível!' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    image: data.image,
    data: {
      url: data.url || '/',
      articleId: data.articleId,
    },
    actions: [
      { action: 'open', title: 'Ver notícia' },
      { action: 'close', title: 'Fechar' },
    ],
    vibrate: [200, 100, 200],
    tag: data.tag || 'paddock-news',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus existing window
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
