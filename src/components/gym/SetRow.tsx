"use client";
import React, { useEffect, useState } from "react";
import { SetEntry } from "@/types";

interface SetRowProps {
  setEntry: SetEntry;
  setIndex: number;
  previousSet?: SetEntry;
  onChange: (updatedSet: SetEntry) => void;
  onRemove: () => void;
}

export const SetRow = ({
  setEntry,
  setIndex,
  previousSet,
  onChange,
  onRemove,
}: SetRowProps) => {
  const [weight, setWeight] = useState(setEntry.weight.toString());
  const [reps, setReps] = useState(setEntry.reps);
  const [completed, setCompleted] = useState(setEntry.completed);

  useEffect(() => {
    setWeight(setEntry.weight.toString());
    setReps(setEntry.reps);
    setCompleted(setEntry.completed);
  }, [setEntry]);

  const updateSet = (updates: Partial<SetEntry>) => {
    onChange({ ...setEntry, ...updates });
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWeight(val);
    const num = parseFloat(val);
    if (!isNaN(num)) updateSet({ weight: num });
  };

  const handleRepsChange = (delta: number) => {
    const newReps = Math.max(1, reps + delta);
    setReps(newReps);
    updateSet({ reps: newReps });
  };

  const toggleCompleted = () => {
    const newState = !completed;
    setCompleted(newState);
    updateSet({ completed: newState });
  };

  // Show improvement indicator vs previous set
  const weightDiff =
    previousSet && setEntry.weight !== 0
      ? setEntry.weight - previousSet.weight
      : null;

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
        completed ? "bg-nous-success/20" : "bg-transparent"
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-nous-surface text-[10px] font-bold text-nous-secondary">
        {setIndex + 1}
      </div>

      <div className="flex-1 flex items-center gap-1">
        <input
          type="number"
          step="0.5"
          value={weight}
          onChange={handleWeightChange}
          className="w-16 bg-nous-surface border border-nous-border rounded px-2 py-1 text-center text-sm outline-none focus:border-nous-accent"
        />
        <span className="text-xs text-nous-secondary">kg</span>
        {weightDiff !== null && weightDiff !== 0 && (
          <span
            className={`text-[9px] font-bold ${weightDiff > 0 ? "text-nous-success" : "text-red-400"}`}
          >
            {weightDiff > 0 ? "+" : ""}
            {weightDiff}
          </span>
        )}
      </div>

      <span className="text-nous-secondary text-xs">x</span>

      <div className="flex items-center bg-nous-surface rounded border border-nous-border">
        <button
          onClick={() => handleRepsChange(-1)}
          className="px-2 py-1 text-nous-secondary hover:bg-nous-bg hover:text-nous-primary transition-colors"
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-medium">{reps}</span>
        <button
          onClick={() => handleRepsChange(1)}
          className="px-2 py-1 text-nous-secondary hover:bg-nous-bg hover:text-nous-primary transition-colors"
        >
          +
        </button>
      </div>

      <button
        onClick={toggleCompleted}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${
          completed
            ? "bg-nous-success border-nous-success text-white shadow-lg shadow-nous-success/30"
            : "bg-nous-surface border-nous-border text-nous-secondary hover:border-nous-accent hover:text-nous-accent"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      <button
        onClick={onRemove}
        className="text-nous-secondary hover:text-red-400 transition-colors ml-1"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};
