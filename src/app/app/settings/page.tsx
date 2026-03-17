"use client";

import React, { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { GeminiKeyInput } from "@/components/settings/GeminiKeyInput";
import { UserProfile } from "@/components/settings/UserProfile";
import { GamificationPanel } from "@/components/gamification/GamificationPanel";
import { useSettings } from "@/hooks/useSettings";

function GoalInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px]" style={{ color: "var(--nous-primary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 text-right text-[13px] px-2 py-1.5 rounded-lg outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--nous-border)",
            color: "var(--nous-primary)",
          }}
        />
        <span className="text-[12px] w-6" style={{ color: "var(--nous-secondary)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function NutritionGoals() {
  const { settings, updateSettings } = useSettings();
  const [calories, setCalories] = useState(settings.dailyCalorieGoal);
  const [protein, setProtein] = useState(settings.dailyProteinGoal);
  const [carbs, setCarbs] = useState(settings.dailyCarbsGoal);
  const [fat, setFat] = useState(settings.dailyFatGoal);
  const [saved, setSaved] = useState(false);

  // Sync when settings load from Firestore
  useEffect(() => {
    setCalories(settings.dailyCalorieGoal);
    setProtein(settings.dailyProteinGoal);
    setCarbs(settings.dailyCarbsGoal);
    setFat(settings.dailyFatGoal);
  }, [settings.dailyCalorieGoal, settings.dailyProteinGoal, settings.dailyCarbsGoal, settings.dailyFatGoal]);

  const handleSave = async () => {
    await updateSettings({
      dailyCalorieGoal: calories,
      dailyProteinGoal: protein,
      dailyCarbsGoal: carbs,
      dailyFatGoal: fat,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "var(--nous-surface)",
        border: "1px solid var(--nous-border)",
      }}
    >
      <GoalInput label="Calories" unit="kcal" value={calories} onChange={setCalories} />
      <GoalInput label="Protein" unit="g" value={protein} onChange={setProtein} />
      <GoalInput label="Carbs" unit="g" value={carbs} onChange={setCarbs} />
      <GoalInput label="Fat" unit="g" value={fat} onChange={setFat} />
      <button
        onClick={handleSave}
        className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all mt-1"
        style={{
          background: saved ? "rgba(48,196,141,0.15)" : "rgba(124,122,255,0.1)",
          color: saved ? "#30c48d" : "var(--nous-accent)",
          border: `1px solid ${saved ? "rgba(48,196,141,0.3)" : "rgba(124,122,255,0.2)"}`,
        }}
      >
        {saved ? "Saved ✓" : "Save Goals"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full space-y-6 max-w-2xl mx-auto w-full px-4 pt-12 pb-20 overflow-y-auto custom-scrollbar">
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-nous-secondary">
          Preferences
        </p>
        <h1
          className="text-[32px] font-bold text-nous-primary mt-0.5"
          style={{ fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Settings
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Account
        </h2>
        <UserProfile />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Progress
        </h2>
        <GamificationPanel />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Nutrition Goals
        </h2>
        <NutritionGoals />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Appearance
        </h2>
        <ThemeToggle />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Integration
        </h2>
        <GeminiKeyInput />
      </section>

      <div className="pt-8 text-center text-xs text-nous-secondary">
        <p>NOUS Productivity App © 2026</p>
        <p className="mt-1">v1.0.0</p>
      </div>
    </div>
  );
}
