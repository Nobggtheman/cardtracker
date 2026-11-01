self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CardTracker', {
      body: data.body,
      icon: '/icon.svg',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const win = windows[0];
      if (win) return win.navigate(url).then((w) => (w || win).focus());
      return clients.openWindow(url);
    }),
  );
});
