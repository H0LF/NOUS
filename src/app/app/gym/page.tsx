"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { WorkoutSelector } from "@/components/gym/WorkoutSelector";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { WorkoutHistory } from "@/components/gym/WorkoutHistory";
import { RestTimer } from "@/components/gym/RestTimer";
import { WorkoutSummary } from "@/components/gym/WorkoutSummary";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { GymSession, ExerciseEntry } from "@/types";
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
  const { saveDoc } = useFirestore();
  const [tab, setTab] = useState<"workout" | "history">("workout");
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");

  // Stable stopwatch using ref — no drift, no re-render dependency
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

  const handleStartWorkout = (type: string) => {
    setActiveWorkoutType(type);
    setStopwatchSeconds(0);
    setTab("workout");
  };

  const handleFinishWorkout = async () => {
    if (!user || !activeWorkoutType) return;
    setIsSaving(true);

    const id = uuidv4();
    const session: GymSession = {
      id,
      userId: user.uid,
      date: new Date().toISOString(),
      workoutType: activeWorkoutType,
      duration: stopwatchSeconds,
      exercises,
    };

    await saveDoc("gym_sessions", id, session);
    toast.success("Workout saved!");

    // Reset
    setActiveWorkoutType(null);
    setExercises([]);
    setStopwatchSeconds(0);
    stopRestTimer();
    setIsSummaryOpen(false);
    setIsSaving(false);
  };

  const cancelWorkout = () => {
    setActiveWorkoutType(null);
    setExercises([]);
    setStopwatchSeconds(0);
    stopRestTimer();
    setIsCancelOpen(false);
  };

  const handleUpdateExercise = (index: number, updated: ExerciseEntry) => {
    const newExercises = [...exercises];
    newExercises[index] = updated;
    setExercises(newExercises);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleAddExercise = () => {
    if (!newExerciseName.trim()) return;

    const newEx: ExerciseEntry = {
      name: newExerciseName.trim(),
      sets: [{ weight: 0, reps: 10, completed: false }],
    };

    setExercises([...exercises, newEx]);
    setNewExerciseName("");
    setIsAddExerciseOpen(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto w-full px-4 pt-12">
      <div className="flex items-center justify-between pb-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-nous-secondary">
            Training
          </p>
          <h1
            className="text-[32px] font-bold text-nous-primary mt-0.5"
            style={{
              fontStyle: "italic",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Gym
          </h1>
        </div>

        {activeWorkoutType && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-nous-surface/50 border border-nous-border rounded-full px-3.5 py-1.5">
              <div className="w-2 h-2 rounded-full bg-nous-accent animate-pulse" />
              <span className="font-mono text-sm font-semibold text-nous-accent">
                {formatTime(stopwatchSeconds)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-nous-surface rounded-xl">
        <button
          onClick={() => setTab("workout")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "workout"
              ? "bg-nous-bg text-nous-accent shadow-sm"
              : "text-nous-secondary hover:text-nous-primary"
          }`}
        >
          Current Workout
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

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {tab === "workout" && (
          <>
            {!activeWorkoutType ? (
              <WorkoutSelector onSelect={handleStartWorkout} />
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-nous-primary">
                    {activeWorkoutType} Workout
                  </h2>
                  <button
                    onClick={() => setIsCancelOpen(true)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {/* Rest Timer */}
                <RestTimer />

                {exercises.map((ex) => (
                  <ExerciseCard
                    key={ex.name}
                    exercise={ex}
                    exerciseIndex={exercises.indexOf(ex)}
                    onUpdate={(u) =>
                      handleUpdateExercise(exercises.indexOf(ex), u)
                    }
                    onRemove={() =>
                      handleRemoveExercise(exercises.indexOf(ex))
                    }
                  />
                ))}

                <div className="flex flex-col gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsAddExerciseOpen(true)}
                    className="w-full border-dashed"
                  >
                    + Add Exercise
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setIsSummaryOpen(true)}
                    className="w-full shadow-lg shadow-nous-accent/30 mt-4"
                  >
                    Finish Workout
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "history" && <WorkoutHistory />}
      </div>

      {/* Add Exercise Modal */}
      <Modal
        isOpen={isAddExerciseOpen}
        onClose={() => setIsAddExerciseOpen(false)}
        title="Add Exercise"
      >
        <div className="space-y-4">
          <Input
            label="Exercise Name"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddExercise()}
            placeholder="e.g. Leg Extension"
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsAddExerciseOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddExercise}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Workout?"
      >
        <div className="space-y-4">
          <p className="text-sm text-nous-secondary">
            Current progress will be lost. This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsCancelOpen(false)}>
              Keep Training
            </Button>
            <Button variant="danger" onClick={cancelWorkout}>
              Discard Workout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Workout Summary Modal */}
      <WorkoutSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        onConfirm={handleFinishWorkout}
        workoutType={activeWorkoutType || ""}
        duration={stopwatchSeconds}
        exercises={exercises}
        loading={isSaving}
      />
    </div>
  );
}
