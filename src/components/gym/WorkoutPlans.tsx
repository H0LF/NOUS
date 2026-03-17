"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { WorkoutTemplate, TemplateExercise } from "@/types";
import { ExercisePicker } from "@/components/gym/ExercisePicker";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

interface WorkoutPlansProps {
  onLoadPlan: (exercises: TemplateExercise[]) => void;
}

const DEFAULT_EX = (): TemplateExercise => ({
  name: "",
  sets: 3,
  reps: 10,
  weight: 0,
  restSeconds: 90,
});

export const WorkoutPlans = ({ onLoadPlan }: WorkoutPlansProps) => {
  const { user } = useStore();
  const { saveDoc, queryDocs, deleteDocument } = useFirestore();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [planName, setPlanName] = useState("");
  const [formExercises, setFormExercises] = useState<TemplateExercise[]>([DEFAULT_EX()]);

  // Picker state — which exercise row is being picked
  const [pickerOpenFor, setPickerOpenFor] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await queryDocs<WorkoutTemplate>("workout_templates");
      setTemplates(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!user) return;
    const trimmedName = planName.trim();
    if (!trimmedName) { toast.error("Plan needs a name"); return; }
    const validExercises = formExercises.filter(e => e.name.trim());
    if (validExercises.length === 0) { toast.error("Add at least one exercise"); return; }

    const id = uuidv4();
    const template: WorkoutTemplate = {
      id,
      userId: user.uid,
      name: trimmedName,
      exercises: validExercises.map(e => ({ ...e, name: e.name.trim() })),
      createdAt: new Date().toISOString(),
    };

    await saveDoc("workout_templates", id, template);
    toast.success(`Plan "${trimmedName}" saved`);
    setTemplates(prev => [...prev, template].sort((a, b) => a.name.localeCompare(b.name)));
    cancelCreate();
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setPlanName("");
    setFormExercises([DEFAULT_EX()]);
  };

  const handleDeletePlan = async (t: WorkoutTemplate) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    await deleteDocument("workout_templates", t.id);
    setTemplates(prev => prev.filter(x => x.id !== t.id));
    toast.success("Plan deleted");
  };

  const updateFormEx = (i: number, field: keyof TemplateExercise, value: string | number) => {
    setFormExercises(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addFormEx = () => setFormExercises(prev => [...prev, DEFAULT_EX()]);
  const removeFormEx = (i: number) => setFormExercises(prev => prev.filter((_, idx) => idx !== i));

  // Names already in the form (for picker "added" state)
  const addedNames = formExercises.map(e => e.name).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-nous-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Create new plan button */}
      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold border-dashed transition-all"
          style={{
            background: "rgba(124,122,255,0.06)",
            border: "1.5px dashed rgba(124,122,255,0.35)",
            color: "var(--nous-accent)",
          }}
        >
          + New Workout Plan
        </button>
      )}

      {/* Create form */}
      {isCreating && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: "var(--nous-primary)" }}>New Plan</span>
            <button onClick={cancelCreate} className="text-xs" style={{ color: "var(--nous-secondary)" }}>
              Cancel
            </button>
          </div>

          {/* Plan name */}
          <input
            type="text"
            placeholder="Plan name (e.g. Back Day)"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--nous-border)",
              color: "var(--nous-primary)",
            }}
          />

          {/* Exercise list */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--nous-secondary)" }}>
              Exercises
            </span>

            {formExercises.map((ex, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--nous-border)" }}
              >
                {/* Exercise name row */}
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {/* Pick from library button */}
                  <button
                    onClick={() => setPickerOpenFor(i)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={{
                      background: "rgba(124,122,255,0.1)",
                      border: "1px solid rgba(124,122,255,0.25)",
                      color: "var(--nous-accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pick
                  </button>
                  <input
                    type="text"
                    placeholder="Exercise name (or pick from library)"
                    value={ex.name}
                    onChange={e => updateFormEx(i, "name", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[13px] outline-none min-w-0"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--nous-border)",
                      color: "var(--nous-primary)",
                    }}
                  />
                  {formExercises.length > 1 && (
                    <button onClick={() => removeFormEx(i)} className="shrink-0" style={{ color: "var(--nous-secondary)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Sets / Reps / Weight / Rest */}
                <div className="grid grid-cols-4 gap-0 border-t" style={{ borderColor: "var(--nous-border)" }}>
                  {(["sets", "reps", "weight", "restSeconds"] as const).map((field, fi) => (
                    <div
                      key={field}
                      className="flex flex-col items-center py-2 px-1 gap-0.5"
                      style={{ borderRight: fi < 3 ? "1px solid var(--nous-border)" : "none" }}
                    >
                      <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--nous-tertiary)" }}>
                        {field === "restSeconds" ? "Rest s" : field === "weight" ? "kg" : field}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={ex[field]}
                        onChange={e => updateFormEx(i, field, Number(e.target.value))}
                        className="w-full text-center px-1 py-0.5 rounded-md text-[13px] font-semibold outline-none"
                        style={{
                          background: "transparent",
                          color: "var(--nous-primary)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={addFormEx}
              className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed var(--nous-border)",
                color: "var(--nous-secondary)",
              }}
            >
              + Add Exercise
            </button>
          </div>

          <button
            onClick={handleSavePlan}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(124,122,255,0.15)",
              border: "1px solid rgba(124,122,255,0.3)",
              color: "var(--nous-accent)",
            }}
          >
            Save Plan
          </button>
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && !isCreating && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(124,122,255,0.08)", border: "1px solid rgba(124,122,255,0.15)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--nous-primary)" }}>No plans yet</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--nous-secondary)" }}>Create a plan to quickly start a workout</p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      {templates.map(t => (
        <div
          key={t.id}
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(124,122,255,0.1)", border: "1px solid rgba(124,122,255,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
                  <path d="M6 20v-4" /><path d="M18 20v-4" />
                  <path d="M6 8V4" /><path d="M18 8V4" />
                  <path d="M3 12h18" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--nous-primary)" }}>{t.name}</p>
                <p className="text-[11px]" style={{ color: "var(--nous-secondary)" }}>
                  {t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: "var(--nous-secondary)" }}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expandedId === t.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <button
                onClick={() => handleDeletePlan(t)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: "var(--nous-secondary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
              <button
                onClick={() => { onLoadPlan(t.exercises); toast.success(`"${t.name}" loaded!`); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: "rgba(124,122,255,0.15)",
                  border: "1px solid rgba(124,122,255,0.3)",
                  color: "var(--nous-accent)",
                }}
              >
                Start
              </button>
            </div>
          </div>

          {expandedId === t.id && (
            <div className="border-t" style={{ borderColor: "var(--nous-border)" }}>
              {t.exercises.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: i < t.exercises.length - 1 ? "1px solid var(--nous-border)" : "none" }}
                >
                  <span className="text-[13px] font-medium" style={{ color: "var(--nous-primary)" }}>{ex.name}</span>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--nous-secondary)" }}>
                    <span>{ex.sets}×{ex.reps}</span>
                    {ex.weight > 0 && <span>{ex.weight}kg</span>}
                    <span>{ex.restSeconds}s rest</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Exercise picker modal (used from the create form) */}
      <ExercisePicker
        isOpen={pickerOpenFor !== null}
        onClose={() => setPickerOpenFor(null)}
        onSelect={(info) => {
          if (pickerOpenFor !== null) {
            updateFormEx(pickerOpenFor, "name", info.name);
            setPickerOpenFor(null);
          }
        }}
        addedExercises={addedNames}
      />
    </div>
  );
};
