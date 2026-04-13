"use client";

import React, { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { UserProfile } from "@/components/settings/UserProfile";
import { GamificationPanel } from "@/components/gamification/GamificationPanel";
import { useSettings } from "@/hooks/useSettings";

const ACCENT_PRESETS = [
  { label: "Teal",    value: "#2d8b8b" },
  { label: "Purple",  value: "#7c6bff" },
  { label: "Green",   value: "#30c48d" },
  { label: "Pink",    value: "#e879f9" },
  { label: "Blue",    value: "#60a5fa" },
  { label: "Orange",  value: "#fb923c" },
  { label: "Red",     value: "#f87171" },
  { label: "Slate",   value: "#94a3b8" },
];

function AccentColorPicker() {
  const { settings, updateSettings } = useSettings();
  const current = settings.accentColor ?? "#2d8b8b";

  const handleSelect = async (color: string) => {
    await updateSettings({ accentColor: color });
    document.documentElement.style.setProperty("--nous-accent", color);
    document.documentElement.style.setProperty("--nous-accent2", color);
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
    >
      <p className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>Accent Color</p>
      <div className="flex flex-wrap gap-2 items-center">
        {ACCENT_PRESETS.map((p) => (
          <button
            key={p.value}
            title={p.label}
            onClick={() => handleSelect(p.value)}
            className="w-7 h-7 rounded-full transition-all duration-150 flex items-center justify-center"
            style={{
              background: p.value,
              outline: current === p.value ? `2px solid ${p.value}` : "2px solid transparent",
              outlineOffset: "2px",
              transform: current === p.value ? "scale(1.15)" : "scale(1)",
            }}
          >
            {current === p.value && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}

        {/* Custom color via native picker */}
        <label
          title="Custom color"
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 relative overflow-hidden"
          style={{ border: "1.5px dashed var(--nous-border)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--nous-secondary)" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          <input
            type="color"
            value={current}
            onChange={(e) => handleSelect(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
}

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
          background: saved ? "rgba(92,158,122,0.12)" : "rgba(var(--nous-accent-rgb),0.08)",
          color: saved ? "var(--nous-success)" : "var(--nous-accent)",
          border: `1px solid ${saved ? "rgba(92,158,122,0.3)" : "rgba(var(--nous-accent-rgb),0.2)"}`,
        }}
      >
        {saved ? "Saved" : "Save Goals"}
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
          className="text-[32px] font-bold font-display text-nous-primary mt-0.5"
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
        <AccentColorPicker />
      </section>

      <div className="pt-8 text-center text-xs text-nous-secondary">
        <p>NOUS Productivity App © 2026</p>
        <p className="mt-1">v1.0.0</p>
      </div>
    </div>
  );
}
