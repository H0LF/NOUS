import React from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { GymSession, ExerciseEntry } from "@/types";
import { limit, orderBy, where } from "firebase/firestore";

interface WorkoutSelectorProps {
  onSelect: (type: string) => void;
}

const PRESETS = [
    { type: "Push", exercises: ["Bench Press", "Overhead Press", "Incline Dumbbell Press", "Lateral Raises", "Tricep Pushdowns"] },
    { type: "Pull", exercises: ["Deadlift", "Pull Ups", "Barbell Rows", "Face Pulls", "Bicep Curls"] },
    { type: "Legs", exercises: ["Squat", "Leg Press", "Romanian Deadlift", "Leg Extensions", "Calf Raises"] },
    { type: "Upper Body", exercises: ["Bench Press", "Barbell Rows", "Overhead Press", "Pull Ups"] },
    { type: "Lower Body", exercises: ["Squat", "Deadlift", "Lunges"] },
    { type: "Full Body", exercises: ["Squat", "Bench Press", "Deadlift", "Overhead Press"] },
];

export const WorkoutSelector = ({ onSelect }: WorkoutSelectorProps) => {
  const { queryDocs } = useFirestore();
  const { setExercises } = useStore();

  const handleSelect = async (preset: { type: string, exercises: string[] }) => {
    // Fetch last session of same type
    let previousExercises: ExerciseEntry[] = [];
    try {
        const history = await queryDocs<GymSession>("gym_sessions", where("workoutType", "==", preset.type), orderBy("date", "desc"), limit(1));
        if (history && history.length > 0) {
            previousExercises = history[0].exercises;
        }
    } catch (e) {
        console.error("Failed to fetch history", e);
    }

    // Build new exercises list
    const newExercises: ExerciseEntry[] = preset.exercises.map(name => {
        const prev = previousExercises.find(e => e.name === name);
        return {
            name,
            sets: prev ? [{ weight: prev.sets[0]?.weight || 20, reps: prev.sets[0]?.reps || 10, completed: false }] : [{ weight: 20, reps: 10, completed: false }],
            previousSets: prev ? prev.sets : undefined
        };
    });

    setExercises(newExercises);
    onSelect(preset.type);
  };
  
  const handleCustom = () => {
      setExercises([]);
      onSelect("Custom");
  };

  return (
    <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(p => (
            <button 
                key={p.type}
                onClick={() => handleSelect(p)}
                className="bg-nous-surface border border-nous-border hover:border-nous-accent hover:bg-nous-accent/5 rounded-xl p-4 text-left transition-all"
            >
                <span className="block font-bold text-nous-primary mb-1">{p.type}</span>
                <span className="block text-xs text-nous-secondary">{p.exercises.length} Exercises</span>
            </button>
        ))}
        <button 
            onClick={handleCustom}
            className="col-span-2 bg-nous-surface/50 border border-nous-border border-dashed hover:border-nous-accent hover:text-nous-accent rounded-xl p-4 flex items-center justify-center transition-all text-nous-secondary font-medium"
        >
            + Custom Workout
        </button>
    </div>
  );
};
