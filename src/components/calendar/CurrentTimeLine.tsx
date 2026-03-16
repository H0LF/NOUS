import React, { useEffect, useState } from "react";
import { format } from "date-fns";

export const CurrentTimeLine = () => {
  const [top, setTop] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = 7 * 60; // 07:00
      // 16 hours displayed (07:00 - 23:00), 1024px height
      // Each hour is 64px
      const offset = (minutes - startMinutes) * (64 / 60);
      setTop(Math.max(0, offset));
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (top < 0 || top > 1024) return null; // Hide if outside of 07:00-23:00

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
      style={{ top: `${top}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
      <div className="h-[2px] bg-red-500 w-full opacity-50" />
    </div>
  );
};
