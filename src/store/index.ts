import { create } from "zustand";
import { User } from "firebase/auth";
import { ExerciseEntry, UserSettings } from "@/types";

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

interface StoreState extends AuthSlice, ThemeSlice, SettingsSlice, CalendarSlice, NotesSlice, GymSlice, FoodSlice {}

export const useStore = create<StoreState>((set) => ({
  // Auth
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  // Theme
  theme: "dark" as "dark" | "light",
  setTheme: (theme) => set({ theme }),

  // Settings
  settings: {
    geminiApiKey: "",
    theme: "dark",
    dailyCalorieGoal: 2000,
    dailyProteinGoal: 150,
    dailyCarbsGoal: 250,
    dailyFatGoal: 65,
  },
  setSettings: (settings) => set({ settings }),

  // Calendar
  currentWeekStart: new Date(),
  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

  // Notes
  selectedFolderId: null,
  openNoteId: null,
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setOpenNoteId: (id) => set({ openNoteId: id }),

  // Gym
  activeWorkoutType: null,
  exercises: [],
  stopwatchSeconds: 0,
  restTimerSeconds: 0,
  restTimerDuration: 90,
  isRestTimerRunning: false,
  setActiveWorkoutType: (type) => set({ activeWorkoutType: type }),
  setExercises: (exercises) => set({ exercises }),
  setStopwatchSeconds: (seconds) => set({ stopwatchSeconds: seconds }),
  startRestTimer: (duration) => set({ restTimerSeconds: duration, restTimerDuration: duration, isRestTimerRunning: true }),
  tickRestTimer: () => set((state) => {
    const next = state.restTimerSeconds - 1;
    if (next <= 0) return { restTimerSeconds: 0, isRestTimerRunning: false };
    return { restTimerSeconds: next };
  }),
  stopRestTimer: () => set({ restTimerSeconds: 0, isRestTimerRunning: false }),

  // Food
  selectedDate: new Date().toISOString().split("T")[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
