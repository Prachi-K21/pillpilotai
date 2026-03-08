/// <reference lib="webworker" />

// Custom service worker for PillPilot push notifications
// This file extends the workbox-generated service worker

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "💊 PillPilot Reminder";
  const options = {
    body: data.body || "Time to take your medicine!",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: data.tag || "pillpilot-reminder",
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: "taken", title: "✅ Taken" },
      { action: "snooze", title: "⏰ Snooze 5min" },
    ],
    data: data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};

  if (action === "taken" || action === "snooze") {
    // Open the app to the dashboard
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: `medicine-${action}`, data });
            return;
          }
        }
        self.clients.openWindow("/dashboard");
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        self.clients.openWindow("/dashboard");
      })
    );
  }
});
