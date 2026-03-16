"use client";
import React, { useEffect } from "react";
import { useStore } from "@/store";

const PRESETS = [60, 90, 120, 180];

export const RestTimer = () => {
  const {
    restTimerSeconds,
    restTimerDuration,
    isRestTimerRunning,
    startRestTimer,
    tickRestTimer,
    stopRestTimer,
  } = useStore();

  useEffect(() => {
    if (!isRestTimerRunning) return;
    const id = setInterval(tickRestTimer, 1000);
    return () => clearInterval(id);
  }, [isRestTimerRunning, tickRestTimer]);

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
