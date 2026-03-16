import React from "react";
import { UserSettings } from "@/types";
import { CalorieRing } from "./CalorieRing";

interface MacroSummaryProps {
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  goals: UserSettings;
}

export const MacroSummary = ({ totals, goals }: MacroSummaryProps) => {
  const getProgress = (value: number, goal: number) => Math.min((value / goal) * 100, 100);

  const macros = [
      { label: "Protein", value: totals.protein, goal: goals.dailyProteinGoal, color: "bg-blue-500", unit: "g" },
      { label: "Carbs", value: totals.carbs, goal: goals.dailyCarbsGoal, color: "bg-orange-500", unit: "g" },
      { label: "Fat", value: totals.fat, goal: goals.dailyFatGoal, color: "bg-yellow-500", unit: "g" },
      { label: "Fiber", value: totals.fiber, goal: 30, color: "bg-green-500", unit: "g" }, // Default fiber goal 30g
  ];

  return (
    <div className="bg-nous-surface/30 border border-nous-border rounded-xl p-4 flex gap-4">
        <div className="flex-shrink-0">
            <CalorieRing consumed={totals.calories} goal={goals.dailyCalorieGoal} />
        </div>
        
        <div className="flex-1 flex flex-col justify-center gap-3">
            {macros.map(m => (
                <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-nous-primary">{m.label}</span>
                        <span className="text-nous-secondary">{Math.round(m.value)} / {m.goal}{m.unit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-nous-surface rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${m.color}`}
                            style={{ width: `${getProgress(m.value, m.goal)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
