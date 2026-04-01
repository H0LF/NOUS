/**
 * Shared calendar utilities — color, time, and layout helpers.
 */

// ── Color helpers ───────────────────────────────────────────────────────────────

export function getEventColors(hex: string | undefined) {
  const color = hex || "#2d8b8b";
  // Handle 3-char hex (#abc → #aabbcc)
  const full =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;

  const r = parseInt(full.slice(1, 3), 16) || 0;
  const g = parseInt(full.slice(3, 5), 16) || 0;
  const b = parseInt(full.slice(5, 7), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return {
    bg: color,
    fg: lum > 0.55 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)",
    sub: lum > 0.55 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)",
  };
}

// ── Overlap layout ──────────────────────────────────────────────────────────────

export interface LayoutSlot {
  column: number;
  totalColumns: number;
}

/**
 * Given a list of {start, end} intervals (in any numeric unit),
 * returns a parallel array of {column, totalColumns} for side-by-side rendering.
 */
export function computeOverlapLayout(
  intervals: { start: number; end: number }[],
): LayoutSlot[] {
  if (intervals.length === 0) return [];

  const indexed = intervals.map((iv, i) => ({ ...iv, i }));
  indexed.sort((a, b) => a.start - b.start || a.end - b.end);

  const result: LayoutSlot[] = new Array(intervals.length);
  // Track which columns are occupied (end times per column)
  const columns: number[] = [];

  // Group overlapping events
  const groups: number[][] = [];
  let groupEnd = -Infinity;
  let currentGroup: number[] = [];

  for (const item of indexed) {
    if (item.start >= groupEnd) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [];
      columns.length = 0;
      groupEnd = -Infinity;
    }

    // Find first available column
    let col = 0;
    while (col < columns.length && columns[col] > item.start) col++;
    if (col === columns.length) columns.push(0);
    columns[col] = item.end;

    currentGroup.push(item.i);
    result[item.i] = { column: col, totalColumns: 0 }; // totalColumns set after group
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Set totalColumns per group
  for (const group of groups) {
    const maxCol = Math.max(...group.map((i) => result[i].column)) + 1;
    for (const i of group) {
      result[i].totalColumns = maxCol;
    }
  }

  return result;
}
