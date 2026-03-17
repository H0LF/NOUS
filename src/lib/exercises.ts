export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Core";

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Cable"
  | "Machine"
  | "Bodyweight"
  | "EZ Bar"
  | "Kettlebell";

export interface ExerciseInfo {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  secondary?: MuscleGroup[];
  /** Optional URL to an animated GIF demonstrating the movement */
  gifUrl?: string;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
];

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  Chest: "#ef4444",
  Back: "#3b82f6",
  Shoulders: "#f59e0b",
  Biceps: "#8b5cf6",
  Triceps: "#a855f7",
  Quads: "#10b981",
  Hamstrings: "#14b8a6",
  Glutes: "#f97316",
  Calves: "#06b6d4",
  Core: "#ec4899",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  Barbell: "BB",
  Dumbbell: "DB",
  Cable: "Cable",
  Machine: "Mach",
  Bodyweight: "BW",
  "EZ Bar": "EZ",
  Kettlebell: "KB",
};

export const EXERCISES: ExerciseInfo[] = [
  // ── Chest ──
  { name: "Flat Bench Press", muscle: "Chest", equipment: "Barbell", secondary: ["Triceps", "Shoulders"] },
  { name: "Incline Bench Press", muscle: "Chest", equipment: "Barbell", secondary: ["Shoulders", "Triceps"] },
  { name: "Decline Bench Press", muscle: "Chest", equipment: "Barbell", secondary: ["Triceps"] },
  { name: "Dumbbell Bench Press", muscle: "Chest", equipment: "Dumbbell", secondary: ["Triceps", "Shoulders"] },
  { name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell", secondary: ["Shoulders"] },
  { name: "Dumbbell Fly", muscle: "Chest", equipment: "Dumbbell" },
  { name: "Incline Dumbbell Fly", muscle: "Chest", equipment: "Dumbbell" },
  { name: "Cable Crossover", muscle: "Chest", equipment: "Cable" },
  { name: "Low Cable Fly", muscle: "Chest", equipment: "Cable" },
  { name: "Machine Chest Press", muscle: "Chest", equipment: "Machine", secondary: ["Triceps"] },
  { name: "Pec Deck", muscle: "Chest", equipment: "Machine" },
  { name: "Push Up", muscle: "Chest", equipment: "Bodyweight", secondary: ["Triceps", "Shoulders"] },
  { name: "Chest Dip", muscle: "Chest", equipment: "Bodyweight", secondary: ["Triceps"] },

  // ── Back ──
  { name: "Conventional Deadlift", muscle: "Back", equipment: "Barbell", secondary: ["Hamstrings", "Glutes"] },
  { name: "Pull Up", muscle: "Back", equipment: "Bodyweight", secondary: ["Biceps"] },
  { name: "Chin Up", muscle: "Back", equipment: "Bodyweight", secondary: ["Biceps"] },
  { name: "Lat Pulldown", muscle: "Back", equipment: "Cable", secondary: ["Biceps"] },
  { name: "Close Grip Lat Pulldown", muscle: "Back", equipment: "Cable", secondary: ["Biceps"] },
  { name: "Barbell Row", muscle: "Back", equipment: "Barbell", secondary: ["Biceps"] },
  { name: "Pendlay Row", muscle: "Back", equipment: "Barbell" },
  { name: "Dumbbell Row", muscle: "Back", equipment: "Dumbbell" },
  { name: "Seated Cable Row", muscle: "Back", equipment: "Cable" },
  { name: "T-Bar Row", muscle: "Back", equipment: "Barbell" },
  { name: "Face Pull", muscle: "Back", equipment: "Cable", secondary: ["Shoulders"] },
  { name: "Straight Arm Pulldown", muscle: "Back", equipment: "Cable" },
  { name: "Hyperextension", muscle: "Back", equipment: "Bodyweight", secondary: ["Hamstrings", "Glutes"] },
  { name: "Meadows Row", muscle: "Back", equipment: "Barbell" },
  { name: "Machine Row", muscle: "Back", equipment: "Machine" },

  // ── Shoulders ──
  { name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell", secondary: ["Triceps"] },
  { name: "Dumbbell Shoulder Press", muscle: "Shoulders", equipment: "Dumbbell", secondary: ["Triceps"] },
  { name: "Arnold Press", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Cable Lateral Raise", muscle: "Shoulders", equipment: "Cable" },
  { name: "Machine Lateral Raise", muscle: "Shoulders", equipment: "Machine" },
  { name: "Front Raise", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Rear Delt Fly", muscle: "Shoulders", equipment: "Dumbbell", secondary: ["Back"] },
  { name: "Reverse Pec Deck", muscle: "Shoulders", equipment: "Machine", secondary: ["Back"] },
  { name: "Upright Row", muscle: "Shoulders", equipment: "Barbell" },
  { name: "Barbell Shrug", muscle: "Shoulders", equipment: "Barbell" },
  { name: "Dumbbell Shrug", muscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Machine Shoulder Press", muscle: "Shoulders", equipment: "Machine" },
  { name: "Lu Raise", muscle: "Shoulders", equipment: "Dumbbell" },

  // ── Biceps ──
  { name: "Barbell Curl", muscle: "Biceps", equipment: "Barbell" },
  { name: "EZ Bar Curl", muscle: "Biceps", equipment: "EZ Bar" },
  { name: "Dumbbell Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Hammer Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Preacher Curl", muscle: "Biceps", equipment: "EZ Bar" },
  { name: "Concentration Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Cable Curl", muscle: "Biceps", equipment: "Cable" },
  { name: "Incline Dumbbell Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Spider Curl", muscle: "Biceps", equipment: "EZ Bar" },
  { name: "Bayesian Curl", muscle: "Biceps", equipment: "Cable" },
  { name: "Reverse Curl", muscle: "Biceps", equipment: "EZ Bar" },
  { name: "Machine Curl", muscle: "Biceps", equipment: "Machine" },

  // ── Triceps ──
  { name: "Tricep Pushdown", muscle: "Triceps", equipment: "Cable" },
  { name: "Rope Pushdown", muscle: "Triceps", equipment: "Cable" },
  { name: "Skull Crusher", muscle: "Triceps", equipment: "EZ Bar" },
  { name: "Close Grip Bench Press", muscle: "Triceps", equipment: "Barbell", secondary: ["Chest"] },
  { name: "Tricep Dip", muscle: "Triceps", equipment: "Bodyweight", secondary: ["Chest"] },
  { name: "Overhead Tricep Extension", muscle: "Triceps", equipment: "Dumbbell" },
  { name: "Cable Overhead Extension", muscle: "Triceps", equipment: "Cable" },
  { name: "Tricep Kickback", muscle: "Triceps", equipment: "Dumbbell" },
  { name: "Diamond Push Up", muscle: "Triceps", equipment: "Bodyweight", secondary: ["Chest"] },
  { name: "Single Arm Pushdown", muscle: "Triceps", equipment: "Cable" },
  { name: "JM Press", muscle: "Triceps", equipment: "Barbell" },
  { name: "Machine Tricep Extension", muscle: "Triceps", equipment: "Machine" },

  // ── Quads ──
  { name: "Barbell Squat", muscle: "Quads", equipment: "Barbell", secondary: ["Glutes"] },
  { name: "Front Squat", muscle: "Quads", equipment: "Barbell" },
  { name: "Hack Squat", muscle: "Quads", equipment: "Machine" },
  { name: "Leg Press", muscle: "Quads", equipment: "Machine", secondary: ["Glutes"] },
  { name: "Leg Extension", muscle: "Quads", equipment: "Machine" },
  { name: "Goblet Squat", muscle: "Quads", equipment: "Dumbbell", secondary: ["Glutes"] },
  { name: "Bulgarian Split Squat", muscle: "Quads", equipment: "Dumbbell", secondary: ["Glutes"] },
  { name: "Walking Lunge", muscle: "Quads", equipment: "Dumbbell", secondary: ["Glutes"] },
  { name: "Sissy Squat", muscle: "Quads", equipment: "Bodyweight" },
  { name: "Smith Machine Squat", muscle: "Quads", equipment: "Machine", secondary: ["Glutes"] },
  { name: "Pendulum Squat", muscle: "Quads", equipment: "Machine" },
  { name: "V Squat", muscle: "Quads", equipment: "Machine", secondary: ["Glutes"] },

  // ── Hamstrings ──
  { name: "Romanian Deadlift", muscle: "Hamstrings", equipment: "Barbell", secondary: ["Glutes", "Back"] },
  { name: "Stiff Leg Deadlift", muscle: "Hamstrings", equipment: "Barbell", secondary: ["Glutes"] },
  { name: "Lying Leg Curl", muscle: "Hamstrings", equipment: "Machine" },
  { name: "Seated Leg Curl", muscle: "Hamstrings", equipment: "Machine" },
  { name: "Good Morning", muscle: "Hamstrings", equipment: "Barbell", secondary: ["Back"] },
  { name: "Nordic Curl", muscle: "Hamstrings", equipment: "Bodyweight" },
  { name: "Dumbbell Romanian Deadlift", muscle: "Hamstrings", equipment: "Dumbbell", secondary: ["Glutes"] },
  { name: "Single Leg Curl", muscle: "Hamstrings", equipment: "Machine" },

  // ── Glutes ──
  { name: "Hip Thrust", muscle: "Glutes", equipment: "Barbell", secondary: ["Hamstrings"] },
  { name: "Barbell Glute Bridge", muscle: "Glutes", equipment: "Barbell" },
  { name: "Cable Kickback", muscle: "Glutes", equipment: "Cable" },
  { name: "Sumo Deadlift", muscle: "Glutes", equipment: "Barbell", secondary: ["Hamstrings", "Back"] },
  { name: "Step Up", muscle: "Glutes", equipment: "Dumbbell", secondary: ["Quads"] },
  { name: "Glute Kickback Machine", muscle: "Glutes", equipment: "Machine" },
  { name: "Cable Pull Through", muscle: "Glutes", equipment: "Cable", secondary: ["Hamstrings"] },
  { name: "Reverse Lunge", muscle: "Glutes", equipment: "Dumbbell", secondary: ["Quads"] },

  // ── Calves ──
  { name: "Standing Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Seated Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Donkey Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Leg Press Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Smith Machine Calf Raise", muscle: "Calves", equipment: "Machine" },
  { name: "Single Leg Calf Raise", muscle: "Calves", equipment: "Bodyweight" },

  // ── Core ──
  { name: "Crunch", muscle: "Core", equipment: "Bodyweight" },
  { name: "Hanging Leg Raise", muscle: "Core", equipment: "Bodyweight" },
  { name: "Cable Crunch", muscle: "Core", equipment: "Cable" },
  { name: "Russian Twist", muscle: "Core", equipment: "Bodyweight" },
  { name: "Plank", muscle: "Core", equipment: "Bodyweight" },
  { name: "Ab Wheel Rollout", muscle: "Core", equipment: "Bodyweight" },
  { name: "Woodchop", muscle: "Core", equipment: "Cable" },
  { name: "Mountain Climber", muscle: "Core", equipment: "Bodyweight" },
  { name: "Dead Bug", muscle: "Core", equipment: "Bodyweight" },
  { name: "Decline Sit Up", muscle: "Core", equipment: "Bodyweight" },
  { name: "Pallof Press", muscle: "Core", equipment: "Cable" },
  { name: "Leg Raise", muscle: "Core", equipment: "Bodyweight" },
];
