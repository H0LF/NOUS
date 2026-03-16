"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { CalendarEvent, AITask } from "@/types";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventModal } from "@/components/calendar/EventModal";
import { AIPlannerPanel } from "@/components/calendar/AIPlannerPanel";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const { currentWeekStart, setCurrentWeekStart, user } = useStore();
  const { subscribeCollection, saveDoc } = useFirestore();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [aiTasks, setAiTasks] = useState<AITask[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedDaySlot, setSelectedDaySlot] = useState<{ day: number; time: string } | undefined>();
  const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeCollection<CalendarEvent>("events", setEvents);
    const u2 = subscribeCollection<AITask>("ai_tasks", setAiTasks);
    return () => { u1(); u2(); };
  }, [user, subscribeCollection]);

  // Week always starts Monday
  const monday = startOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const getSlotDate = (dayIndex: number) => {
    return format(addDays(monday, dayIndex), "yyyy-MM-dd");
  };

  const handleEventDrop = async (event: CalendarEvent, newDayIndex: number, newStartTime: string) => {
    if (!user) return;
    // Compute duration to preserve endTime offset
    const startMins = (h: string) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
    const duration = startMins(event.endTime || event.startTime) - startMins(event.startTime);
    const [sh, sm] = newStartTime.split(":").map(Number);
    const endTotalMins = sh * 60 + sm + Math.max(duration, 30);
    const newEndTime = `${String(Math.floor(endTotalMins / 60) % 24).padStart(2, "0")}:${String(endTotalMins % 60).padStart(2, "0")}`;
    const newDate = getSlotDate(newDayIndex);
    const newDayOfWeek = addDays(monday, newDayIndex).getDay();
    await saveDoc("events", event.id, {
      startTime: newStartTime,
      endTime: newEndTime,
      date: newDate,
      dayOfWeek: newDayOfWeek,
    });
  };

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

  // Mobile smooth-scroll: ref to the horizontal rail
  const mobileRailRef = React.useRef<HTMLDivElement>(null);

  // On mount / week change: scroll to today's column if on current week, else to Monday
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
  // monday.getTime() is a stable number — won't re-fire on every render like [monday] would
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday.getTime()]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-nous-bg">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c7aff 0%, #5e5ce6 100%)', boxShadow: '0 4px 14px rgba(124,122,255,0.35)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="5" cy="17" r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="19" cy="17" r="2.5" fill="white" fillOpacity="0.9"/>
              <line x1="12" y1="7.5" x2="5" y2="14.5" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
              <line x1="12" y1="7.5" x2="19" y2="14.5" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
              <line x1="5" y1="17" x2="19" y2="17" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
            </svg>
          </div>
          {/* Name + date */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: 'var(--nous-accent)', letterSpacing: '0.18em' }}>NOUS</p>
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-[26px] font-bold"
                style={{ fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--nous-primary)' }}>
                {format(monday, "MMMM")}
              </h1>
              <span className="text-[13px] font-medium" style={{ color: 'var(--nous-secondary)' }}>
                {format(monday, "yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI button */}
          <button
            onClick={() => setIsAIPlannerOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
            style={{
              background: 'rgba(124,122,255,0.1)',
              border: '1px solid rgba(124,122,255,0.2)',
              color: 'var(--nous-accent)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            AI
          </button>

          {/* Week nav — visible on all screen sizes */}
          <div className="flex items-center rounded-full overflow-hidden"
            style={{ background: 'var(--nous-surface)', border: '1px solid var(--nous-border)' }}>
            <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="w-8 h-8 flex items-center justify-center transition-colors text-nous-secondary hover:text-nous-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="w-8 h-8 flex items-center justify-center transition-colors text-nous-secondary hover:text-nous-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div className="flex-1 min-h-0 px-4 pb-24">
        <div className="h-full rounded-[20px] overflow-hidden flex flex-col"
          style={{ background: 'var(--nous-surface)', border: '1px solid var(--nous-border)' }}>

          {/* Desktop: full 7-day grid */}
          <div className="hidden sm:flex flex-col flex-1 min-h-0">
            <CalendarGrid
              weekStart={monday}
              events={events}
              aiTasks={aiTasks}
              onSlotClick={(day, time) => { setSelectedEvent(undefined); setSelectedDaySlot({ day, time }); setIsEventModalOpen(true); }}
              onEventClick={(event) => { setSelectedEvent(event); setSelectedDaySlot(undefined); setIsEventModalOpen(true); }}
              onEventDoubleClick={handleEventDoubleClick}
              onEventDrop={handleEventDrop}
            />
          </div>

          {/* Mobile: smooth horizontal snap scroll — one day per panel */}
          <div
            ref={mobileRailRef}
            className="sm:hidden flex flex-1 min-h-0"
            style={{
              overflowX: 'scroll',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            } as React.CSSProperties}
          >
            {[0,1,2,3,4,5,6].map(dayIndex => (
              <div
                key={dayIndex}
                style={{ minWidth: '100%', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
              >
                <CalendarGrid
                  weekStart={monday}
                  events={events}
                  aiTasks={aiTasks}
                  mobileDays={[dayIndex]}
                  onSlotClick={(day, time) => { setSelectedEvent(undefined); setSelectedDaySlot({ day, time }); setIsEventModalOpen(true); }}
                  onEventClick={(event) => { setSelectedEvent(event); setSelectedDaySlot(undefined); setIsEventModalOpen(true); }}
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
        defaultDate={selectedDaySlot ? getSlotDate(selectedDaySlot.day) : undefined}
        userId={user?.uid || ""}
      />
      <AIPlannerPanel
        isOpen={isAIPlannerOpen}
        onClose={() => setIsAIPlannerOpen(false)}
        weeklyEvents={events.filter(e => e.isWeekly)}
        userId={user?.uid || ""}
      />
    </div>
  );
}
