import { useEffect, useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { FoodLog, GymSession, CalendarEvent } from "@/types";
import { orderBy, limit } from "firebase/firestore";

export interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  icon: "food" | "gym" | "class" | "streak" | "star";
}

export interface RadarAxis {
  label: string;
  value: number; // 0-100
  rawLabel: string;
}

export interface GamificationData {
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  streak: number; // food logging streak in days
  gymStreak: number;
  totalWorkouts: number;
  totalMealsLogged: number;
  totalClassesLogged: number;
  loggedFoodDays: number;
  badges: Badge[];
  radar: RadarAxis[];
  loading: boolean;
}

// XP thresholds per level (cumulative)
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500,
];

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

export function useGamification(): GamificationData {
  const { user } = useStore();
  const { queryDocs } = useFirestore();
  const [data, setData] = useState<GamificationData>({
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
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [foodLogs, gymSessions, events] = await Promise.all([
        queryDocs<FoodLog>("food_logs", orderBy("date", "desc"), limit(60)),
        queryDocs<GymSession>(
          "gym_sessions",
          orderBy("date", "desc"),
          limit(50),
        ),
        queryDocs<CalendarEvent>("events", limit(200)),
      ]);

      if (cancelled) return;

      // ── XP calculation ──────────────────────────────────────────────────────
      let xp = 0;

      // Food: +10 XP per day with at least one meal logged
      const loggedFoodDates = foodLogs
        .filter((l) => {
          const meals = l.meals;
          return (
            meals.breakfast.length +
              meals.lunch.length +
              meals.dinner.length +
              meals.snacks.length >
            0
          );
        })
        .map((l) => l.date);
      xp += loggedFoodDates.length * 10;

      // Gyms: +50 XP per session + bonus for volume
      const gymDates: string[] = [];
      gymSessions.forEach((s) => {
        gymDates.push(s.date.slice(0, 10));
        xp += 50;
        const vol = s.exercises.reduce(
          (t, ex) =>
            t +
            ex.sets.reduce(
              (st, set) => st + (set.completed ? set.weight * set.reps : 0),
              0,
            ),
          0,
        );
        if (vol >= 5000) xp += 25;
        if (vol >= 10000) xp += 25;
      });

      // Classes: +15 XP per unique class event (simplified: count events)
      const classCount = events.filter((e) => e.isClass).length;
      xp += classCount * 15;

      // Streaks
      const foodStreak = calcStreak(loggedFoodDates);
      const gymStreak = calcStreak(gymDates);
      // Streak bonus XP
      xp += foodStreak * 5;
      xp += gymStreak * 8;

      // ── Level ───────────────────────────────────────────────────────────────
      const level = levelFromXP(xp);
      const { lo, hi } = xpBoundsForLevel(level);
      const progressPercent = Math.min(
        100,
        Math.round(((xp - lo) / (hi - lo)) * 100),
      );

      // ── Badges ──────────────────────────────────────────────────────────────
      const totalMeals = foodLogs.reduce(
        (t, l) =>
          t +
          l.meals.breakfast.length +
          l.meals.lunch.length +
          l.meals.dinner.length +
          l.meals.snacks.length,
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

      const cap = (v: number, max: number) =>
        Math.min(100, Math.round((v / max) * 100));

      const radar: RadarAxis[] = [
        {
          label: "Dieta",
          value: cap(loggedFoodDates.length, 30),
          rawLabel: `${loggedFoodDates.length}d`,
        },
        {
          label: "Treino",
          value: cap(gymSessions.length, 30),
          rawLabel: `${gymSessions.length}`,
        },
        {
          label: "Aulas",
          value: cap(classCount, 20),
          rawLabel: `${classCount}`,
        },
        {
          label: "Streak",
          value: cap(foodStreak, 14),
          rawLabel: `${foodStreak}d`,
        },
        { label: "Força", value: cap(gymStreak, 7), rawLabel: `${gymStreak}d` },
        {
          label: "Nível",
          value: progressPercent,
          rawLabel: `${progressPercent}%`,
        },
      ];

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

    load().catch(() => setData((d) => ({ ...d, loading: false })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return data;
}
