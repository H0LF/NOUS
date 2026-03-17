"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { WorkoutHistory } from "@/components/gym/WorkoutHistory";
import { WorkoutPlans } from "@/components/gym/WorkoutPlans";
import { RestTimer } from "@/components/gym/RestTimer";
import { WorkoutSummary } from "@/components/gym/WorkoutSummary";
import { ExercisePicker } from "@/components/gym/ExercisePicker";
import { Button } from "@/components/ui/Button";
import { GymSession, ExerciseEntry, SetEntry, TemplateExercise } from "@/types";
import { ExerciseInfo } from "@/lib/exercises";
import { orderBy, limit } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

export default function GymPage() {
  const {
    activeWorkoutType,
    setActiveWorkoutType,
    exercises,
    setExercises,
    stopwatchSeconds,
    setStopwatchSeconds,
    stopRestTimer,
    user,
  } = useStore();
  const { saveDoc, queryDocs } = useFirestore();
  const [tab, setTab] = useState<"plans" | "history">("plans");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeWorkoutType) {
      intervalRef.current = setInterval(() => {
        setStopwatchSeconds(useStore.getState().stopwatchSeconds + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeWorkoutType, setStopwatchSeconds]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const recentSessionsRef = useRef<GymSession[] | null>(null);

  const handleAddExercise = async (info: ExerciseInfo) => {
    if (recentSessionsRef.current === null) {
      try {
        recentSessionsRef.current = await queryDocs<GymSession>(
          "gym_sessions",
          orderBy("date", "desc"),
          limit(20),
        );
      } catch {
        recentSessionsRef.current = [];
      }
    }

    let previousSets: SetEntry[] | undefined;
    for (const session of recentSessionsRef.current) {
      const match = session.exercises.find((e) => e.name === info.name);
      if (match) {
        previousSets = match.sets.filter((s) => s.completed);
        break;
      }
    }

    const lastSet = previousSets?.[0];
    const newEx: ExerciseEntry = {
      name: info.name,
      sets: [{ weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 10, completed: false }],
      previousSets,
    };

    setExercises([...exercises, newEx]);
    if (!activeWorkoutType) {
      setActiveWorkoutType("Workout");
      setStopwatchSeconds(0);
    }
  };

  const handleLoadPlan = async (templateExercises: TemplateExercise[]) => {
    if (recentSessionsRef.current === null) {
      try {
        recentSessionsRef.current = await queryDocs<GymSession>(
          "gym_sessions",
          orderBy("date", "desc"),
          limit(20),
        );
      } catch {
        recentSessionsRef.current = [];
      }
    }

    const newExercises: ExerciseEntry[] = templateExercises.map(ex => {
      let previousSets: SetEntry[] | undefined;
      for (const session of recentSessionsRef.current!) {
        const match = session.exercises.find(e => e.name === ex.name);
        if (match) { previousSets = match.sets.filter(s => s.completed); break; }
      }
      const lastSet = previousSets?.[0];
      return {
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          weight: lastSet?.weight ?? ex.weight,
          reps: lastSet?.reps ?? ex.reps,
          completed: false,
        })),
        previousSets,
      };
    });

    setExercises([...exercises, ...newExercises]);
    if (!activeWorkoutType) {
      setActiveWorkoutType("Workout");
      setStopwatchSeconds(0);
    }
  };

  const handleFinishWorkout = async () => {
    if (!user) return;
    setIsSaving(true);
    const id = uuidv4();
    const session: GymSession = {
      id,
      userId: user.uid,
      date: new Date().toISOString(),
      workoutType: activeWorkoutType || "Workout",
      duration: stopwatchSeconds,
      exercises: exercises.map(({ previousSets: _prev, ...rest }) => rest),
    };
    await saveDoc("gym_sessions", id, session);
    toast.success("Workout saved!");
    setActiveWorkoutType(null);
    setExercises([]);
    setStopwatchSeconds(0);
    stopRestTimer();
    setIsSummaryOpen(false);
    setIsSaving(false);
    recentSessionsRef.current = null;
  };

  const cancelWorkout = () => {
    setActiveWorkoutType(null);
    setExercises([]);
    setStopwatchSeconds(0);
    stopRestTimer();
    setIsCancelOpen(false);
    recentSessionsRef.current = null;
  };

  const handleUpdateExercise = (index: number, updated: ExerciseEntry) => {
    const newExercises = [...exercises];
    newExercises[index] = updated;
    setExercises(newExercises);
  };

  const handleRemoveExercise = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index);
    setExercises(updated);
    if (updated.length === 0 && activeWorkoutType) {
      setActiveWorkoutType(null);
      setStopwatchSeconds(0);
      stopRestTimer();
    }
  };

  const addedNames = exercises.map((e) => e.name);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4 pt-12 pb-20 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-nous-secondary">
            Training
          </p>
          <h1
            className="text-[32px] font-bold text-nous-primary mt-0.5"
            style={{ fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 1.1 }}
          >
            Gym
          </h1>
        </div>
        {activeWorkoutType && (
          <div className="flex items-center gap-2 bg-nous-surface/50 border border-nous-border rounded-full px-3.5 py-1.5">
            <div className="w-2 h-2 rounded-full bg-nous-accent animate-pulse" />
            <span className="font-mono text-sm font-semibold text-nous-accent">
              {formatTime(stopwatchSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Active workout section — always visible when workout is in progress */}
      {exercises.length > 0 && (
        <div className="space-y-3 mb-5 animate-fadeIn">
          {/* Workout sub-header */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "#30c48d" }} />
              <span className="text-xs font-semibold text-nous-secondary uppercase tracking-wider">
                {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCancelOpen(true)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
              >
                Clear
              </button>
              <Button size="sm" variant="primary" onClick={() => setIsSummaryOpen(true)}>
                Finish
              </Button>
            </div>
          </div>

          <RestTimer />

          {exercises.map((ex, i) => (
            <ExerciseCard
              key={`${ex.name}-${i}`}
              exercise={ex}
              exerciseIndex={i}
              onUpdate={(u) => handleUpdateExercise(i, u)}
              onRemove={() => handleRemoveExercise(i)}
            />
          ))}

          <Button
            variant="secondary"
            onClick={() => setIsPickerOpen(true)}
            className="w-full border-dashed"
          >
            + Add Exercise
          </Button>
        </div>
      )}

      {/* Tabs — Plans & History */}
      <div className="flex p-1 bg-nous-surface rounded-xl mb-4">
        <button
          onClick={() => setTab("plans")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "plans"
              ? "bg-nous-bg text-nous-accent shadow-sm"
              : "text-nous-secondary hover:text-nous-primary"
          }`}
        >
          Plans
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "history"
              ? "bg-nous-bg text-nous-accent shadow-sm"
              : "text-nous-secondary hover:text-nous-primary"
          }`}
        >
          History
        </button>
      </div>

      {tab === "plans" && <WorkoutPlans onLoadPlan={handleLoadPlan} />}
      {tab === "history" && <WorkoutHistory />}

      {/* Exercise Picker */}
      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(info) => { handleAddExercise(info); }}
        addedExercises={addedNames}
      />

      {/* Cancel Confirmation */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCancelOpen(false)} />
          <div
            className="relative rounded-2xl p-6 max-w-sm w-full mx-4 animate-fadeUp"
            style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
          >
            <h3 className="text-lg font-bold text-nous-primary mb-2">Clear workout?</h3>
            <p className="text-sm text-nous-secondary mb-6">All exercises and progress will be lost.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsCancelOpen(false)} className="flex-1">Keep</Button>
              <Button variant="danger" onClick={cancelWorkout} className="flex-1">Clear All</Button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Summary Modal */}
      <WorkoutSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        onConfirm={handleFinishWorkout}
        workoutType={activeWorkoutType || "Workout"}
        duration={stopwatchSeconds}
        exercises={exercises}
        loading={isSaving}
      />
    </div>
  );
}
