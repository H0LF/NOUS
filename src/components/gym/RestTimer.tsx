"use client";
import React, { useEffect, useRef } from "react";
import { useStore } from "@/store";

const PRESETS = [60, 90, 120, 180];

async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function fireRestNotification() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const n = new Notification("Rest time is over!", {
    body: "Time to get back to work",
    icon: "/icons/icon-192x192.png",
    tag: "rest-timer",
    requireInteraction: false,
  });
  // Auto-close after 4 seconds
  setTimeout(() => n.close(), 4000);
}

function scheduleRestTimerSW(endsAt: number) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: "SCHEDULE_REST_TIMER", endsAt });
  });
}

function cancelRestTimerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: "CANCEL_REST_TIMER" });
  });
}

export const RestTimer = () => {
  const {
    restTimerSeconds,
    restTimerDuration,
    restTimerEndsAt,
    isRestTimerRunning,
    startRestTimer,
    tickRestTimer,
    stopRestTimer,
    syncRestTimer,
  } = useStore();

  const prevRunning = useRef(false);

  useEffect(() => {
    if (!isRestTimerRunning) return;
    const id = setInterval(tickRestTimer, 1000);
    return () => clearInterval(id);
  }, [isRestTimerRunning, tickRestTimer]);

  // Resync timer when the page becomes visible again (after screen lock/tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncRestTimer();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncRestTimer]);

  // Request permission + schedule SW notification when timer starts
  useEffect(() => {
    if (isRestTimerRunning && !prevRunning.current) {
      requestNotificationPermission();
      if (restTimerEndsAt) scheduleRestTimerSW(restTimerEndsAt);
    }
    if (!isRestTimerRunning && prevRunning.current) {
      cancelRestTimerSW();
    }
    prevRunning.current = isRestTimerRunning;
  }, [isRestTimerRunning, restTimerEndsAt]);

  // Fire in-page notification when timer reaches 0 (app is open)
  useEffect(() => {
    if (isRestTimerRunning && restTimerSeconds === 0) {
      fireRestNotification();
    }
  }, [restTimerSeconds, isRestTimerRunning]);

  const progress = restTimerDuration > 0
    ? restTimerSeconds / restTimerDuration
    : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // Compact inline bar when running
  if (isRestTimerRunning) {
    return (
      <div className="bg-nous-surface border border-nous-border rounded-xl p-3 animate-fadeIn">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-nous-secondary">
            Rest Timer
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold text-nous-accent">
              {formatTime(restTimerSeconds)}
            </span>
            <button
              onClick={stopRestTimer}
              className="text-[10px] text-nous-secondary hover:text-red-400 transition-colors uppercase tracking-wider font-bold"
            >
              Skip
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 bg-nous-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progress * 100}%`,
              background: progress > 0.3
                ? "var(--nous-accent)"
                : progress > 0.1
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          />
        </div>
      </div>
    );
  }

  // Quick-start buttons when idle
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-nous-secondary mr-1">
        Rest
      </span>
      {PRESETS.map((s) => (
        <button
          key={s}
          onClick={() => startRestTimer(s)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-nous-surface border border-nous-border text-nous-secondary hover:border-nous-accent hover:text-nous-accent transition-colors"
        >
          {s >= 60 ? `${s / 60}m` : `${s}s`}
        </button>
      ))}
    </div>
  );
};
