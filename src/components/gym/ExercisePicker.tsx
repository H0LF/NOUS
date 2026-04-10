"use client";

import React, { useState, useMemo } from "react";
import {
  EXERCISES,
  MUSCLE_GROUPS,
  MUSCLE_COLORS,
  EQUIPMENT_LABELS,
  type MuscleGroup,
  type ExerciseInfo,
} from "@/lib/exercises";

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseInfo) => void;
  addedExercises: string[];
}

/* ─── Muscle Group SVG Icons ─── */
const MuscleIcon = ({ muscle, size = 32 }: { muscle: MuscleGroup; size?: number }) => {
  const color = MUSCLE_COLORS[muscle];
  const dim = "rgba(255,255,255,0.08)";

  const icons: Record<MuscleGroup, React.ReactNode> = {
    Chest: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Torso outline */}
        <path d="M10 8C10 8 8 10 8 16C8 22 10 26 16 26C22 26 24 22 24 16C24 10 22 8 22 8" stroke={dim} strokeWidth="1.5" fill="none" />
        {/* Pecs highlighted */}
        <path d="M11 12C11 12 13 10 16 10C19 10 21 12 21 12L20 16C20 16 18 18 16 18C14 18 12 16 12 16L11 12Z" fill={color} opacity="0.8" />
        <line x1="16" y1="10" x2="16" y2="18" stroke={color} strokeWidth="0.8" opacity="0.5" />
      </svg>
    ),
    Back: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Torso outline */}
        <path d="M10 6C10 6 8 10 8 16C8 22 10 26 16 26C22 26 24 22 24 16C24 10 22 6 22 6" stroke={dim} strokeWidth="1.5" fill="none" />
        {/* Lats highlighted - V shape */}
        <path d="M12 10L10 20L16 24L22 20L20 10L16 12L12 10Z" fill={color} opacity="0.7" />
        {/* Spine */}
        <line x1="16" y1="8" x2="16" y2="24" stroke={color} strokeWidth="1" opacity="0.6" />
      </svg>
    ),
    Shoulders: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Neck */}
        <rect x="14" y="8" width="4" height="6" rx="2" stroke={dim} strokeWidth="1.5" fill="none" />
        {/* Shoulder caps highlighted */}
        <ellipse cx="9" cy="16" rx="4" ry="5" fill={color} opacity="0.7" />
        <ellipse cx="23" cy="16" rx="4" ry="5" fill={color} opacity="0.7" />
        {/* Upper arms */}
        <line x1="9" y1="21" x2="9" y2="28" stroke={dim} strokeWidth="1.5" />
        <line x1="23" y1="21" x2="23" y2="28" stroke={dim} strokeWidth="1.5" />
        {/* Torso connection */}
        <path d="M13 14H19" stroke={dim} strokeWidth="1.5" />
      </svg>
    ),
    Biceps: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Arm outline */}
        <path d="M10 6L8 16L12 26" stroke={dim} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M18 6L20 16L16 26" stroke={dim} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Bicep muscle highlighted (front of upper arm, flexed) */}
        <path d="M11 8C11 8 9 11 9 14C9 17 13 17 14 14C15 11 13 8 11 8Z" fill={color} opacity="0.8" />
        <path d="M17 8C17 8 15 11 15 14C15 17 19 17 20 14C21 11 19 8 17 8Z" fill={color} opacity="0.8" />
        {/* Forearm */}
        <ellipse cx="10" cy="22" rx="2" ry="4" fill={color} opacity="0.3" />
        <ellipse cx="18" cy="22" rx="2" ry="4" fill={color} opacity="0.3" />
      </svg>
    ),
    Triceps: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Arm outline */}
        <path d="M10 6L8 16L12 26" stroke={dim} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M22 6L24 16L20 26" stroke={dim} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Tricep highlighted (back of arm, horseshoe shape) */}
        <path d="M12 8C14 10 15 13 14 16C13 14 11 14 10 16C9 13 10 10 12 8Z" fill={color} opacity="0.8" />
        <path d="M20 8C18 10 17 13 18 16C19 14 21 14 22 16C23 13 22 10 20 8Z" fill={color} opacity="0.8" />
      </svg>
    ),
    Quads: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Hip */}
        <path d="M8 6H24V10L20 12H12L8 10V6Z" stroke={dim} strokeWidth="1.5" fill="none" />
        {/* Quad muscles highlighted */}
        <path d="M10 10L8 24L14 26L16 12L10 10Z" fill={color} opacity="0.7" />
        <path d="M22 10L24 24L18 26L16 12L22 10Z" fill={color} opacity="0.7" />
        {/* Knees */}
        <circle cx="11" cy="26" r="1.5" stroke={dim} strokeWidth="1" fill="none" />
        <circle cx="21" cy="26" r="1.5" stroke={dim} strokeWidth="1" fill="none" />
      </svg>
    ),
    Hamstrings: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Hip */}
        <path d="M8 6H24V10L20 12H12L8 10V6Z" stroke={dim} strokeWidth="1.5" fill="none" />
        {/* Leg outlines */}
        <path d="M10 10L8 26" stroke={dim} strokeWidth="1.5" />
        <path d="M14 12L14 26" stroke={dim} strokeWidth="1.5" />
        <path d="M18 12L18 26" stroke={dim} strokeWidth="1.5" />
        <path d="M22 10L24 26" stroke={dim} strokeWidth="1.5" />
        {/* Hamstring highlighted (back of thigh) */}
        <path d="M10 12C10 12 12 16 12 20C12 24 10 26 10 26L14 26C14 26 14 22 14 18C14 14 12 12 10 12Z" fill={color} opacity="0.7" />
        <path d="M22 12C22 12 20 16 20 20C20 24 22 26 22 26L18 26C18 26 18 22 18 18C18 14 20 12 22 12Z" fill={color} opacity="0.7" />
      </svg>
    ),
    Glutes: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Waist */}
        <path d="M10 8H22" stroke={dim} strokeWidth="1.5" />
        {/* Glute muscles highlighted */}
        <ellipse cx="12" cy="14" rx="5" ry="6" fill={color} opacity="0.7" />
        <ellipse cx="20" cy="14" rx="5" ry="6" fill={color} opacity="0.7" />
        {/* Upper legs */}
        <line x1="10" y1="20" x2="8" y2="28" stroke={dim} strokeWidth="1.5" />
        <line x1="22" y1="20" x2="24" y2="28" stroke={dim} strokeWidth="1.5" />
        {/* Spine hint */}
        <line x1="16" y1="6" x2="16" y2="10" stroke={dim} strokeWidth="1.5" />
      </svg>
    ),
    Calves: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Knee */}
        <circle cx="12" cy="8" r="2" stroke={dim} strokeWidth="1" fill="none" />
        <circle cx="20" cy="8" r="2" stroke={dim} strokeWidth="1" fill="none" />
        {/* Shin */}
        <line x1="12" y1="10" x2="12" y2="28" stroke={dim} strokeWidth="1.5" />
        <line x1="20" y1="10" x2="20" y2="28" stroke={dim} strokeWidth="1.5" />
        {/* Calf muscles highlighted (diamond shape) */}
        <path d="M12 11C14 13 15 16 14 20C13 18 11 18 10 20C9 16 10 13 12 11Z" fill={color} opacity="0.8" />
        <path d="M20 11C22 13 23 16 22 20C21 18 19 18 18 20C17 16 18 13 20 11Z" fill={color} opacity="0.8" />
        {/* Feet */}
        <path d="M10 28H14" stroke={dim} strokeWidth="1.5" />
        <path d="M18 28H22" stroke={dim} strokeWidth="1.5" />
      </svg>
    ),
    Core: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Torso outline */}
        <path d="M10 6C10 6 8 10 8 16C8 22 10 26 16 26C22 26 24 22 24 16C24 10 22 6 22 6" stroke={dim} strokeWidth="1.5" fill="none" />
        {/* Abs grid highlighted */}
        <rect x="12" y="10" width="3.5" height="3.5" rx="0.8" fill={color} opacity="0.7" />
        <rect x="16.5" y="10" width="3.5" height="3.5" rx="0.8" fill={color} opacity="0.7" />
        <rect x="12" y="14.5" width="3.5" height="3.5" rx="0.8" fill={color} opacity="0.7" />
        <rect x="16.5" y="14.5" width="3.5" height="3.5" rx="0.8" fill={color} opacity="0.7" />
        <rect x="12.5" y="19" width="3" height="3" rx="0.8" fill={color} opacity="0.5" />
        <rect x="16.5" y="19" width="3" height="3" rx="0.8" fill={color} opacity="0.5" />
      </svg>
    ),
  };

  return <>{icons[muscle]}</>;
};

export const ExercisePicker = ({
  isOpen,
  onClose,
  onSelect,
  addedExercises,
}: ExercisePickerProps) => {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | "All">("All");

  const filtered = useMemo(() => {
    let list = EXERCISES;
    if (activeGroup !== "All") {
      list = list.filter((e) => e.muscle === activeGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle.toLowerCase().includes(q) ||
          e.equipment.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, activeGroup]);

  const grouped = useMemo(() => {
    const map = new Map<MuscleGroup, ExerciseInfo[]>();
    filtered.forEach((e) => {
      if (!map.has(e.muscle)) map.set(e.muscle, []);
      map.get(e.muscle)!.push(e);
    });
    return map;
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full md:max-w-lg max-h-[85vh] md:max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden animate-fadeUp"
        style={{
          background: "var(--nous-surface)",
          border: "1px solid var(--nous-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-3 shrink-0"
          style={{ borderBottom: "1px solid var(--nous-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--nous-primary)" }}>
              Add Exercise
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "#5a5a6e" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "var(--nous-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#5a5a6e";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a5a6e"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--nous-primary)",
              }}
            />
          </div>

          {/* Muscle group filter */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveGroup("All")}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all"
              style={{
                background: activeGroup === "All" ? "rgba(var(--nous-accent-rgb),0.15)" : "rgba(255,255,255,0.04)",
                color: activeGroup === "All" ? "var(--nous-accent)" : "#5a5a6e",
                border: `1px solid ${activeGroup === "All" ? "rgba(var(--nous-accent-rgb),0.3)" : "transparent"}`,
              }}
            >
              All
            </button>
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg}
                onClick={() => setActiveGroup(mg)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
                style={{
                  background: activeGroup === mg ? `${MUSCLE_COLORS[mg]}18` : "rgba(255,255,255,0.04)",
                  color: activeGroup === mg ? MUSCLE_COLORS[mg] : "#5a5a6e",
                  border: `1px solid ${activeGroup === mg ? `${MUSCLE_COLORS[mg]}40` : "transparent"}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: MUSCLE_COLORS[mg], opacity: activeGroup === mg ? 1 : 0.4 }}
                />
                {mg}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-3 py-3" style={{ minHeight: 0 }}>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--nous-secondary)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>
                No exercises found
              </p>
            </div>
          )}

          {activeGroup === "All" ? (
            // Grouped view
            Array.from(grouped.entries()).map(([muscle, exercises]) => (
              <div key={muscle} className="mb-4">
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: MUSCLE_COLORS[muscle] }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUSCLE_COLORS[muscle] }}>
                    {muscle}
                  </span>
                  <span className="text-[10px]" style={{ color: "#2e2e40" }}>
                    {exercises.length}
                  </span>
                </div>
                {exercises.map((ex) => (
                  <ExerciseRow
                    key={ex.name}
                    exercise={ex}
                    isAdded={addedExercises.includes(ex.name)}
                    onSelect={() => onSelect(ex)}
                  />
                ))}
              </div>
            ))
          ) : (
            // Flat view for single group
            filtered.map((ex) => (
              <ExerciseRow
                key={ex.name}
                exercise={ex}
                isAdded={addedExercises.includes(ex.name)}
                onSelect={() => onSelect(ex)}
              />
            ))
          )}
        </div>

        {/* Footer count */}
        <div
          className="px-5 py-2.5 shrink-0 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[10px]" style={{ color: "#2e2e40" }}>
            {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
            {search.trim() && " matching"}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Single exercise row ─── */
const ExerciseRow = ({
  exercise,
  isAdded,
  onSelect,
}: {
  exercise: ExerciseInfo;
  isAdded: boolean;
  onSelect: () => void;
}) => {
  const color = MUSCLE_COLORS[exercise.muscle];

  return (
    <button
      onClick={onSelect}
      disabled={isAdded}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all group"
      style={{
        opacity: isAdded ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isAdded) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Muscle icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}10`,
          border: `1px solid ${color}20`,
        }}
      >
        <MuscleIcon muscle={exercise.muscle} size={28} />
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--nous-primary)" }}>
          {exercise.name}
          {isAdded && <span className="ml-2 text-[10px] font-bold text-nous-success">Added</span>}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: color }}>
            {exercise.muscle}
          </span>
          {exercise.secondary && exercise.secondary.length > 0 && (
            <span className="text-[10px]" style={{ color: "var(--nous-secondary)" }}>
              + {exercise.secondary.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Equipment badge */}
      <div
        className="px-2 py-1 rounded-md text-[10px] font-bold shrink-0"
        style={{
          background: "rgba(255,255,255,0.04)",
          color: "#5a5a6e",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {EQUIPMENT_LABELS[exercise.equipment]}
      </div>

      {/* Add indicator */}
      {!isAdded && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--nous-secondary)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}
    </button>
  );
};

export { MuscleIcon };
