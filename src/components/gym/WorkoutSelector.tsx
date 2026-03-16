import React, { useEffect, useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { GymSession, ExerciseEntry } from "@/types";
import { limit, orderBy, where } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

interface WorkoutSelectorProps {
  onSelect: (type: string) => void;
}

const PRESETS: {
  type: string;
  exercises: string[];
  icon: React.ReactNode;
  muscles: string;
}[] = [
  {
    type: "Push",
    exercises: [
      "Bench Press",
      "Overhead Press",
      "Incline Dumbbell Press",
      "Lateral Raises",
      "Tricep Pushdowns",
    ],
    muscles: "Chest, Shoulders, Triceps",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 1 1 4 0Z" />
      </svg>
    ),
  },
  {
    type: "Pull",
    exercises: [
      "Deadlift",
      "Pull Ups",
      "Barbell Rows",
      "Face Pulls",
      "Bicep Curls",
    ],
    muscles: "Back, Biceps, Rear Delts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V8" /><path d="m5 12 7-4 7 4" /><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
    ),
  },
  {
    type: "Legs",
    exercises: [
      "Squat",
      "Leg Press",
      "Romanian Deadlift",
      "Leg Extensions",
      "Calf Raises",
    ],
    muscles: "Quads, Hamstrings, Glutes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M6 20V10" /><path d="M12 4v4" /><path d="M6 10h12" /><circle cx="12" cy="4" r="2" />
      </svg>
    ),
  },
  {
    type: "Upper Body",
    exercises: [
      "Bench Press",
      "Barbell Rows",
      "Overhead Press",
      "Pull Ups",
    ],
    muscles: "Chest, Back, Shoulders",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" /><path d="M6 20v-4" /><path d="M18 20v-4" /><path d="M6 8V4" /><path d="M18 8V4" /><path d="M3 12h18" />
      </svg>
    ),
  },
  {
    type: "Lower Body",
    exercises: ["Squat", "Deadlift", "Lunges"],
    muscles: "Quads, Glutes, Hamstrings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
      </svg>
    ),
  },
  {
    type: "Full Body",
    exercises: [
      "Squat",
      "Bench Press",
      "Deadlift",
      "Overhead Press",
    ],
    muscles: "All Major Groups",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
  },
];

export const WorkoutSelector = ({ onSelect }: WorkoutSelectorProps) => {
  const { queryDocs } = useFirestore();
  const { setExercises, user } = useStore();
  const [lastSessions, setLastSessions] = useState<Record<string, GymSession>>({});
  const [loadingType, setLoadingType] = useState<string | null>(null);

  // Fetch last session per workout type on mount
  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      const results: Record<string, GymSession> = {};
      for (const preset of PRESETS) {
        try {
          const history = await queryDocs<GymSession>(
            "gym_sessions",
            where("workoutType", "==", preset.type),
            orderBy("date", "desc"),
            limit(1),
          );
          if (history && history.length > 0) {
            results[preset.type] = history[0];
          }
        } catch {
          // Ignore — no history for this type
        }
      }
      setLastSessions(results);
    };
    fetchHistory();
  }, [user, queryDocs]);

  const handleSelect = async (preset: (typeof PRESETS)[number]) => {
    setLoadingType(preset.type);

    const lastSession = lastSessions[preset.type];
    const previousExercises = lastSession?.exercises || [];

    // Build exercises with ALL sets from previous session (not just 1)
    const newExercises: ExerciseEntry[] = preset.exercises.map((name) => {
      const prev = previousExercises.find((e) => e.name === name);
      if (prev && prev.sets.length > 0) {
        return {
          name,
          sets: prev.sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            completed: false,
          })),
          previousSets: prev.sets,
        };
      }
      return {
        name,
        sets: [{ weight: 20, reps: 10, completed: false }],
      };
    });

    setExercises(newExercises);
    setLoadingType(null);
    onSelect(preset.type);
  };

  const handleCustom = () => {
    setExercises([]);
    onSelect("Custom");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-nous-secondary font-medium mb-1">
        Choose a workout
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((p) => {
          const last = lastSessions[p.type];
          const isLoading = loadingType === p.type;
          return (
            <button
              key={p.type}
              onClick={() => handleSelect(p)}
              disabled={isLoading}
              className="bg-nous-surface border border-nous-border hover:border-nous-accent hover:bg-nous-accent/5 rounded-xl p-4 text-left transition-all group disabled:opacity-60"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-nous-accent/10 text-nous-accent flex items-center justify-center group-hover:bg-nous-accent/20 transition-colors">
                  {p.icon}
                </div>
                <span className="font-bold text-nous-primary">{p.type}</span>
              </div>
              <span className="block text-[11px] text-nous-secondary mb-1">
                {p.muscles}
              </span>
              <span className="block text-[10px] text-nous-tertiary">
                {p.exercises.length} exercises
                {last && (
                  <>
                    {" "}
                    &middot; last{" "}
                    {formatDistanceToNow(new Date(last.date), {
                      addSuffix: false,
                    })}{" "}
                    ago
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={handleCustom}
        className="w-full bg-nous-surface/50 border border-nous-border border-dashed hover:border-nous-accent hover:text-nous-accent rounded-xl p-4 flex items-center justify-center transition-all text-nous-secondary font-medium"
      >
        + Custom Workout
      </button>
    </div>
  );
};
