import React, { useEffect, useState } from "react";
import { GymSession } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { format } from "date-fns";
import { orderBy, limit } from "firebase/firestore"; // Import limit just in case

export const WorkoutHistory = () => {
  const { user } = useStore();
  const { queryDocs } = useFirestore();
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Need orderBy
      const data = await queryDocs<GymSession>(
        "gym_sessions",
        orderBy("date", "desc"),
        limit(20),
      );
      setSessions(data);
    };
    load();
  }, [user, queryDocs]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const calculateVolume = (session: GymSession) => {
    return session.exercises.reduce((total, ex) => {
      return (
        total +
        ex.sets.reduce((exTotal, set) => {
          return exTotal + (set.completed ? set.weight * set.reps : 0);
        }, 0)
      );
    }, 0);
  };

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="bg-nous-surface/30 border border-nous-border rounded-xl overflow-hidden transition-all"
        >
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-nous-surface/50"
            onClick={() =>
              setExpandedId(expandedId === session.id ? null : session.id)
            }
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-nous-primary">
                  {format(new Date(session.date), "MMM d, yyyy")}
                </span>
                <span className="text-[10px] bg-nous-accent/10 text-nous-accent px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {session.workoutType}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-nous-secondary">
                <span className="flex items-center gap-1">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDuration(session.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6.5 6.5h11" />
                    <path d="M6.5 17.5h11" />
                    <path d="M6 20v-4" />
                    <path d="M18 20v-4" />
                    <path d="M6 8V4" />
                    <path d="M18 8V4" />
                    <path d="M3 12h18" />
                  </svg>
                  {calculateVolume(session)} kg
                </span>
              </div>
            </div>
            <div
              className={`transform transition-transform ${expandedId === session.id ? "rotate-180" : ""}`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          {expandedId === session.id && (
            <div className="border-t border-nous-border bg-nous-surface/10 p-4 space-y-4 animate-fadeIn">
              {session.exercises.map((ex, i) => (
                <div key={i}>
                  <h4 className="font-medium text-sm text-nous-primary mb-2">
                    {ex.name}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ex.sets.map((set, j) => (
                      <div
                        key={j}
                        className={`px-2 py-1 rounded border text-xs ${
                          set.completed
                            ? "bg-nous-success/10 border-nous-success/30 text-nous-success"
                            : "bg-nous-surface border-nous-border text-nous-secondary"
                        }`}
                      >
                        {set.weight}kg × {set.reps}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {sessions.length === 0 && (
        <div className="text-center py-12 text-nous-secondary">
          No workouts yet. Start training!
        </div>
      )}
    </div>
  );
};
