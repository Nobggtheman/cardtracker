// Service worker: runs in the background (even when the app tab is closed)
// and turns push messages from the server into system notifications.

// Fired when the server sends a push. The payload is the JSON object the
// server passed to notifyAll(): { title, body, url }.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  // waitUntil keeps the service worker alive until the notification is shown.
  event.waitUntil(
    self.registration.showNotification(data.title || 'CardTracker', {
      body: data.body,
      icon: '/icon.svg',
      // Stash the URL so the click handler below knows where to go.
      data: { url: data.url || '/' },
    }),
  );
});

// Fired when the user clicks a notification: reuse an open CardTracker window
// if there is one, otherwise open a new one at the notification's URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const win = windows[0];
      // navigate() can resolve to null, so fall back to focusing the original window.
      if (win) return win.navigate(url).then((w) => (w || win).focus());
      return clients.openWindow(url);
    }),
  );
});
