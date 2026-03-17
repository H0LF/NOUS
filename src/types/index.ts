export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  color: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  dayOfWeek: number; // 0-6
  date: string; // YYYY-MM-DD
  isWeekly: boolean;
  isClass: boolean;
  room?: string;
  classType?: "Teórica" | "Teórico-Prática" | "Prática";
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  folderId?: string;
  eventId?: string; // Links note to a specific event instance
  linkedNoteIds: string[];
  drawing?: string; // base64 PNG data URL of freehand drawing
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  color: string;
}

export interface GymSession {
  id: string;
  userId: string;
  date: string; // ISO string
  workoutType: string;
  duration: number; // seconds
  exercises: ExerciseEntry[];
}

export interface ExerciseEntry {
  name: string;
  sets: SetEntry[];
  previousSets?: SetEntry[];
}

export interface SetEntry {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: string;
}

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  quantity: number; // grams
  source: "barcode" | "ai";
  meal?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  items: FoodItem[];
}

export interface AITask {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  task: string;
  duration: string;
  done: boolean;
  createdAt: string;
}

export interface GamificationFeatures {
  food: boolean;
  gym: boolean;
  calendar: boolean;
  notes: boolean;
}

export interface UserSettings {
  geminiApiKey: string;
  theme: "dark" | "light";
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  /** Master switch — when false the gamification panel is hidden entirely */
  gamificationEnabled: boolean;
  /** Per-feature switches — controls whether XP is awarded for each module */
  gamificationFeatures: GamificationFeatures;
}
