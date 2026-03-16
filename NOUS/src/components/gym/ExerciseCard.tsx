import React from "react";
import { ExerciseEntry, SetEntry } from "@/types";
import { SetRow } from "./SetRow";
import { Button } from "@/components/ui/Button";

interface ExerciseCardProps {
  exercise: ExerciseEntry;
  exerciseIndex: number;
  onUpdate: (updatedExercise: ExerciseEntry) => void;
  onRemove: () => void;
}

export const ExerciseCard = ({ exercise, exerciseIndex, onUpdate, onRemove }: ExerciseCardProps) => {
  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newWeight = lastSet ? lastSet.weight : 0;
    const newReps = lastSet ? lastSet.reps : 10;
    
    const newSet: SetEntry = {
        weight: newWeight,
        reps: newReps,
        completed: false
    };
    
    onUpdate({
        ...exercise,
        sets: [...exercise.sets, newSet]
    });
  };

  const updateSet = (setIndex: number, updatedSet: SetEntry) => {
    const newSets = [...exercise.sets];
    newSets[setIndex] = updatedSet;
    onUpdate({
        ...exercise,
        sets: newSets
    });
  };

  const removeSet = (setIndex: number) => {
    const newSets = exercise.sets.filter((_, i) => i !== setIndex);
    onUpdate({
        ...exercise,
        sets: newSets
    });
  };

  return (
    <div className="bg-nous-surface/30 border border-nous-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
             <h3 className="font-semibold text-lg text-nous-primary">{exercise.name}</h3>
             <button onClick={onRemove} className="text-nous-secondary hover:text-red-500 transition-colors text-xs uppercase tracking-wider font-bold">
                 Remove Example
             </button>
        </div>
        
        {exercise.previousSets && exercise.previousSets.length > 0 && (
             <div className="mb-3 p-2 bg-nous-surface/50 rounded-lg text-xs text-nous-secondary">
                 <span className="font-bold text-nous-accent uppercase mr-2">Last Session:</span>
                 {exercise.previousSets.map((s, i) => (
                    <span key={i} className="mr-2">
                        {s.weight}kg × {s.reps}
                    </span>
                 ))}
             </div>
        )}
        
        <div className="space-y-1">
            {exercise.sets.map((set, i) => (
                <SetRow 
                    key={i} 
                    setEntry={set} 
                    setIndex={i} 
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
