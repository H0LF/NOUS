"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";

/**
 * useCalendarNotifications
 *
 * Schedules Web Notifications for upcoming calendar events (within 24h).
 * Fires a notification 15 minutes before each event starts.
 * Also posts the events to the service worker for background scheduling.
 *
 * Call this once inside the app layout.
 */
export function useCalendarNotifications() {
  const { calendarEvents, user } = useStore();
  const scheduledIds = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Request notification permission once user is authenticated
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // Schedule notifications for upcoming events & post to SW
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Clear previous timeouts
    for (const id of scheduledIds.current.values()) clearTimeout(id);
    scheduledIds.current.clear();

    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;

    const upcoming = calendarEvents.filter((ev) => {
      const eventMs = new Date(ev.date + "T" + ev.startTime).getTime();
      return eventMs > now && eventMs <= in24h;
    });

    // Schedule in-page timeouts (works when app is open)
    for (const ev of upcoming) {
      const eventMs = new Date(ev.date + "T" + ev.startTime).getTime();
      const notifyMs = eventMs - 15 * 60 * 1000;
      const delay = notifyMs - now;
      if (delay <= 0) continue;

      const id = setTimeout(() => {
        new Notification(ev.title, {
          body: `Starting at ${ev.startTime}`,
          icon: "/icons/icon-192x192.png",
          tag: `event-${ev.id}`,
          requireInteraction: false,
        });
      }, delay);
      scheduledIds.current.set(ev.id, id);
    }

    // Also post to service worker for background scheduling
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_EVENT_NOTIFICATIONS",
        events: upcoming.map((ev) => ({
          id: ev.id,
          title: ev.title,
          date: ev.date,
          startTime: ev.startTime,
        })),
      });
    }

    return () => {
      for (const id of scheduledIds.current.values()) clearTimeout(id);
      scheduledIds.current.clear();
    };
  }, [calendarEvents, user]);

  // Register periodic background sync (runs every 1 hour)
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      if ("periodicSync" in reg) {
        (reg as ServiceWorkerRegistration & {
          periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
        }).periodicSync.register("nous-event-check", { minInterval: 60 * 60 * 1000 }).catch(() => {
          // periodicSync not supported or permission denied — silently ignore
        });
      }
    });

    // Listen for SW requests to refresh events
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_REQUEST_EVENTS") {
        // Re-trigger by posting current events back to SW
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SCHEDULE_EVENT_NOTIFICATIONS",
            events: calendarEvents.map((ev) => ({
              id: ev.id,
              title: ev.title,
              date: ev.date,
              startTime: ev.startTime,
            })),
          });
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [user, calendarEvents]);
}
