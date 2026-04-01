"use client";
import React from "react";
import { CalendarEvent } from "@/types";
import { getEventColors } from "@/lib/calendar";

interface EventBlockProps {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

function normalizeClassType(ct: string): string {
  return ct;
}

export const EventBlock = ({ event, onClick, onDoubleClick }: EventBlockProps) => {
  const { fg, sub } = getEventColors(event.color);

  return (
    <div
      className="rounded-[10px] p-2 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.97] select-none"
      style={{
        backgroundColor: event.color || '#2d8b8b',
        boxShadow: `0 2px 8px ${event.color || '#2d8b8b'}40`,
      }}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(e);
      }}
    >
      <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: fg }}>
        {event.title}
      </div>
      {event.classType && (
        <div className="text-[9px] font-medium uppercase tracking-wide mt-0.5" style={{ color: sub }}>
          {normalizeClassType(event.classType)}
        </div>
      )}
      <div className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: sub }}>
        <span>{event.startTime}</span>
        {event.room && <><span>·</span><span className="truncate">{event.room}</span></>}
      </div>
    </div>
  );
};
