"use client";

import { useEffect } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { Note, Folder, CalendarEvent, AITask } from "@/types";
import { orderBy, limit } from "firebase/firestore";

/**
 * useAppData
 *
 * Opens exactly 4 real-time Firestore listeners for the lifetime of the
 * authenticated session. Writes results into the Zustand store so every
 * component in the app can read shared, up-to-date data without opening
 * their own listeners.
 *
 * Call this ONCE, inside the app layout (src/app/app/layout.tsx).
 *
 * Collections managed:
 *   - notes      → store.allNotes
 *   - folders    → store.allFolders
 *   - events     → store.calendarEvents
 *   - ai_tasks   → store.aiTasks
 *
 * Why centralised here instead of per-component?
 * Each component that opened its own onSnapshot listener was causing a full
 * collection read every time the component mounted (or re-mounted due to
 * unstable useEffect dependencies). With 4 independent components subscribing
 * to the same 2 collections, that multiplied reads by 2-4x per page load.
 * One listener per collection, stored globally, fixes this entirely.
 */
export function useAppData() {
  const { user, setAllNotes, setAllFolders, setCalendarEvents, setAiTasks } =
    useStore();
  const { subscribeCollection } = useFirestore();

  useEffect(() => {
    // Don't open listeners until the user is authenticated.
    if (!user) return;

    // ── Notes ──────────────────────────────────────────────────────────────
    // Sort by updatedAt descending so FileExplorer always shows most-recent
    // notes at the top without needing to sort in each component.
    const unsubNotes = subscribeCollection<Note>(
      "notes",
      (data) => {
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setAllNotes(sorted);
      },
      orderBy("updatedAt", "desc"),
    );

    // ── Folders ────────────────────────────────────────────────────────────
    const unsubFolders = subscribeCollection<Folder>(
      "folders",
      setAllFolders,
      limit(200),
    );

    // ── Calendar events ────────────────────────────────────────────────────
    const unsubEvents = subscribeCollection<CalendarEvent>(
      "events",
      setCalendarEvents,
    );

    // ── AI planner tasks ───────────────────────────────────────────────────
    const unsubAiTasks = subscribeCollection<AITask>(
      "ai_tasks",
      setAiTasks,
      limit(200),
    );

    // Unsubscribe all 4 listeners when the user logs out or the layout
    // unmounts. This prevents ghost listeners holding stale auth tokens.
    return () => {
      unsubNotes();
      unsubFolders();
      unsubEvents();
      unsubAiTasks();
    };

    // subscribeCollection is stable (useCallback in useFirestore).
    // user is the Firebase User object — only changes on login/logout.
    // setters from Zustand are stable references.
  }, [user, subscribeCollection, setAllNotes, setAllFolders, setCalendarEvents, setAiTasks]);
}
