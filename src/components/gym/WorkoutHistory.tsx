import React, { useEffect, useState, useCallback } from "react";
import { GymSession } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { formatDuration } from "@/lib/format";
import { format } from "date-fns";
import { orderBy, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

export const WorkoutHistory = () => {
  const { user } = useStore();
  const { queryDocsWithCursor, saveDoc } = useFirestore();
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Cursor for the next page — the last document snapshot from the previous query.
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  // Tracks in-progress edits per session id before saving.
  const [editedSessions, setEditedSessions] = useState<Record<string, GymSession>>({});

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    queryDocsWithCursor<GymSession>(
      "gym_sessions",
      orderBy("date", "desc"),
      limit(PAGE_SIZE),
    )
      .then(({ data, lastDoc }) => {
        setSessions(data);
        setCursor(lastDoc);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch((err) =>
        console.error("[WorkoutHistory] Failed to load sessions:", err),
      )
      .finally(() => setLoading(false));
  }, [user, queryDocsWithCursor]);

  // ── Load more (cursor pagination) ──────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const { data, lastDoc } = await queryDocsWithCursor<GymSession>(
        "gym_sessions",
        orderBy("date", "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE),
      );
      setSessions((prev) => [...prev, ...data]);
      setCursor(lastDoc);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error("[WorkoutHistory] Failed to load more sessions:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, queryDocsWithCursor]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const calculateVolume = (session: GymSession) =>
    session.exercises.reduce(
      (total, ex) =>
        total +
        ex.sets.reduce(
          (t, set) => t + (set.completed ? set.weight * set.reps : 0),
          0,
        ),
      0,
    );

  const handleSetChange = (
    sessionId: string,
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    value: number,
  ) => {
    const base = editedSessions[sessionId] ?? sessions.find((s) => s.id === sessionId)!;
    const updated: GymSession = {
      ...base,
      exercises: base.exercises.map((ex, i) =>
        i !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j !== setIdx ? s : { ...s, [field]: value },
              ),
            },
      ),
    };
    setEditedSessions((prev) => ({ ...prev, [sessionId]: updated }));
  };

  const handleSaveSession = async (sessionId: string) => {
    const edited = editedSessions[sessionId];
    if (!edited) return;
    try {
      await saveDoc("gym_sessions", sessionId, edited);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? edited : s)));
      setEditedSessions((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      toast.success("Session saved");
    } catch (err) {
      console.error("[WorkoutHistory] Failed to save session:", err);
      toast.error("Failed to save");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 border-nous-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="bg-nous-surface/30 border border-nous-border rounded-xl overflow-hidden transition-all"
        >
          {/* Session header */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-nous-surface/50 transition-colors"
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
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDuration(session.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
                    <path d="M6 20v-4" /><path d="M18 20v-4" />
                    <path d="M6 8V4" /><path d="M18 8V4" />
                    <path d="M3 12h18" />
                  </svg>
                  {calculateVolume(session).toLocaleString()} kg vol
                </span>
                <span>{session.exercises.length} exercise{session.exercises.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${expandedId === session.id ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Expanded exercise details */}
          {expandedId === session.id && (() => {
            const displaySession = editedSessions[session.id] ?? session;
            const isDirty = !!editedSessions[session.id];
            return (
              <div className="border-t border-nous-border bg-nous-surface/10 p-4 space-y-4 animate-fadeIn">
                {displaySession.exercises.map((ex, i) => (
                  <div key={i}>
                    <h4 className="font-medium text-sm text-nous-primary mb-2">{ex.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {ex.sets.map((set, j) => (
                        <div
                          key={j}
                          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                            set.completed
                              ? "bg-nous-success/10 border-nous-success/30 text-nous-success"
                              : "bg-nous-surface border-nous-border text-nous-secondary"
                          }`}
                        >
                          <input
                            type="number"
                            min={0}
                            value={set.weight}
                            onChange={(e) => handleSetChange(session.id, i, j, "weight", Number(e.target.value))}
                            className="w-10 bg-transparent outline-none text-center"
                            style={{ color: "inherit" }}
                          />
                          <span className="opacity-50">kg×</span>
                          <input
                            type="number"
                            min={0}
                            value={set.reps}
                            onChange={(e) => handleSetChange(session.id, i, j, "reps", Number(e.target.value))}
                            className="w-8 bg-transparent outline-none text-center"
                            style={{ color: "inherit" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {isDirty && (
                  <button
                    onClick={() => handleSaveSession(session.id)}
                    className="w-full py-2 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: "rgba(45,139,139,0.15)",
                      border: "1px solid rgba(45,139,139,0.3)",
                      color: "var(--nous-accent)",
                    }}
                  >
                    Save changes
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      ))}

      {sessions.length === 0 && (
        <div className="text-center py-12 text-nous-secondary">
          No workouts yet. Start training!
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "rgba(45,139,139,0.06)",
            border: "1px solid rgba(45,139,139,0.15)",
            color: "var(--nous-accent)",
          }}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
};
