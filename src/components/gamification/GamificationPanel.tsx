"use client";
import React, { useState, useEffect, useRef } from "react";
import { useGamification, Badge, RadarAxis } from "@/hooks/useGamification";
import { useSettings } from "@/hooks/useSettings";
import { Toggle } from "@/components/ui/Toggle";

// ── Daily challenges ─────────────────────────────────────────────────────────���─
const ALL_CHALLENGES = [
  { id: "log_meal",     label: "Log a meal today",            xp: 10, icon: "" },
  { id: "log_water",    label: "Log your water intake",       xp: 5,  icon: "" },
  { id: "workout",      label: "Complete a workout",          xp: 50, icon: "" },
  { id: "note",         label: "Write or update a note",      xp: 15, icon: "" },
  { id: "review_cal",   label: "Check your calendar",         xp: 5,  icon: "" },
  { id: "stretch",      label: "Do a 10-min stretch",         xp: 10, icon: "" },
  { id: "steps",        label: "Hit 8 000 steps",             xp: 20, icon: "" },
  { id: "sleep",        label: "Log 8h of sleep",             xp: 15, icon: "" },
  { id: "meal_prep",    label: "Prep meals for tomorrow",     xp: 20, icon: "" },
  { id: "no_sugar",     label: "Go sugar-free today",         xp: 25, icon: "" },
];

function getDailyChallenges(date: string): typeof ALL_CHALLENGES {
  // Deterministic seeding from date string so same day = same challenges
  let seed = date.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const picked: typeof ALL_CHALLENGES = [];
  const pool = [...ALL_CHALLENGES];
  while (picked.length < 3 && pool.length > 0) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const idx = seed % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function useDailyChallenges() {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `nous_challenges_${today}`;
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { return new Set(); }
  });
  const challenges = getDailyChallenges(today);

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  return { challenges, completed, toggle };
}

// ── Radar (spider) chart ──────────────────────────────────────────────────────
const RadarChart = ({ axes }: { axes: RadarAxis[] }) => {
  const SIZE = 200;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 80;
  const n = axes.length;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  const angleOf = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const polarToXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const ringPath = (ratio: number) =>
    axes
      .map((_, i) => {
        const { x, y } = polarToXY(angleOf(i), R * ratio);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  const dataPath =
    axes
      .map((axis, i) => {
        const { x, y } = polarToXY(angleOf(i), R * (axis.value / 100));
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  const labelOffset = R + 22;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--nous-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--nous-accent)" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--nous-accent)" />
          <stop offset="100%" stopColor="var(--nous-accent)" />
        </linearGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {rings.map((ratio, ri) => (
        <path
          key={ri}
          d={ringPath(ratio)}
          fill="none"
          stroke={ratio === 1 ? "rgba(var(--nous-accent-rgb),0.25)" : "var(--nous-border)"}
          strokeWidth={ratio === 1 ? 1 : 0.8}
        />
      ))}

      {axes.map((_, i) => {
        const { x, y } = polarToXY(angleOf(i), R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x.toFixed(2)}
            y2={y.toFixed(2)}
            stroke="var(--nous-border)"
            strokeWidth="0.8"
          />
        );
      })}

      <path d={dataPath} fill="url(#radarFill)" />
      <path d={dataPath} fill="none" stroke="url(#radarStroke)" strokeWidth="1.8" filter="url(#radarGlow)" />

      {axes.map((axis, i) => {
        const { x, y } = polarToXY(angleOf(i), R * (axis.value / 100));
        return (
          <circle
            key={i}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r="3.5"
            fill="var(--nous-accent)"
            stroke="var(--nous-bg)"
            strokeWidth="1.5"
            filter="url(#radarGlow)"
          />
        );
      })}

      {axes.map((axis, i) => {
        const angle = angleOf(i);
        const { x, y } = polarToXY(angle, labelOffset);
        const textAnchor =
          Math.abs(Math.cos(angle)) < 0.1 ? "middle" : Math.cos(angle) >= 0 ? "start" : "end";
        const dy = Math.sin(angle) > 0.5 ? 10 : Math.sin(angle) < -0.5 ? -2 : 4;
        return (
          <g key={i}>
            <text
              x={x.toFixed(2)}
              y={(y + dy).toFixed(2)}
              textAnchor={textAnchor}
              fontSize="9"
              fontWeight="600"
              fill="var(--nous-secondary)"
              fontFamily="var(--font-outfit), sans-serif"
            >
              {axis.label}
            </text>
            <text
              x={x.toFixed(2)}
              y={(y + dy + 11).toFixed(2)}
              textAnchor={textAnchor}
              fontSize="8"
              fill="var(--nous-accent)"
              fontFamily="var(--font-outfit), sans-serif"
              fontWeight="700"
            >
              {axis.rawLabel}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="4" fill="var(--nous-accent)" opacity="0.5" filter="url(#radarGlow)" />
    </svg>
  );
};

// ── Badge icon ────────────────────────────────────────────────────────────────
const BadgeIcon = ({ type, earned }: { type: Badge["icon"]; earned: boolean }) => {
  const color = earned ? "var(--nous-accent)" : "var(--nous-tertiary)";
  const icons: Record<Badge["icon"], React.ReactNode> = {
    food: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    gym: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
        <path d="M6 20v-4" /><path d="M18 20v-4" />
        <path d="M6 8V4" /><path d="M18 8V4" />
        <path d="M3 12h18" />
      </svg>
    ),
    class: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    streak: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    star: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
};

// ── Main panel ────────────────────────────────────────────────────────────────
export const GamificationPanel = () => {
  const g = useGamification();
  const { settings, updateSettings } = useSettings();
  const [showConfig, setShowConfig] = useState(false);
  const { challenges, completed, toggle } = useDailyChallenges();
  const prevLevel = useRef(g.level);
  const [levelUpFlash, setLevelUpFlash] = useState(false);

  useEffect(() => {
    if (!g.loading && g.level > prevLevel.current) {
      setLevelUpFlash(true);
      setTimeout(() => setLevelUpFlash(false), 2000);
    }
    prevLevel.current = g.level;
  }, [g.level, g.loading]);

  const gamEnabled = settings.gamificationEnabled ?? true;
  const gamFeatures = settings.gamificationFeatures ?? { food: true, gym: true, calendar: true, notes: true };

  // ── Master toggle (always visible) ─────────────────────────────────────────
  const MasterToggle = () => (
    <div
      className="rounded-2xl px-5 py-4 flex items-center justify-between"
      style={{ background: "rgba(var(--nous-accent-rgb),0.05)", border: "1px solid rgba(var(--nous-accent-rgb),0.12)" }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--nous-primary)" }}>
          Progress Tracking
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--nous-secondary)" }}>
          XP, levels, streaks &amp; badges
        </p>
      </div>
      <Toggle
        checked={gamEnabled}
        onChange={(v) => updateSettings({ gamificationEnabled: v })}
      />
    </div>
  );

  if (!gamEnabled) {
    return (
      <div className="space-y-3">
        <MasterToggle />
        <p className="text-xs text-center" style={{ color: "var(--nous-secondary)" }}>
          Progress tracking is disabled
        </p>
      </div>
    );
  }

  if (g.loading) {
    return (
      <div className="space-y-3">
        <MasterToggle />
        <div
          className="rounded-2xl p-6 animate-pulse"
          style={{ background: "rgba(var(--nous-accent-rgb),0.05)", border: "1px solid rgba(var(--nous-accent-rgb),0.1)" }}
        >
          <div className="h-4 rounded-full w-1/3 mb-4" style={{ background: "var(--nous-border)" }} />
          <div className="h-48 rounded-xl" style={{ background: "var(--nous-surface)" }} />
        </div>
      </div>
    );
  }

  const earnedBadges = g.badges.filter((b) => b.earned);
  const lockedBadges = g.badges.filter((b) => !b.earned);

  return (
    <div className="space-y-4">
      <MasterToggle />

      {/* ── Level + XP bar ── */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{
          background: "linear-gradient(135deg, rgba(var(--nous-accent-rgb),0.1) 0%, rgba(var(--nous-accent-rgb),0.05) 100%)",
          border: "1px solid rgba(var(--nous-accent-rgb),0.18)",
        }}
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--nous-accent)" }}>
              Level
            </p>
            <p className="text-4xl font-black leading-none" style={{ color: "var(--nous-primary)" }}>
              {g.level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: "var(--nous-secondary)" }}>Total XP</p>
            <p className="text-2xl font-bold" style={{ color: "var(--nous-accent)" }}>
              {g.xp.toLocaleString()}
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "var(--nous-secondary)" }}>
            <span>{g.xpForCurrentLevel.toLocaleString()} XP</span>
            <span>{g.xpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--nous-border)" }}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${levelUpFlash ? "animate-pulseGlow" : ""}`}
              style={{
                width: `${g.progressPercent}%`,
                background: "linear-gradient(90deg, var(--nous-accent), var(--nous-accent2))",
                boxShadow: levelUpFlash ? "0 0 20px rgba(var(--nous-accent-rgb),0.8)" : "0 0 10px rgba(var(--nous-accent-rgb),0.4)",
              }}
            />
          </div>
          {levelUpFlash && (
            <p className="text-[11px] text-center font-bold animate-fadeIn" style={{ color: "var(--nous-accent)" }}>
              Level Up!
            </p>
          )}
          <p className="text-[10px] mt-1 text-right" style={{ color: "var(--nous-secondary)" }}>
            {Math.max(0, g.xpForNextLevel - g.xp)} XP to Level {g.level + 1}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "Food streak", value: `${g.streak}d` },
            { label: "Gym streak", value: `${g.gymStreak}d` },
            { label: "Workouts", value: g.totalWorkouts },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: "var(--nous-card)", border: "1px solid var(--nous-border)" }}
            >
              <p className="text-lg font-bold leading-none mb-0.5" style={{ color: "var(--nous-primary)" }}>
                {value}
              </p>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--nous-secondary)" }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Radar chart ── */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center gap-4"
        style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
      >
        <p className="w-full text-[10px] font-semibold uppercase tracking-widest self-start" style={{ color: "var(--nous-secondary)" }}>
          Performance
        </p>
        {g.radar.length === 6 ? (
          <RadarChart axes={g.radar} />
        ) : (
          <div className="h-48 flex items-center justify-center text-[12px]" style={{ color: "var(--nous-secondary)" }}>
            Loading stats…
          </div>
        )}
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 w-full">
          {g.radar.map((axis) => (
            <div key={axis.label} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--nous-secondary)" }}>{axis.label}</span>
                <span className="text-[10px] font-bold" style={{ color: "var(--nous-accent)" }}>{axis.value}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--nous-border)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${axis.value}%`, background: "linear-gradient(90deg, var(--nous-accent), var(--nous-accent2))" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily challenges ── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--nous-secondary)" }}>
            Daily Challenges
          </p>
          <span className="text-[10px]" style={{ color: "var(--nous-accent)" }}>
            {completed.size}/3 done
          </span>
        </div>
        <div className="space-y-2">
          {challenges.map((ch) => {
            const done = completed.has(ch.id);
            return (
              <button
                key={ch.id}
                onClick={() => toggle(ch.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                style={{
                  background: done ? "rgba(var(--nous-accent-rgb),0.08)" : "var(--nous-card)",
                  border: `1px solid ${done ? "rgba(var(--nous-accent-rgb),0.25)" : "var(--nous-border)"}`,
                }}
              >
                <span className="text-base shrink-0">{ch.icon}</span>
                <span className="flex-1 text-[12px]" style={{ color: done ? "var(--nous-accent)" : "var(--nous-primary)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>
                  {ch.label}
                </span>
                <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--nous-accent)" }}>
                  +{ch.xp} XP
                </span>
                <div
                  className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: done ? "var(--nous-accent)" : "transparent", border: `1.5px solid ${done ? "var(--nous-accent)" : "var(--nous-border)"}` }}
                >
                  {done && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {completed.size === 3 && (
          <div className="text-center py-1 text-[11px] font-semibold animate-fadeIn" style={{ color: "var(--nous-accent)" }}>
            All challenges complete! Come back tomorrow.
          </div>
        )}
      </div>

      {/* ── Weekly recap ── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--nous-secondary)" }}>
          This week
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Meals logged", value: g.loggedFoodDays, max: 7, icon: "" },
            { label: "Workouts", value: g.totalWorkouts, max: 5, icon: "" },
            { label: "Classes", value: g.totalClassesLogged, max: 10, icon: "" },
            { label: "XP this week", value: g.xp, max: 500, icon: "" },
          ].map(({ label, value, max, icon }) => (
            <div
              key={label}
              className="rounded-xl p-3 space-y-2"
              style={{ background: "var(--nous-card)", border: "1px solid var(--nous-border)" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px]" style={{ color: "var(--nous-secondary)" }}>{label}</span>
              </div>
              <p className="text-xl font-bold leading-none" style={{ color: "var(--nous-primary)" }}>
                {typeof value === "number" && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              </p>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--nous-border)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.round((value / max) * 100))}%`, background: "linear-gradient(90deg, var(--nous-accent), var(--nous-accent2))" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Badges ── */}
      {earnedBadges.length > 0 && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--nous-secondary)" }}>
            Achievements ({earnedBadges.length}/{g.badges.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                title={badge.description}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium"
                style={{
                  background: "rgba(var(--nous-accent-rgb),0.12)",
                  border: "1px solid rgba(var(--nous-accent-rgb),0.25)",
                  color: "var(--nous-accent)",
                }}
              >
                <BadgeIcon type={badge.icon} earned />
                {badge.label}
              </div>
            ))}
          </div>
          {lockedBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  title={badge.description}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: "var(--nous-card)",
                    border: "1px solid var(--nous-border)",
                    color: "var(--nous-tertiary)",
                  }}
                >
                  <BadgeIcon type={badge.icon} earned={false} />
                  {badge.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── XP guide ── */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--nous-secondary)" }}>
          How to earn XP
        </p>
        <div className="space-y-1 text-[11px]" style={{ color: "var(--nous-secondary)" }}>
          {[
            { label: "Log a meal day", xp: "+10 XP" },
            { label: "Complete a workout", xp: "+50 XP" },
            { label: "High-volume session (≥5 000 kg)", xp: "+25 XP" },
            { label: "Class in calendar", xp: "+15 XP" },
            { label: "Food streak day", xp: "+5 XP" },
            { label: "Gym streak day", xp: "+8 XP" },
          ].map(({ label, xp }) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span className="font-medium" style={{ color: "var(--nous-accent)" }}>{xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature toggles ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--nous-border)" }}
      >
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
          style={{ background: "var(--nous-surface)" }}
          onClick={() => setShowConfig((v) => !v)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--nous-secondary)" }}>
            XP Sources
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={`transition-transform duration-200 ${showConfig ? "rotate-180" : ""}`}
            style={{ color: "var(--nous-secondary)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showConfig && (
          <div className="px-4 pb-4 space-y-3 animate-fadeIn" style={{ background: "var(--nous-surface)" }}>
            {(
              [
                { key: "food", label: "Food logging", desc: "+10 XP / day" },
                { key: "gym", label: "Gym workouts", desc: "+50 XP / session" },
                { key: "calendar", label: "Calendar classes", desc: "+15 XP / class" },
                { key: "notes", label: "Notes (future)", desc: "Coming soon" },
              ] as const
            ).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "var(--nous-primary)" }}>{label}</p>
                  <p className="text-[10px]" style={{ color: "var(--nous-secondary)" }}>{desc}</p>
                </div>
                <Toggle
                  checked={gamFeatures[key]}
                  onChange={(v) =>
                    updateSettings({
                      gamificationFeatures: { ...gamFeatures, [key]: v },
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
