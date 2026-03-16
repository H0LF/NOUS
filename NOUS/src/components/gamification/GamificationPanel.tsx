"use client";
import React from "react";
import { useGamification, Badge, RadarAxis } from "@/hooks/useGamification";

// ── Radar (spider) chart ──────────────────────────────────────────────────────
const RadarChart = ({ axes }: { axes: RadarAxis[] }) => {
  const SIZE = 200;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 80; // max radius
  const n = axes.length;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  const angleOf = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;

  const polarToXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  // Ring polygons
  const ringPath = (ratio: number) => {
    return (
      axes
        .map((_, i) => {
          const { x, y } = polarToXY(angleOf(i), R * ratio);
          return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ") + " Z"
    );
  };

  // Data polygon
  const dataPath =
    axes
      .map((axis, i) => {
        const { x, y } = polarToXY(angleOf(i), R * (axis.value / 100));
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  // Label positions (pushed outside the outer ring)
  const labelOffset = R + 22;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c7aff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c7aff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {rings.map((ratio, ri) => (
        <path
          key={ri}
          d={ringPath(ratio)}
          fill="none"
          stroke={
            ratio === 1 ? "rgba(124,122,255,0.25)" : "rgba(255,255,255,0.06)"
          }
          strokeWidth={ratio === 1 ? 1 : 0.8}
        />
      ))}

      {/* Axis spokes */}
      {axes.map((_, i) => {
        const { x, y } = polarToXY(angleOf(i), R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x.toFixed(2)}
            y2={y.toFixed(2)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Data fill */}
      <path d={dataPath} fill="url(#radarFill)" />

      {/* Data stroke */}
      <path
        d={dataPath}
        fill="none"
        stroke="url(#radarStroke)"
        strokeWidth="1.8"
        filter="url(#radarGlow)"
      />

      {/* Data dots */}
      {axes.map((axis, i) => {
        const { x, y } = polarToXY(angleOf(i), R * (axis.value / 100));
        return (
          <circle
            key={i}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r="3.5"
            fill="#38bdf8"
            stroke="#0d0d12"
            strokeWidth="1.5"
            filter="url(#radarGlow)"
          />
        );
      })}

      {/* Labels */}
      {axes.map((axis, i) => {
        const angle = angleOf(i);
        const { x, y } = polarToXY(angle, labelOffset);
        const textAnchor =
          Math.abs(Math.cos(angle)) < 0.1
            ? "middle"
            : Math.cos(angle) >= 0
              ? "start"
              : "end";
        const dy = Math.sin(angle) > 0.5 ? 10 : Math.sin(angle) < -0.5 ? -2 : 4;
        return (
          <g key={i}>
            <text
              x={x.toFixed(2)}
              y={(y + dy).toFixed(2)}
              textAnchor={textAnchor}
              fontSize="9"
              fontWeight="600"
              fill="rgba(232,232,240,0.7)"
              fontFamily="-apple-system, sans-serif"
            >
              {axis.label}
            </text>
            <text
              x={x.toFixed(2)}
              y={(y + dy + 11).toFixed(2)}
              textAnchor={textAnchor}
              fontSize="8"
              fill="#7c7aff"
              fontFamily="-apple-system, sans-serif"
              fontWeight="700"
            >
              {axis.rawLabel}
            </text>
          </g>
        );
      })}

      {/* Center glow */}
      <circle
        cx={cx}
        cy={cy}
        r="4"
        fill="#7c7aff"
        opacity="0.5"
        filter="url(#radarGlow)"
      />
    </svg>
  );
};

// ── Badge icon ────────────────────────────────────────────────────────────────
const BadgeIcon = ({
  type,
  earned,
}: {
  type: Badge["icon"];
  earned: boolean;
}) => {
  const color = earned ? "#7c7aff" : "#2e2e40";
  const icons: Record<Badge["icon"], React.ReactNode> = {
    food: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    gym: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 6.5h11" />
        <path d="M6.5 17.5h11" />
        <path d="M6 20v-4" />
        <path d="M18 20v-4" />
        <path d="M6 8V4" />
        <path d="M18 8V4" />
        <path d="M3 12h18" />
      </svg>
    ),
    class: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    streak: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    star: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
};

// ── Main panel ────────────────────────────────────────────────────────────────
export const GamificationPanel = () => {
  const g = useGamification();

  if (g.loading) {
    return (
      <div
        className="rounded-2xl p-6 space-y-4 animate-pulse"
        style={{
          background: "rgba(124,122,255,0.05)",
          border: "1px solid rgba(124,122,255,0.1)",
        }}
      >
        <div
          className="h-4 rounded-full w-1/3"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="h-48 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
      </div>
    );
  }

  const earnedBadges = g.badges.filter((b) => b.earned);
  const lockedBadges = g.badges.filter((b) => !b.earned);

  return (
    <div className="space-y-5">
      {/* ── Level + XP bar ── */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(124,122,255,0.1) 0%, rgba(56,189,248,0.06) 100%)",
          border: "1px solid rgba(124,122,255,0.18)",
        }}
      >
        <div className="flex items-end justify-between">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: "#7c7aff" }}
            >
              Level
            </p>
            <p
              className="text-4xl font-black leading-none"
              style={{ color: "#e8e8f0" }}
            >
              {g.level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: "#4a4a5e" }}>
              Total XP
            </p>
            <p className="text-2xl font-bold" style={{ color: "#a5a3ff" }}>
              {g.xp.toLocaleString()}
            </p>
          </div>
        </div>

        <div>
          <div
            className="flex justify-between text-[10px] mb-1.5"
            style={{ color: "#3a3a50" }}
          >
            <span>{g.xpForCurrentLevel.toLocaleString()} XP</span>
            <span>{g.xpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${g.progressPercent}%`,
                background: "linear-gradient(90deg, #7c7aff, #38bdf8)",
                boxShadow: "0 0 10px rgba(124,122,255,0.5)",
              }}
            />
          </div>
          <p
            className="text-[10px] mt-1 text-right"
            style={{ color: "#3a3a50" }}
          >
            {Math.max(0, g.xpForNextLevel - g.xp)} XP to Level {g.level + 1}
          </p>
        </div>
      </div>

      {/* ── Radar chart ── */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center gap-4"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <p
          className="w-full text-[10px] font-semibold uppercase tracking-widest self-start"
          style={{ color: "#4a4a5e" }}
        >
          Performance
        </p>
        {g.radar.length === 6 ? (
          <RadarChart axes={g.radar} />
        ) : (
          <div
            className="h-48 flex items-center justify-center text-[12px]"
            style={{ color: "#3a3a50" }}
          >
            Loading stats...
          </div>
        )}

        {/* Axis legend row */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 w-full">
          {g.radar.map((axis) => (
            <div key={axis.label} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#4a4a5e" }}>
                  {axis.label}
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: "#7c7aff" }}
                >
                  {axis.value}%
                </span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${axis.value}%`,
                    background: "linear-gradient(90deg, #7c7aff, #38bdf8)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── XP guide ── */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "#3a3a50" }}
        >
          Como ganhar XP
        </p>
        <div className="space-y-1 text-[11px]" style={{ color: "#3a3a50" }}>
          <div className="flex justify-between">
            <span>Registar refeicao num dia</span>
            <span className="font-medium" style={{ color: "#4a4a5e" }}>
              +10 XP
            </span>
          </div>
          <div className="flex justify-between">
            <span>Completar treino</span>
            <span className="font-medium" style={{ color: "#4a4a5e" }}>
              +50 XP
            </span>
          </div>
          <div className="flex justify-between">
            <span>Treino de alto volume</span>
            <span className="font-medium" style={{ color: "#4a4a5e" }}>
              +25 XP
            </span>
          </div>
          <div className="flex justify-between">
            <span>Aula no calendario</span>
            <span className="font-medium" style={{ color: "#4a4a5e" }}>
              +15 XP
            </span>
          </div>
          <div className="flex justify-between">
            <span>Dia de streak alimentar</span>
            <span className="font-medium" style={{ color: "#4a4a5e" }}>
              +5 XP
            </span>
          </div>
          <div className="flex justify-between">
            <span>Dia de streak de treino</span>
            <span className="font-medium" style={{ color: "#4a4a5e" }}>
              +8 XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
