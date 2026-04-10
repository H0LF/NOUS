"use client";
import { useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { CalendarEvent } from "@/types";

// Map subtype string → classType label
const subtypeMap: Record<string, CalendarEvent["classType"]> = {
  teorica: "Teórica",
  pratica: "Prática",
  "teorica-pratica": "Teórico-Prática",
};

// Add minutes to HH:MM string
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Duration by subtype (minutes)
const durationMap: Record<string, number> = {
  teorica: 90,
  pratica: 120,
  "teorica-pratica": 120,
};

const IMPORT_DATA = {
  exportDate: "2026-02-10T14:32:32.410Z",
  version: "1.0",
  user: {
    name: "André Lopes",
    email: "andreboucalopes@proton.me",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocIqfu4mFHYkIAgpogfL-2xyY5eD48QUvv5b_9ppCvT-OkqvyyM=s96-c",
  },
  theme: "dark",
  events: [
    {
      subtype: "teorica",
      startTime: "08:30",
      repeat: "weekly",
      color: "#8b5cf6",
      id: "f6a7b8c9-d0e1-4f6a-3b4c-5d6e7f8a9b0c",
      title: "AM2",
      date: "2026-02-10",
      type: "aula",
      room: "AGP",
    },
    {
      date: "2026-02-11",
      subtype: "pratica",
      color: "#8b5cf6",
      startTime: "12:30",
      title: "AM2",
      id: "e1f2a3b4-c5d6-4e1f-8a9b-0c1d2e3f4a5b",
      room: "G2.L2",
      repeat: "weekly",
      type: "aula",
    },
    {
      color: "#8b5cf6",
      type: "aula",
      date: "2026-02-12",
      title: "AM2",
      startTime: "11:00",
      room: "G0.A2",
      subtype: "teorica",
      repeat: "weekly",
      id: "b4c5d6e7-f8a9-4b4c-1d2e-3f4a5b6c7d8e",
    },
    {
      id: "a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d",
      title: "PROG",
      date: "2026-02-09",
      startTime: "10:00",
      type: "aula",
      repeat: "weekly",
      color: "#06b6d4",
      subtype: "teorica",
      room: "AGP",
    },
    {
      id: "d6e7f8a9-b0c1-4d6e-3f4a-5b6c7d8e9f0a",
      title: "PROG",
      date: "2026-02-12",
      startTime: "15:00",
      type: "aula",
      repeat: "weekly",
      color: "#06b6d4",
      subtype: "pratica",
      room: "L1.3",
    },
    {
      id: "c3d4e5f6-a7b8-4c3d-0e1f-2a3b4c5d6e7f",
      title: "ME",
      date: "2026-02-09",
      startTime: "11:00",
      type: "aula",
      repeat: "weekly",
      color: "#ec4899",
      subtype: "teorica",
      room: "G1.109",
    },
    {
      id: "b8c9d0e1-f2a3-4b8c-5d6e-7f8a9b0c1d2e",
      title: "ME",
      date: "2026-02-10",
      startTime: "10:30",
      type: "aula",
      repeat: "weekly",
      color: "#ec4899",
      subtype: "pratica",
      room: "E0.A1",
    },
    {
      id: "a3b4c5d6-e7f8-4a3b-0c1d-2e3f4a5b6c7d",
      title: "MD",
      date: "2026-02-11",
      startTime: "09:30",
      type: "aula",
      repeat: "weekly",
      color: "#10b981",
      subtype: "pratica",
      room: "L1.3",
    },
    {
      id: "a7b8c9d0-e1f2-4a7b-4c5d-6e7f8a9b0c1d",
      title: "MD",
      date: "2026-02-10",
      startTime: "18:30",
      type: "aula",
      repeat: "weekly",
      color: "#10b981",
      subtype: "teorica",
      room: "AGP",
    },
    {
      id: "f8a9b0c1-d2e3-4f8a-5b6c-7d8e9f0a1b2c",
      title: "MD",
      date: "2026-02-13",
      startTime: "18:30",
      type: "aula",
      repeat: "weekly",
      color: "#10b981",
      subtype: "teorica",
      room: "AGP",
    },
    {
      id: "e7f8a9b0-c1d2-4e7f-4a5b-6c7d8e9f0a1b",
      title: "AABD",
      date: "2026-02-13",
      startTime: "16:30",
      type: "aula",
      repeat: "weekly",
      color: "#f59e0b",
      subtype: "teorica",
      room: "A1.1",
    },
    {
      id: "b2c3d4e5-f6a7-4b2c-9d0e-1f2a3b4c5d6e",
      title: "AABD",
      date: "2026-02-09",
      startTime: "13:00",
      type: "aula",
      repeat: "weekly",
      color: "#f59e0b",
      subtype: "pratica",
      room: "L1.4",
    },
    {
      id: "d4e5f6a7-b8c9-4d4e-1f2a-3b4c5d6e7f8a",
      title: "ID",
      date: "2026-02-09",
      startTime: "15:00",
      type: "aula",
      repeat: "weekly",
      color: "#3b82f6",
      subtype: "teorica",
      room: "A1.1",
    },
    {
      id: "e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b",
      title: "ID",
      date: "2026-02-09",
      startTime: "17:30",
      type: "aula",
      repeat: "weekly",
      color: "#3b82f6",
      subtype: "pratica",
      room: "L1.4",
    },
    {
      id: "c9d0e1f2-a3b4-4c9d-6e7f-8a9b0c1d2e3f",
      title: "CR",
      date: "2026-02-10",
      startTime: "13:00",
      type: "aula",
      repeat: "weekly",
      color: "#ef4444",
      subtype: "teorica",
      room: "L1.3",
    },
    {
      id: "c5d6e7f8-a9b0-4c5d-2e3f-4a5b6c7d8e9f",
      title: "CR",
      date: "2026-02-12",
      startTime: "17:30",
      type: "aula",
      repeat: "weekly",
      color: "#ef4444",
      subtype: "pratica",
      room: "AGP",
    },
    {
      id: "d0e1f2a3-b4c5-4d0e-7f8a-9b0c1d2e3f4a",
      title: "SI",
      date: "2026-02-10",
      startTime: "16:30",
      type: "aula",
      repeat: "weekly",
      color: "#666666",
      subtype: "teorica",
      room: "A2.1",
    },
    {
      id: "f2a3b4c5-d6e7-4f2a-9b0c-1d2e3f4a5b6c",
      title: "S1",
      date: "2026-02-11",
      startTime: "17:30",
      type: "aula",
      repeat: "weekly",
      color: "#666666",
      subtype: "pratica",
      room: "L1.4",
    },
  ],
};

export default function ImportPage() {
  const { saveDoc } = useFirestore();
  const { user } = useStore();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    if (!user) {
      addLog("[ERROR] Not logged in");
      return;
    }
    setStatus("running");
    setLog([]);
    setProgress(0);

    const events = IMPORT_DATA.events;
    const now = new Date().toISOString();

    for (let i = 0; i < events.length; i++) {
      const e = events[i] as any;
      try {
        const dateObj = new Date(e.date + "T00:00:00");
        const dayOfWeek = dateObj.getDay(); // 0=Sun … 6=Sat
        const subtype = (e.subtype || "").toLowerCase();
        const duration = durationMap[subtype] ?? 90;
        const classType = subtypeMap[subtype];

        const event: CalendarEvent = {
          id: e.id,
          userId: user.uid,
          title: e.title,
          color: e.color,
          startTime: e.startTime,
          endTime: addMinutes(e.startTime, duration),
          dayOfWeek,
          date: e.date,
          isWeekly: e.repeat === "weekly",
          isClass: e.type === "aula",
          room: e.room,
          classType,
          createdAt: now,
        };

        await saveDoc("events", event.id, event);
        addLog(`[OK] ${event.title} — ${classType} (${e.date} ${e.startTime})`);
      } catch (err: unknown) {
        addLog(
          `[FAIL] ${e.title} — ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
      setProgress(i + 1);
    }

    setStatus("done");
    addLog(`\nDone! ${events.length} events imported.`);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "var(--nous-bg)" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: "var(--nous-surface)",
          border: "1px solid var(--nous-border)",
        }}
      >
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--nous-primary)" }}
          >
            Import Calendar Events
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--nous-secondary)" }}
          >
            This will import {IMPORT_DATA.events.length} weekly class events
            into your calendar.
          </p>
        </div>

        {/* Preview */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--nous-border)" }}
        >
          <div
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(var(--nous-accent-rgb),0.08)",
              color: "var(--nous-accent)",
            }}
          >
            Events to import
          </div>
          <div
            className="divide-y"
            style={{ borderColor: "var(--nous-border)" } as React.CSSProperties}
          >
            {IMPORT_DATA.events.map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: e.color }}
                />
                <span
                  className="text-[13px] font-medium flex-1"
                  style={{ color: "var(--nous-primary)" }}
                >
                  {e.title}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--nous-secondary)" }}
                >
                  {subtypeMap[(e.subtype || "").toLowerCase()] || e.subtype}
                </span>
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--nous-tertiary)" }}
                >
                  {e.startTime}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {status === "running" && (
          <div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--nous-border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(progress / IMPORT_DATA.events.length) * 100}%`,
                  background: "var(--nous-accent)",
                }}
              />
            </div>
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--nous-secondary)" }}
            >
              {progress} / {IMPORT_DATA.events.length}
            </p>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div
            className="rounded-xl p-4 font-mono text-[11px] max-h-48 overflow-y-auto"
            style={{
              background: "var(--nous-bg)",
              border: "1px solid var(--nous-border)",
              color: "var(--nous-secondary)",
            }}
          >
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}

        {/* Button */}
        {status !== "done" ? (
          <button
            onClick={runImport}
            disabled={status === "running" || !user}
            className="w-full py-3 rounded-xl font-semibold text-[14px] transition-all"
            style={{
              background:
                status === "running" ? "rgba(var(--nous-accent-rgb),0.3)" : "var(--nous-accent)",
              color: "#fff",
              cursor: status === "running" ? "not-allowed" : "pointer",
            }}
          >
            {status === "running" ? "Importing…" : "Import Events"}
          </button>
        ) : (
          <div className="flex gap-3">
            <div
              className="flex-1 py-3 rounded-xl text-center font-semibold text-[14px]"
              style={{ background: "rgba(48,196,141,0.15)", color: "#30c48d" }}
            >
              Import complete
            </div>
            <a
              href="/app/calendar"
              className="flex-1 py-3 rounded-xl text-center font-semibold text-[14px] transition-all"
              style={{
                background: "rgba(var(--nous-accent-rgb),0.2)",
                color: "var(--nous-accent)",
              }}
            >
              Go to Calendar
            </a>
          </div>
        )}

        {!user && (
          <p
            className="text-[12px] text-center"
            style={{ color: "var(--nous-error)" }}
          >
            You must be logged in to import events.
          </p>
        )}
      </div>
    </div>
  );
}
