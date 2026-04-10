import { useEffect, useState, useRef } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { FoodLog, GymSession, CalendarEvent } from "@/types";
import { orderBy, limit, where } from "firebase/firestore";
import { LEVEL_THRESHOLDS } from "@/lib/constants";
import toast from "react-hot-toast";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  icon: "food" | "gym" | "class" | "streak" | "star";
}

export interface RadarAxis {
  label: string;
  value: number; // 0–100
  rawLabel: string;
}

export interface GamificationData {
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  streak: number;
  gymStreak: number;
  totalWorkouts: number;
  totalMealsLogged: number;
  totalClassesLogged: number;
  loggedFoodDays: number;
  badges: Badge[];
  radar: RadarAxis[];
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelFromXP(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, LEVEL_THRESHOLDS.length);
}

function xpBoundsForLevel(level: number) {
  const idx = level - 1;
  const lo = LEVEL_THRESHOLDS[idx] ?? 0;
  const hi = LEVEL_THRESHOLDS[idx + 1] ?? lo + 2000;
  return { lo, hi };
}

/**
 * calcStreak — given an array of date strings (YYYY-MM-DD), returns the
 * number of consecutive days ending today or yesterday.
 */
function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

// How long (ms) to keep cached gamification data before re-fetching.
// Avoids re-running 310 Firestore reads every time the Settings page mounts.
const STALE_TIME_MS = 10 * 60 * 1000; // 10 minutes

const EMPTY: GamificationData = {
  xp: 0,
  level: 1,
  xpForCurrentLevel: 0,
  xpForNextLevel: 100,
  progressPercent: 0,
  streak: 0,
  gymStreak: 0,
  totalWorkouts: 0,
  totalMealsLogged: 0,
  totalClassesLogged: 0,
  loggedFoodDays: 0,
  badges: [],
  radar: [],
  loading: true,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGamification(): GamificationData {
  const { user, settings } = useStore();
  const { queryDocs } = useFirestore();
  const features = settings?.gamificationFeatures ?? { food: true, gym: true, calendar: true, notes: true };
  const [data, setData] = useState<GamificationData>(EMPTY);

  // Track when data was last fetched so we can skip re-fetching if fresh.
  // Using a ref (not state) so it doesn't trigger re-renders on its own.
  const lastFetchedAt = useRef<number>(0);
  // Track the feature flags used in the last fetch so we can bust the cache
  // when the user changes a toggle.
  const lastFeatures = useRef(features);
  // Track previously earned badge IDs so we can toast newly unlocked ones.
  // null = first load (don't toast), Set = subsequent loads (toast new ones).
  const prevEarnedIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // Skip the Firestore queries if the cached data is still fresh
    // AND the feature flags haven't changed since the last fetch.
    const featuresChanged =
      lastFeatures.current.food !== features.food ||
      lastFeatures.current.gym !== features.gym ||
      lastFeatures.current.calendar !== features.calendar;
    if (
      !data.loading &&
      !featuresChanged &&
      Date.now() - lastFetchedAt.current < STALE_TIME_MS
    ) {
      return;
    }
    lastFeatures.current = features;

    const load = async () => {
      // ── Date range filter ──────────────────────────────────────────────
      // Limit all queries to the last 60 days. This prevents loading the
      // entire history on every Settings page mount.
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000)
        .toISOString()
        .slice(0, 10);

      const [foodLogs, gymSessions, events] = await Promise.all([
        queryDocs<FoodLog>(
          "food_logs",
          where("date", ">=", sixtyDaysAgo),
          orderBy("date", "desc"),
          limit(60),
        ),
        queryDocs<GymSession>(
          "gym_sessions",
          where("date", ">=", sixtyDaysAgo),
          orderBy("date", "desc"),
          limit(50),
        ),
        // Events: filter by date so we don't pull the entire calendar history.
        queryDocs<CalendarEvent>(
          "events",
          where("date", ">=", sixtyDaysAgo),
          limit(100),
        ),
      ]);

      if (cancelled) return;

      // ── XP calculation ─────────────────────────────────────────────────

      let xp = 0;

      // Food: +10 XP per day that has at least one item logged.
      const loggedFoodDates = foodLogs
        .filter((l) => l.items && l.items.length > 0)
        .map((l) => l.date);
      if (features.food) xp += loggedFoodDates.length * 10;

      // Gym: +50 XP per session + bonus for high-volume sessions.
      const gymDates: string[] = [];
      gymSessions.forEach((s) => {
        gymDates.push(s.date.slice(0, 10));
        if (!features.gym) return;
        xp += 50;
        const volume = s.exercises.reduce(
          (total, ex) =>
            total +
            ex.sets.reduce(
              (st, set) => st + (set.completed ? set.weight * set.reps : 0),
              0,
            ),
          0,
        );
        if (volume >= 5000) xp += 25;
        if (volume >= 10000) xp += 25;
      });

      // Classes: +15 XP per class event in the calendar.
      const classCount = events.filter((e) => e.isClass).length;
      if (features.calendar) xp += classCount * 15;

      // Streak bonuses.
      const foodStreak = calcStreak(loggedFoodDates);
      const gymStreak = calcStreak(gymDates);
      if (features.food) xp += foodStreak * 5;
      if (features.gym) xp += gymStreak * 8;

      // ── Level ──────────────────────────────────────────────────────────

      const level = levelFromXP(xp);
      const { lo, hi } = xpBoundsForLevel(level);
      const progressPercent = Math.min(
        100,
        Math.round(((xp - lo) / (hi - lo)) * 100),
      );

      // ── Badges ─────────────────────────────────────────────────────────

      const totalMeals = foodLogs.reduce(
        (t, l) => t + (l.items?.length || 0),
        0,
      );

      const badges: Badge[] = [
        {
          id: "first_meal",
          label: "First Bite",
          description: "Log your first meal",
          earned: totalMeals >= 1,
          icon: "food",
        },
        {
          id: "food_week",
          label: "Consistent Eater",
          description: "Log food 7 days in a row",
          earned: foodStreak >= 7,
          icon: "streak",
        },
        {
          id: "first_workout",
          label: "Iron Start",
          description: "Complete your first workout",
          earned: gymSessions.length >= 1,
          icon: "gym",
        },
        {
          id: "five_workouts",
          label: "Iron Will",
          description: "Complete 5 workouts",
          earned: gymSessions.length >= 5,
          icon: "gym",
        },
        {
          id: "twenty_workouts",
          label: "Grind Mode",
          description: "Complete 20 workouts",
          earned: gymSessions.length >= 20,
          icon: "gym",
        },
        {
          id: "gym_streak",
          label: "No Days Off",
          description: "Work out 5 days in a row",
          earned: gymStreak >= 5,
          icon: "streak",
        },
        {
          id: "scholar",
          label: "Scholar",
          description: "Have 10 classes in your calendar",
          earned: classCount >= 10,
          icon: "class",
        },
        {
          id: "level5",
          label: "Rising Star",
          description: "Reach Level 5",
          earned: level >= 5,
          icon: "star",
        },
        {
          id: "level10",
          label: "Elite",
          description: "Reach Level 10",
          earned: level >= 10,
          icon: "star",
        },
      ];

      // ── Radar axes (all labels in English) ─────────────────────────────

      const cap = (v: number, max: number) =>
        Math.min(100, Math.round((v / max) * 100));

      const radar: RadarAxis[] = [
        {
          label: "Diet",
          value: cap(loggedFoodDates.length, 30),
          rawLabel: `${loggedFoodDates.length}d`,
        },
        {
          label: "Training",
          value: cap(gymSessions.length, 30),
          rawLabel: `${gymSessions.length}`,
        },
        {
          label: "Classes",
          value: cap(classCount, 20),
          rawLabel: `${classCount}`,
        },
        {
          label: "Streak",
          value: cap(foodStreak, 14),
          rawLabel: `${foodStreak}d`,
        },
        {
          label: "Strength",
          value: cap(gymStreak, 7),
          rawLabel: `${gymStreak}d`,
        },
        {
          label: "Level",
          value: progressPercent,
          rawLabel: `${progressPercent}%`,
        },
      ];

      lastFetchedAt.current = Date.now();

      const earnedNow = new Set(badges.filter((b) => b.earned).map((b) => b.id));
      // Only toast on subsequent loads — skip on first mount so all earned
      // badges don't fire on every page visit.
      if (prevEarnedIds.current !== null) {
        badges.forEach((badge) => {
          if (badge.earned && !prevEarnedIds.current!.has(badge.id)) {
            toast.success(`Achievement unlocked: ${badge.label}`, {
              duration: 4000,
            });
          }
        });
      }
      prevEarnedIds.current = earnedNow;

      setData({
        xp,
        level,
        xpForCurrentLevel: lo,
        xpForNextLevel: hi,
        progressPercent,
        streak: foodStreak,
        gymStreak,
        totalWorkouts: gymSessions.length,
        totalMealsLogged: totalMeals,
        totalClassesLogged: classCount,
        loggedFoodDays: loggedFoodDates.length,
        badges,
        radar,
        loading: false,
      });
    };

    load().catch((err) => {
      console.error("[useGamification] Failed to load data:", err);
      setData((d) => ({ ...d, loading: false }));
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryDocs, features.food, features.gym, features.calendar]);

  return data;
}
