import { create } from "zustand";
import { User } from "firebase/auth";
import { ExerciseEntry, UserSettings, Note, Folder, CalendarEvent, AITask } from "@/types";

// ─── Slice interfaces ─────────────────────────────────────────────────────────

interface AuthSlice {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

interface ThemeSlice {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}

interface SettingsSlice {
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
}

interface CalendarSlice {
  currentWeekStart: Date;
  setCurrentWeekStart: (date: Date) => void;
}

interface NotesSlice {
  selectedFolderId: string | null;
  openNoteId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  setOpenNoteId: (id: string | null) => void;
}

interface GymSlice {
  activeWorkoutType: string | null;
  exercises: ExerciseEntry[];
  stopwatchSeconds: number;
  restTimerSeconds: number;
  restTimerDuration: number;
  isRestTimerRunning: boolean;
  setActiveWorkoutType: (type: string | null) => void;
  setExercises: (exercises: ExerciseEntry[]) => void;
  setStopwatchSeconds: (seconds: number) => void;
  startRestTimer: (duration: number) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;
}

interface FoodSlice {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
}

/**
 * NotesDataSlice — shared cache for notes + folders populated by a single
 * onSnapshot listener in useAppData (opened once at app layout level).
 * All components read from here instead of subscribing independently.
 */
interface NotesDataSlice {
  allNotes: Note[];
  allFolders: Folder[];
  setAllNotes: (notes: Note[]) => void;
  setAllFolders: (folders: Folder[]) => void;
}

/**
 * CalendarDataSlice — shared cache for calendar events + AI tasks populated
 * by a single onSnapshot listener in useAppData.
 */
interface CalendarDataSlice {
  calendarEvents: CalendarEvent[];
  aiTasks: AITask[];
  setCalendarEvents: (events: CalendarEvent[]) => void;
  setAiTasks: (tasks: AITask[]) => void;
}

// ─── Combined store type ──────────────────────────────────────────────────────

interface StoreState
  extends AuthSlice,
    ThemeSlice,
    SettingsSlice,
    CalendarSlice,
    NotesSlice,
    GymSlice,
    FoodSlice,
    NotesDataSlice,
    CalendarDataSlice {}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useStore = create<StoreState>((set) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: "dark" as "dark" | "light",
  setTheme: (theme) => set({ theme }),

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    geminiApiKey: "",
    theme: "dark",
    dailyCalorieGoal: 2000,
    dailyProteinGoal: 150,
    dailyCarbsGoal: 250,
    dailyFatGoal: 65,
    gamificationEnabled: true,
    gamificationFeatures: {
      food: true,
      gym: true,
      calendar: true,
      notes: true,
    },
  },
  setSettings: (settings) => set({ settings }),

  // ── Calendar UI state ─────────────────────────────────────────────────────
  currentWeekStart: new Date(),
  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

  // ── Notes UI state ────────────────────────────────────────────────────────
  selectedFolderId: null,
  openNoteId: null,
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setOpenNoteId: (id) => set({ openNoteId: id }),

  // ── Gym ───────────────────────────────────────────────────────────────────
  activeWorkoutType: null,
  exercises: [],
  stopwatchSeconds: 0,
  restTimerSeconds: 0,
  restTimerDuration: 90,
  isRestTimerRunning: false,
  setActiveWorkoutType: (type) => set({ activeWorkoutType: type }),
  setExercises: (exercises) => set({ exercises }),
  setStopwatchSeconds: (seconds) => set({ stopwatchSeconds: seconds }),
  startRestTimer: (duration) =>
    set({ restTimerSeconds: duration, restTimerDuration: duration, isRestTimerRunning: true }),
  tickRestTimer: () =>
    set((state) => {
      const next = state.restTimerSeconds - 1;
      if (next <= 0) return { restTimerSeconds: 0, isRestTimerRunning: false };
      return { restTimerSeconds: next };
    }),
  stopRestTimer: () => set({ restTimerSeconds: 0, isRestTimerRunning: false }),

  // ── Food ──────────────────────────────────────────────────────────────────
  selectedDate: new Date().toISOString().split("T")[0],
  setSelectedDate: (date) => set({ selectedDate: date }),

  // ── Shared notes data (populated by useAppData) ───────────────────────────
  allNotes: [],
  allFolders: [],
  setAllNotes: (notes) => set({ allNotes: notes }),
  setAllFolders: (folders) => set({ allFolders: folders }),

  // ── Shared calendar data (populated by useAppData) ────────────────────────
  calendarEvents: [],
  aiTasks: [],
  setCalendarEvents: (events) => set({ calendarEvents: events }),
  setAiTasks: (tasks) => set({ aiTasks: tasks }),
}));
