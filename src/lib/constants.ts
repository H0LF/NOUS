/**
 * Shared constants used across multiple features.
 * Import from here instead of redefining in each component.
 */

// ── Folder colours ────────────────────────────────────────────────────────────
// Used by FileExplorer, NotesPage (pending-note creation), and NeuralGraph.
export const FOLDER_COLORS = [
  "#2d8b8b",
  "#30c48d",
  "#e879f9",
  "#f87171",
  "#60a5fa",
  "#c084fc",
  "#38bdf8",
];

// ── Gamification ──────────────────────────────────────────────────────────────
// XP required to reach each level (cumulative totals).
// Index 0 = level 1 starts at 0 XP, index 1 = level 2 starts at 100 XP, etc.
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500,
];
