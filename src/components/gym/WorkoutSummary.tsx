"use client";
import React from "react";
import { ExerciseEntry } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface WorkoutSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workoutType: string;
  duration: number;
  exercises: ExerciseEntry[];
  loading?: boolean;
}

export const WorkoutSummary = ({
  isOpen,
  onClose,
  onConfirm,
  workoutType,
  duration,
  exercises,
  loading,
}: WorkoutSummaryProps) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const totalVolume = exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets.reduce(
        (sAcc, s) => sAcc + (s.completed ? s.weight * s.reps : 0),
        0,
      ),
    0,
  );

  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  );

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center pt-4">
        {/* Trophy icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "linear-gradient(135deg, var(--nous-accent) 0%, var(--nous-accent2) 100%)",
            boxShadow: "0 8px 24px rgba(var(--nous-accent-rgb),0.35)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-nous-primary mb-1">
          Workout Complete!
        </h2>
        <p className="text-sm text-nous-secondary mb-6">
          {workoutType} Workout
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          <div className="bg-nous-surface rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-nous-secondary mb-1">
              Duration
            </p>
            <p className="text-lg font-bold text-nous-primary">
              {formatTime(duration)}
            </p>
          </div>
          <div className="bg-nous-surface rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-nous-secondary mb-1">
              Volume
            </p>
            <p className="text-lg font-bold text-nous-primary">
              {totalVolume.toLocaleString()}
              <span className="text-xs font-normal text-nous-secondary ml-0.5">
                kg
              </span>
            </p>
          </div>
          <div className="bg-nous-surface rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-nous-secondary mb-1">
              Sets
            </p>
            <p className="text-lg font-bold text-nous-primary">
              {completedSets}
              <span className="text-xs font-normal text-nous-secondary">
                /{totalSets}
              </span>
            </p>
          </div>
        </div>

        {/* Exercise breakdown */}
        <div className="w-full bg-nous-surface rounded-xl p-3 mb-6 text-left max-h-48 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold uppercase tracking-wider text-nous-secondary mb-2">
            Exercises
          </p>
          {exercises.map((ex, i) => {
            const exVolume = ex.sets.reduce(
              (acc, s) => acc + (s.completed ? s.weight * s.reps : 0),
              0,
            );
            const exCompleted = ex.sets.filter((s) => s.completed).length;
            return (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 border-b border-nous-border last:border-0"
              >
                <span className="text-sm text-nous-primary font-medium">
                  {ex.name}
                </span>
                <span className="text-xs text-nous-secondary">
                  {exCompleted} sets &middot; {exVolume}kg
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className="flex-1 shadow-lg shadow-nous-accent/30"
          >
            Save Workout
          </Button>
        </div>
      </div>
    </Modal>
  );
};
