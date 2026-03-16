import React, { useEffect, useState } from "react";

interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export const CalorieRing = ({ consumed, goal }: CalorieRingProps) => {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);

  useEffect(() => {
    const progress = Math.min(consumed / goal, 1);
    const offset = circumference - progress * circumference;
    setStrokeDashoffset(offset);
  }, [consumed, goal, circumference]);

  return (
    <div className="relative flex items-center justify-center w-[120px] h-[120px]">
      <svg
        height="120"
        width="120"
        className="transform -rotate-90"
      >
        <circle
          stroke="var(--nous-border)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx="60"
          cy="60"
        />
        <circle
          stroke="var(--nous-accent)"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-in-out" }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx="60"
          cy="60"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-nous-primary">{Math.round(consumed)}</span>
        <span className="text-xs text-nous-secondary">/ {goal}</span>
        <span className="text-[10px] text-nous-secondary uppercase tracking-wider mt-1">kcal</span>
      </div>
    </div>
  );
};
