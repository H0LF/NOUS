const CACHE_NAME = "nous-cache-v2";
const PERIODIC_SYNC_TAG = "nous-event-check";

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", "/manifest.json", "/icons/icon-192x192.png", "/icons/icon-512x512.png"])
    )
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch — network-first ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Notification click — open/focus the app ───────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/app/calendar";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Message handler ───────────────────────────────────────────────────────────
let restTimerTimeoutId = null;

self.addEventListener("message", (event) => {
  const { type } = event.data ?? {};

  if (type === "SCHEDULE_EVENT_NOTIFICATIONS") {
    scheduleEventNotifications(event.data.events ?? []);
    return;
  }

  if (type === "SCHEDULE_REST_TIMER") {
    // Cancel any existing rest timer notification
    if (restTimerTimeoutId !== null) clearTimeout(restTimerTimeoutId);
    const delay = event.data.endsAt - Date.now();
    if (delay <= 0) return;
    restTimerTimeoutId = setTimeout(() => {
      self.registration.showNotification("Rest time is over!", {
        body: "Time to get back to work 💪",
        icon: "/icons/icon-192x192.png",
        tag: "rest-timer",
        data: { url: "/app/gym" },
        requireInteraction: false,
      });
      restTimerTimeoutId = null;
    }, delay);
    return;
  }

  if (type === "CANCEL_REST_TIMER") {
    if (restTimerTimeoutId !== null) {
      clearTimeout(restTimerTimeoutId);
      restTimerTimeoutId = null;
    }
  }
});

// ── Periodic background sync ──────────────────────────────────────────────────
self.addEventListener("periodicsync", (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(requestEventRefresh());
  }
});

async function requestEventRefresh() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "SW_REQUEST_EVENTS" });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const scheduledTimeouts = new Map();

function scheduleEventNotifications(events) {
  // Clear existing scheduled notifications
  for (const id of scheduledTimeouts.values()) clearTimeout(id);
  scheduledTimeouts.clear();

  const now = Date.now();

  for (const ev of events) {
    // ev: { id, title, date, startTime }
    const [h, m] = (ev.startTime ?? "00:00").split(":").map(Number);
    const eventMs = new Date(ev.date + "T" + ev.startTime).getTime();
    const notifyMs = eventMs - 15 * 60 * 1000; // 15 min before

    if (notifyMs <= now) continue; // already past
    const delay = notifyMs - now;
    if (delay > 24 * 60 * 60 * 1000) continue; // more than 24h away — skip

    const timeoutId = setTimeout(() => {
      self.registration.showNotification(ev.title, {
        body: `Starting at ${ev.startTime}`,
        icon: "/icons/icon-192x192.png",
        tag: `event-${ev.id}`,
        data: { url: "/app/calendar" },
        requireInteraction: false,
      });
    }, delay);

    scheduledTimeouts.set(ev.id, timeoutId);
  }
}
