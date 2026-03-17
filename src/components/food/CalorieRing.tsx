import React, { useEffect, useState } from "react";

interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export const CalorieRing = ({ consumed, goal }: CalorieRingProps) => {
  const size = 140;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = r * 2 * Math.PI;
  const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);

  useEffect(() => {
    const progress = Math.min(consumed / goal, 1);
    setStrokeDashoffset(circumference - progress * circumference);
  }, [consumed, goal, circumference]);

  const remaining = Math.max(goal - Math.round(consumed), 0);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle stroke="var(--nous-border)" strokeWidth={stroke} fill="transparent" r={r} cx={size / 2} cy={size / 2} />
        <circle
          stroke="var(--nous-accent)"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-in-out" }}
          strokeLinecap="round"
          fill="transparent"
          r={r}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="flex flex-col items-center gap-0">
        <span className="text-2xl font-bold leading-none" style={{ color: "var(--nous-primary)" }}>
          {Math.round(consumed)}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "var(--nous-accent)" }}>
          kcal
        </span>
        <span className="text-[10px] mt-1 leading-none" style={{ color: "var(--nous-secondary)" }}>
          {remaining} left
        </span>
      </div>
    </div>
  );
};
