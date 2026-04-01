"use client";
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { CalendarEvent, AITask } from "@/types";
import { format, addDays, isSameDay, startOfWeek } from "date-fns";
import { getEventColors, computeOverlapLayout } from "@/lib/calendar";

interface CalendarGridProps {
  weekStart: Date;
  events: CalendarEvent[];
  aiTasks: AITask[];
  mobileDays?: number[];
  onSlotClick: (day: number, time: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDoubleClick: (event: CalendarEvent) => void;
  onEventDrop?: (
    event: CalendarEvent,
    newDayIndex: number,
    newStartTime: string,
  ) => void;
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const GUTTER_W = 52;
const AI_TASK_HEIGHT = 22;

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

const minutesToPx = (minutes: number) => {
  const fromStart = minutes - START_HOUR * 60;
  return (fromStart / 60) * HOUR_HEIGHT;
};

const pxToMinutes = (px: number) => {
  return START_HOUR * 60 + (px / HOUR_HEIGHT) * 60;
};

const snapMinutes = (mins: number) => Math.round(mins / 15) * 15;

const minsToTimeStr = (mins: number) => {
  const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 30, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

interface DragState {
  event: CalendarEvent;
  offsetY: number;
  durationMins: number;
  ghostTop: number;
  ghostColIndex: number;
  started: boolean;
  startX: number;
  startY: number;
}

export const CalendarGrid = ({
  weekStart,
  events,
  aiTasks,
  mobileDays,
  onSlotClick,
  onEventClick,
  onEventDoubleClick,
  onEventDrop,
}: CalendarGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const allDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monday.getTime()],
  );
  const now = new Date();

  const visibleIndices = mobileDays ?? [0, 1, 2, 3, 4, 5, 6];
  const days = visibleIndices.map((i) => ({ day: allDays[i], index: i }));
  const cols = days.length;

  // ── Memoized event/task lookup ────────────────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (e.isWeekly) {
        // Weekly events keyed by dayOfWeek prefixed to distinguish
        const key = `dow:${e.dayOfWeek}`;
        const arr = map.get(key) || [];
        arr.push(e);
        map.set(key, arr);
      } else {
        const arr = map.get(e.date) || [];
        arr.push(e);
        map.set(e.date, arr);
      }
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, AITask[]>();
    for (const t of aiTasks) {
      const arr = map.get(t.date) || [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return map;
  }, [aiTasks]);

  const getDayEvents = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const jsDow = date.getDay();
      const byDate = eventsByDate.get(dateStr) || [];
      const byDow = eventsByDate.get(`dow:${jsDow}`) || [];
      return [...byDate, ...byDow];
    },
    [eventsByDate],
  );

  const getDayTasks = useCallback(
    (date: Date) => tasksByDate.get(format(date, "yyyy-MM-dd")) || [],
    [tasksByDate],
  );

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  // ── Ghost column width (stored in state to avoid DOM reads during render) ───
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    observer.observe(grid);
    setGridWidth(grid.offsetWidth);
    return () => observer.disconnect();
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const px = minutesToPx(now.getHours() * 60 + now.getMinutes());
    scrollRef.current.scrollTop = Math.max(0, px - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Live "now" indicator ──────────────────────────────────────────────────────
  const [nowMinutes, setNowMinutes] = useState(
    now.getHours() * 60 + now.getMinutes(),
  );

  useEffect(() => {
    const update = () => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    };
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const nowPx = minutesToPx(nowMinutes);
  const showNow = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  // ── Clean up click timer on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // ── Drag helpers ─────────────────────────────────────────────────────────────
  const getGridRelativePos = useCallback((clientX: number, clientY: number) => {
    const grid = gridRef.current;
    const scroll = scrollRef.current;
    if (!grid || !scroll) return null;
    const rect = grid.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top + scroll.scrollTop;
    return { x, y };
  }, []);

  const getColFromX = useCallback(
    (x: number, width: number) => {
      const colW = width / cols;
      return Math.max(0, Math.min(cols - 1, Math.floor(x / colW)));
    },
    [cols],
  );

  const handleEventMouseDown = useCallback(
    (e: React.MouseEvent, event: CalendarEvent) => {
      e.stopPropagation();
      const startMins = timeToMinutes(event.startTime || "09:00");
      const endMins = timeToMinutes(event.endTime || "10:00");
      const durationMins = endMins - startMins;
      const top = minutesToPx(startMins);
      const pos = getGridRelativePos(e.clientX, e.clientY);
      const offsetY = pos ? pos.y - top : 0;

      const state: DragState = {
        event,
        offsetY,
        durationMins,
        ghostTop: top,
        ghostColIndex: 0,
        started: false,
        startX: e.clientX,
        startY: e.clientY,
      };
      setDrag(state);
    },
    [getGridRelativePos],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (!d.started && Math.sqrt(dx * dx + dy * dy) < 5) return;

      const pos = getGridRelativePos(e.clientX, e.clientY);
      if (!pos) return;

      const grid = gridRef.current;
      if (!grid) return;

      const colIndex = getColFromX(pos.x, grid.offsetWidth);
      const rawTop = pos.y - d.offsetY;
      const rawMins = pxToMinutes(rawTop);
      const snappedMins = snapMinutes(rawMins);
      const snappedTop = minutesToPx(snappedMins);

      setDrag((prev) =>
        prev
          ? {
              ...prev,
              started: true,
              ghostTop: snappedTop,
              ghostColIndex: colIndex,
            }
          : null,
      );
    },
    [getGridRelativePos, getColFromX],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      if (d.started && onEventDrop) {
        const pos = getGridRelativePos(e.clientX, e.clientY);
        const grid = gridRef.current;
        if (pos && grid) {
          const colIndex = getColFromX(pos.x, grid.offsetWidth);
          const rawTop = pos.y - d.offsetY;
          const rawMins = pxToMinutes(rawTop);
          const snappedMins = snapMinutes(rawMins);
          const newStartTime = minsToTimeStr(snappedMins);
          const newDayIndex = visibleIndices[colIndex];
          onEventDrop(d.event, newDayIndex, newStartTime);
        }
      }

      setDrag(null);
    },
    [getGridRelativePos, getColFromX, onEventDrop, visibleIndices],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setDrag(null);
  }, []);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drag, handleMouseMove, handleMouseUp, handleKeyDown]);

  // Ghost block dimensions (computed from state, not DOM reads)
  const ghostHeight = drag
    ? Math.max((drag.durationMins / 60) * HOUR_HEIGHT - 2, 24)
    : 0;
  const ghostColW = gridWidth / cols;

  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden"
      style={{
        background: "var(--nous-bg)",
        userSelect: drag?.started ? "none" : undefined,
      }}
    >
      {/* Sticky day headers */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid var(--nous-border)" }}
      >
        <div style={{ width: GUTTER_W, minWidth: GUTTER_W, flexShrink: 0 }} />
        <div className="flex flex-1 min-w-0">
          {days.map(({ day, index }, colPos) => {
            const isToday = isSameDay(day, now);
            return (
              <div
                key={index}
                className="flex flex-col items-center py-2.5 gap-1 flex-1 min-w-0"
                style={{
                  borderLeft:
                    colPos > 0 ? "1px solid var(--nous-border)" : "none",
                }}
              >
                <span
                  className="text-[9px] font-bold tracking-[0.08em]"
                  style={{
                    color: isToday
                      ? "var(--nous-accent)"
                      : "var(--nous-secondary)",
                  }}
                >
                  {DAY_LABELS[index]}
                </span>
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold"
                  style={{
                    background: isToday ? "var(--nous-accent)" : "transparent",
                    color: isToday ? "#fff" : "var(--nous-primary)",
                    boxShadow: isToday
                      ? "0 0 12px rgba(45,139,139,0.4)"
                      : "none",
                  }}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar"
        style={
          {
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          } as React.CSSProperties
        }
      >
        <div className="flex relative" style={{ height: TOTAL_HEIGHT }}>
          {/* Time gutter */}
          <div className="shrink-0 relative" style={{ width: GUTTER_W }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute flex items-start justify-end pr-3"
                style={{
                  top: (h - START_HOUR) * HOUR_HEIGHT + (i === 0 ? 4 : -8),
                  height: HOUR_HEIGHT,
                  width: GUTTER_W,
                }}
              >
                <span
                  className="text-[10px] font-medium tabular-nums"
                  style={{ color: "var(--nous-tertiary)" }}
                >
                  {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div ref={gridRef} className="flex flex-1 relative">
            {/* Hour lines */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute w-full"
                  style={{
                    top: (h - START_HOUR) * HOUR_HEIGHT,
                    borderTop: "1px solid var(--nous-border)",
                    opacity: 0.5,
                  }}
                />
              ))}
              {hours.map((h) => (
                <div
                  key={`${h}h`}
                  className="absolute w-full"
                  style={{
                    top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                    borderTop: "1px dashed var(--nous-border)",
                    opacity: 0.25,
                  }}
                />
              ))}
            </div>

            {/* Now indicator */}
            {showNow && (
              <div
                className="absolute w-full pointer-events-none z-20 flex items-center"
                style={{ top: nowPx }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0 -ml-1"
                  style={{ background: "var(--nous-accent)" }}
                />
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--nous-accent)", opacity: 0.7 }}
                />
              </div>
            )}

            {/* Drag ghost block */}
            {drag?.started && (
              <div
                className="absolute pointer-events-none z-50 rounded-[8px] px-2 py-1 opacity-80"
                style={{
                  top: drag.ghostTop + 1,
                  height: ghostHeight,
                  left: drag.ghostColIndex * ghostColW + 4,
                  width: ghostColW - 8,
                  background: drag.event.color || "#2d8b8b",
                  boxShadow: `0 4px 20px ${drag.event.color || "#2d8b8b"}60`,
                  border: `2px solid ${drag.event.color || "#2d8b8b"}`,
                  backdropFilter: "blur(4px)",
                }}
              >
                <div className="text-[11px] font-semibold leading-tight truncate text-white">
                  {drag.event.title}
                </div>
                <div className="text-[9px] text-white/70 mt-0.5">
                  {minsToTimeStr(pxToMinutes(drag.ghostTop))}
                </div>
              </div>
            )}

            {/* Per-day columns */}
            {days.map(({ day, index }, colPos) => {
              const dayEvents = getDayEvents(day);
              const dayTasks = getDayTasks(day);
              const isToday = isSameDay(day, now);

              // Compute overlap layout for events
              const intervals = dayEvents.map((e) => ({
                start: timeToMinutes(e.startTime || "09:00"),
                end: timeToMinutes(e.endTime || "10:00"),
              }));
              const layout = computeOverlapLayout(intervals);

              return (
                <div
                  key={index}
                  className="flex-1 relative"
                  style={{
                    borderLeft:
                      colPos > 0 ? "1px solid var(--nous-border)" : "none",
                    background: isToday
                      ? "rgba(45,139,139,0.018)"
                      : "transparent",
                  }}
                  onClick={(e) => {
                    if (drag?.started) return;
                    const rect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();
                    const y =
                      e.clientY -
                      rect.top +
                      (scrollRef.current?.scrollTop ?? 0);
                    const totalMins =
                      START_HOUR * 60 + Math.round((y / HOUR_HEIGHT) * 60);
                    onSlotClick(index, minsToTimeStr(snapMinutes(totalMins)));
                  }}
                >
                  {/* Events */}
                  {dayEvents.map((event, eventIdx) => {
                    const startMins = timeToMinutes(event.startTime || "09:00");
                    const endMins = timeToMinutes(event.endTime || "10:00");
                    const top = minutesToPx(startMins);
                    const height = Math.max(
                      ((endMins - startMins) / 60) * HOUR_HEIGHT,
                      24,
                    );

                    const { fg, sub } = getEventColors(event.color);
                    const { column, totalColumns } = layout[eventIdx];

                    const isDragging =
                      drag != null &&
                      drag.started &&
                      drag.event?.id === event.id;

                    // Overlap positioning: split the column width
                    const colFraction = 1 / totalColumns;
                    const leftPct = `${column * colFraction * 100}%`;
                    const widthPct = `${colFraction * 100}%`;

                    return (
                      <div
                        key={event.id}
                        className="absolute rounded-[8px] px-2 py-1 overflow-hidden transition-all hover:brightness-110 active:scale-[0.98]"
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `calc(${leftPct} + 2px)`,
                          width: `calc(${widthPct} - 4px)`,
                          background: event.color || "#2d8b8b",
                          boxShadow: `0 2px 8px ${event.color || "#2d8b8b"}40`,
                          zIndex: 10,
                          opacity: isDragging ? 0.3 : 1,
                          cursor: drag && !drag.started ? "grabbing" : "grab",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleEventMouseDown(e, event);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dragRef.current?.started) return;
                          // Cancel pending single-click on double-click
                          if (e.detail === 2) {
                            if (clickTimerRef.current) {
                              clearTimeout(clickTimerRef.current);
                              clickTimerRef.current = null;
                            }
                            setDrag(null);
                            onEventDoubleClick(event);
                            return;
                          }
                          if (clickTimerRef.current)
                            clearTimeout(clickTimerRef.current);
                          clickTimerRef.current = setTimeout(() => {
                            if (!dragRef.current?.started) onEventClick(event);
                            clickTimerRef.current = null;
                          }, 250);
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold leading-tight truncate"
                          style={{ color: fg }}
                        >
                          {event.title}
                        </div>
                        {height > 36 && (
                          <div
                            className="text-[9px] mt-0.5 flex items-center gap-1"
                            style={{ color: sub }}
                          >
                            <span>{event.startTime}</span>
                            {event.endTime && (
                              <>
                                <span>–</span>
                                <span>{event.endTime}</span>
                              </>
                            )}
                            {event.room && (
                              <>
                                <span>·</span>
                                <span className="truncate">{event.room}</span>
                              </>
                            )}
                          </div>
                        )}
                        {height > 52 && event.classType && (
                          <div
                            className="text-[9px] font-medium uppercase tracking-wide mt-0.5"
                            style={{ color: sub }}
                          >
                            {event.classType}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Tasks — stacked vertically so they don't overlap */}
                  {dayTasks.map((task, taskIdx) => {
                    const top = minutesToPx(9 * 60) + taskIdx * (AI_TASK_HEIGHT + 2);
                    return (
                      <div
                        key={task.id}
                        className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 overflow-hidden"
                        style={{
                          top: top + 1,
                          height: AI_TASK_HEIGHT,
                          background: "rgba(48,196,141,0.1)",
                          border: "1px dashed rgba(48,196,141,0.3)",
                          zIndex: 9,
                        }}
                      >
                        <p
                          className="text-[9px] font-medium truncate"
                          style={{ color: "#30c48d" }}
                        >
                          ✦ {task.task}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
