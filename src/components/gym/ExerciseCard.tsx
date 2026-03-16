import React from "react";
import { ExerciseEntry, SetEntry } from "@/types";
import { SetRow } from "./SetRow";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store";

interface ExerciseCardProps {
  exercise: ExerciseEntry;
  exerciseIndex: number;
  onUpdate: (updatedExercise: ExerciseEntry) => void;
  onRemove: () => void;
}

export const ExerciseCard = ({
  exercise,
  exerciseIndex,
  onUpdate,
  onRemove,
}: ExerciseCardProps) => {
  const { startRestTimer, restTimerDuration } = useStore();
  const completedCount = exercise.sets.filter((s) => s.completed).length;

  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: SetEntry = {
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 10,
      completed: false,
    };
    onUpdate({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const updateSet = (setIndex: number, updatedSet: SetEntry) => {
    const oldSet = exercise.sets[setIndex];
    const newSets = [...exercise.sets];
    newSets[setIndex] = updatedSet;
    onUpdate({ ...exercise, sets: newSets });

    // Auto-start rest timer when a set is marked as completed
    if (!oldSet.completed && updatedSet.completed) {
      startRestTimer(restTimerDuration);
    }
  };

  const removeSet = (setIndex: number) => {
    onUpdate({
      ...exercise,
      sets: exercise.sets.filter((_, i) => i !== setIndex),
    });
  };

  return (
    <div className="bg-nous-surface/30 border border-nous-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg text-nous-primary">
            {exercise.name}
          </h3>
          {exercise.sets.length > 0 && (
            <span className="text-[10px] font-bold text-nous-secondary bg-nous-surface px-1.5 py-0.5 rounded">
              {completedCount}/{exercise.sets.length}
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-nous-secondary hover:text-red-400 transition-colors text-xs uppercase tracking-wider font-bold"
        >
          Remove
        </button>
      </div>

      {exercise.previousSets && exercise.previousSets.length > 0 && (
        <div className="mb-3 p-2 bg-nous-surface/50 rounded-lg text-xs text-nous-secondary">
          <span className="font-bold text-nous-accent uppercase mr-2">
            Last Session:
          </span>
          {exercise.previousSets.map((s, i) => (
            <span key={i} className="mr-2">
              {s.weight}kg x {s.reps}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {exercise.sets.map((set, i) => (
          <SetRow
            key={`${exerciseIndex}-${i}`}
            setEntry={set}
            setIndex={i}
            previousSet={exercise.previousSets?.[i]}
            onChange={(updated) => updateSet(i, updated)}
            onRemove={() => removeSet(i)}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={addSet}
          className="w-full text-xs uppercase tracking-wider"
        >
          + Add Set
        </Button>
      </div>
    </div>
  );
};
