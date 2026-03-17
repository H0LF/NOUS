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
    <div
      className="rounded-xl p-4 flex gap-5 items-center"
      style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
    >
      <div className="shrink-0">
        <CalorieRing consumed={totals.calories} goal={goals.dailyCalorieGoal} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5">
        {macros.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="font-medium" style={{ color: "var(--nous-primary)" }}>{m.label}</span>
              <span style={{ color: "var(--nous-secondary)" }}>
                {Math.round(m.value)}<span style={{ color: "var(--nous-tertiary)" }}>/{m.goal}{m.unit}</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--nous-bg)" }}>
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
