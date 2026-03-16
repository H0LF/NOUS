"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { WorkoutSelector } from "@/components/gym/WorkoutSelector";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { WorkoutHistory } from "@/components/gym/WorkoutHistory";
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
      user
  } = useStore();
  const { saveDoc } = useFirestore();
  const [tab, setTab] = useState<"workout" | "history">("workout");
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");

  // Stopwatch effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkoutType) {
        interval = setInterval(() => {
            setStopwatchSeconds(stopwatchSeconds + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkoutType, stopwatchSeconds, setStopwatchSeconds]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStartWorkout = (type: string) => {
      setActiveWorkoutType(type);
      setStopwatchSeconds(0);
      setTab("workout");
  };

  const handleFinishWorkout = async () => {
      if (!user || !activeWorkoutType) return;
      
      const totalVolume = exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (s.completed ? s.weight * s.reps : 0), 0), 0);
      const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
      
      if (!confirm(`Finish workout?\n\nDuration: ${formatTime(stopwatchSeconds)}\nVolume: ${totalVolume}kg\nCompleted Sets: ${completedSets}`)) {
          return;
      }
      
      const id = uuidv4();
      const session: GymSession = {
          id,
          userId: user.uid,
          date: new Date().toISOString(),
          workoutType: activeWorkoutType,
          duration: stopwatchSeconds,
          exercises: exercises
      };
      
      await saveDoc("gym_sessions", id, session);
      toast.success("Workout saved!");
      
      // Reset
      setActiveWorkoutType(null);
      setExercises([]);
      setStopwatchSeconds(0);
  };

  const cancelWorkout = () => {
      if(confirm("Cancel workout? Current progress will be lost.")) {
          setActiveWorkoutType(null);
          setExercises([]);
          setStopwatchSeconds(0);
      }
  };

  const handleUpdateExercise = (index: number, updated: ExerciseEntry) => {
      const newExercises = [...exercises];
      newExercises[index] = updated;
      setExercises(newExercises);
  };

  const handleRemoveExercise = (index: number) => {
      const newExercises = exercises.filter((_, i) => i !== index);
      setExercises(newExercises);
  };

  const handleAddExercise = () => {
      if (!newExerciseName.trim()) return;
      
      const newEx: ExerciseEntry = {
          name: newExerciseName,
          sets: [{ weight: 0, reps: 0, completed: false }]
      };
      
      setExercises([...exercises, newEx]);
      setNewExerciseName("");
      setIsAddExerciseOpen(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto w-full px-4 pt-12">
         <div className="flex items-center justify-between pb-2">
             <div>
               <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-nous-secondary">Training</p>
               <h1 className="text-[32px] font-bold text-nous-primary mt-0.5" style={{ fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                 Gym
               </h1>
             </div>
             
             {activeWorkoutType && (
                 <div className="flex items-center gap-2 bg-nous-surface/50 border border-nous-border rounded-full px-3 py-1 font-mono text-sm text-nous-accent animate-pulse">
                     <span>{formatTime(stopwatchSeconds)}</span>
                 </div>
             )}
         </div>

         {/* Tabs */}
         <div className="flex p-1 bg-nous-surface rounded-xl">
             <button 
                onClick={() => setTab("workout")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === "workout" ? "bg-nous-bg text-nous-accent shadow-sm" : "text-nous-secondary hover:text-nous-primary"
                }`}
             >
                 Current Workout
             </button>
             <button 
                onClick={() => setTab("history")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === "history" ? "bg-nous-bg text-nous-accent shadow-sm" : "text-nous-secondary hover:text-nous-primary"
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
                                 <button onClick={cancelWorkout} className="text-xs text-red-500 hover:underline">
                                     Cancel
                                 </button>
                             </div>
                             
                             {exercises.map((ex, i) => (
                                 <ExerciseCard 
                                    key={i} 
                                    exercise={ex} 
                                    exerciseIndex={i} 
                                    onUpdate={(u) => handleUpdateExercise(i, u)} 
                                    onRemove={() => handleRemoveExercise(i)}
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
                                    onClick={handleFinishWorkout}
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
         <Modal isOpen={isAddExerciseOpen} onClose={() => setIsAddExerciseOpen(false)} title="Add Exercise">
             <div className="space-y-4">
                 <Input 
                    label="Exercise Name" 
                    value={newExerciseName} 
                    onChange={(e) => setNewExerciseName(e.target.value)} 
                    placeholder="e.g. Leg Extension"
                    autoFocus
                 />
                 <div className="flex justify-end gap-2 pt-2">
                     <Button variant="ghost" onClick={() => setIsAddExerciseOpen(false)}>Cancel</Button>
                     <Button onClick={handleAddExercise}>Add</Button>
                 </div>
             </div>
         </Modal>
    </div>
  );
}
