"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { CalendarEvent } from "@/types";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventModal } from "@/components/calendar/EventModal";
import { AIPlannerPanel } from "@/components/calendar/AIPlannerPanel";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  // All events/tasks come from the shared store (populated by useAppData).
  // No Firestore subscriptions are opened here.
  const {
    currentWeekStart,
    setCurrentWeekStart,
    user,
    calendarEvents: events,
    aiTasks,
  } = useStore();
  const { saveDoc } = useFirestore();
  const router = useRouter();

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedDaySlot, setSelectedDaySlot] = useState<
    { day: number; time: string } | undefined
  >();
  const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);

  // Week always starts Monday
  const monday = startOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const getSlotDate = (dayIndex: number) =>
    format(addDays(monday, dayIndex), "yyyy-MM-dd");

  // ── Event drag-and-drop ────────────────────────────────────────────────────
  const handleEventDrop = async (
    event: CalendarEvent,
    newDayIndex: number,
    newStartTime: string,
  ) => {
    if (!user) return;
    // Preserve the original event duration when moving to a new slot.
    const toMins = (t: string) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };
    const duration = toMins(event.endTime || event.startTime) - toMins(event.startTime);
    const [sh, sm] = newStartTime.split(":").map(Number);
    const endTotal = sh * 60 + sm + Math.max(duration, 30);
    const newEndTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;

    try {
      await saveDoc("events", event.id, {
        startTime: newStartTime,
        endTime: newEndTime,
        date: getSlotDate(newDayIndex),
        dayOfWeek: addDays(monday, newDayIndex).getDay(),
      });
    } catch (err) {
      console.error("[CalendarPage] Failed to move event:", err);
    }
  };

  // ── Calendar → Notes deep-link ─────────────────────────────────────────────
  // Double-clicking an event stashes its metadata in sessionStorage so the
  // Notes page can pick it up and create/open the linked note.
  const handleEventDoubleClick = useCallback(
    (event: CalendarEvent) => {
      sessionStorage.setItem(
        "pendingNote",
        JSON.stringify({
          eventId: event.id,
          eventTitle: event.title,
          isClass: event.isClass,
          classType: event.classType,
        }),
      );
      router.push("/app/notes");
    },
    [router],
  );

  // ── Mobile scroll: jump to today's column on load ─────────────────────────
  const mobileRailRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = mobileRailRef.current;
    if (!rail) return;
    const today = new Date();
    const todayMonday = startOfWeek(today, { weekStartsOn: 1 });
    const isCurrentWeek = monday.getTime() === todayMonday.getTime();
    let targetIndex = 0;
    if (isCurrentWeek) {
      const jsDow = today.getDay();
      targetIndex = jsDow === 0 ? 6 : jsDow - 1;
    }
    rail.scrollLeft = targetIndex * rail.offsetWidth;
    // Using monday.getTime() (a number) rather than monday (a Date object)
    // so this effect only fires when the week actually changes, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday.getTime()]);

  // ── Shared slot/event click handlers ──────────────────────────────────────
  const handleSlotClick = (day: number, time: string) => {
    setSelectedEvent(undefined);
    setSelectedDaySlot({ day, time });
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDaySlot(undefined);
    setIsEventModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-nous-bg">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #2d8b8b 0%, #1d6b6b 100%)",
              boxShadow: "0 4px 14px rgba(45,139,139,0.3)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="2.5" fill="white" fillOpacity="0.9" />
              <circle cx="5" cy="17" r="2.5" fill="white" fillOpacity="0.9" />
              <circle cx="19" cy="17" r="2.5" fill="white" fillOpacity="0.9" />
              <line x1="12" y1="7.5" x2="5" y2="14.5" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" />
              <line x1="12" y1="7.5" x2="19" y2="14.5" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" />
              <line x1="5" y1="17" x2="19" y2="17" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Month + year */}
          <div>
            <p
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--nous-accent)", letterSpacing: "0.18em" }}
            >
              NOUS
            </p>
            <div className="flex items-baseline gap-1.5">
              <h1
                className="text-[26px] font-bold font-display"
                style={{
                  fontStyle: "italic",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  color: "var(--nous-primary)",
                }}
              >
                {format(monday, "MMMM")}
              </h1>
              <span
                className="text-[13px] font-medium"
                style={{ color: "var(--nous-secondary)" }}
              >
                {format(monday, "yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI planner button */}
          <button
            onClick={() => setIsAIPlannerOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-bold transition-all duration-200 active:scale-95 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #2d8b8b 0%, #45abab 100%)",
              boxShadow: "0 2px 12px rgba(45,139,139,0.35)",
              color: "#ffffff",
              border: "none",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            AI
          </button>

          {/* Today button */}
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="h-8 px-3 rounded-full text-[11px] font-medium transition-all active:scale-95"
            style={{
              background: "var(--nous-surface)",
              border: "1px solid var(--nous-border)",
              color: "var(--nous-secondary)",
            }}
          >
            Today
          </button>

          {/* Week navigation */}
          <div
            className="flex items-center rounded-full overflow-hidden"
            style={{
              background: "var(--nous-surface)",
              border: "1px solid var(--nous-border)",
            }}
          >
            <button
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="w-8 h-8 flex items-center justify-center transition-colors text-nous-secondary hover:text-nous-primary"
              title="Previous week"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="w-8 h-8 flex items-center justify-center transition-colors text-nous-secondary hover:text-nous-primary"
              title="Next week"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div className="flex-1 min-h-0 px-4 pb-24">
        <div
          className="h-full rounded-[20px] overflow-hidden flex flex-col"
          style={{
            background: "var(--nous-surface)",
            border: "1px solid var(--nous-border)",
          }}
        >
          {/* Desktop: full 7-day grid */}
          <div className="hidden sm:flex flex-col flex-1 min-h-0">
            <CalendarGrid
              weekStart={monday}
              events={events}
              aiTasks={aiTasks}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              onEventDoubleClick={handleEventDoubleClick}
              onEventDrop={handleEventDrop}
            />
          </div>

          {/* Mobile: horizontal snap-scroll — one day per panel */}
          <div
            ref={mobileRailRef}
            className="sm:hidden flex flex-1 min-h-0"
            style={{
              overflowX: "scroll",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            } as React.CSSProperties}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
              <div
                key={dayIndex}
                style={{
                  minWidth: "100%",
                  height: "100%",
                  scrollSnapAlign: "start",
                  scrollSnapStop: "always",
                }}
              >
                <CalendarGrid
                  weekStart={monday}
                  events={events}
                  aiTasks={aiTasks}
                  mobileDays={[dayIndex]}
                  onSlotClick={handleSlotClick}
                  onEventClick={handleEventClick}
                  onEventDoubleClick={handleEventDoubleClick}
                  onEventDrop={handleEventDrop}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        event={selectedEvent}
        defaultDay={selectedDaySlot?.day}
        defaultTime={selectedDaySlot?.time}
        defaultDate={
          selectedDaySlot ? getSlotDate(selectedDaySlot.day) : undefined
        }
        userId={user?.uid || ""}
      />

      <AIPlannerPanel
        isOpen={isAIPlannerOpen}
        onClose={() => setIsAIPlannerOpen(false)}
        weeklyEvents={events.filter((e: CalendarEvent) => e.isWeekly)}
        userId={user?.uid || ""}
      />
    </div>
  );
}
