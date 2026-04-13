import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { CalendarEvent } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { useFirestore } from "@/hooks/useFirestore";
import toast from "react-hot-toast";

type ClassType = "Teórica" | "Teórico-Prática" | "Prática";

// ── Custom time spinner ────────────────────────────────────────────────────
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const parts = value.split(":");
  const h = parseInt(parts[0] ?? "0", 10) || 0;
  const m = parseInt(parts[1] ?? "0", 10) || 0;

  const adj = (type: "h" | "m", delta: number) => {
    if (type === "h") {
      const newH = (h + delta + 24) % 24;
      onChange(`${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    } else {
      const newM = (m + delta + 60) % 60;
      onChange(`${String(h).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
    }
  };

  const handleInput = (type: "h" | "m", raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    if (type === "h") {
      const clamped = Math.min(Math.max(n, 0), 23);
      onChange(`${String(clamped).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    } else {
      const clamped = Math.min(Math.max(n, 0), 59);
      onChange(`${String(h).padStart(2, "0")}:${String(clamped).padStart(2, "0")}`);
    }
  };

  const ChevronUp = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
  const ChevronDown = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const spinnerBtn = "p-1 rounded-md transition-colors hover:text-nous-accent";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-nous-secondary">
        {label}
      </label>
      <div
        className="flex items-center justify-center gap-1 rounded-xl px-5 py-3"
        style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
      >
        {/* Hours */}
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" onClick={() => adj("h", 1)} className={spinnerBtn}
            style={{ color: "var(--nous-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--nous-accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--nous-secondary)")}
          ><ChevronUp /></button>
          <input
            type="number"
            min={0} max={23}
            value={String(h).padStart(2, "0")}
            onChange={e => handleInput("h", e.target.value)}
            className="w-10 text-center text-[22px] font-bold tabular-nums leading-none py-0.5 bg-transparent outline-none border-none appearance-none"
            style={{ color: "var(--nous-primary)", MozAppearance: "textfield" } as React.CSSProperties}
          />
          <button type="button" onClick={() => adj("h", -1)} className={spinnerBtn}
            style={{ color: "var(--nous-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--nous-accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--nous-secondary)")}
          ><ChevronDown /></button>
        </div>

        <span className="text-[22px] font-bold mb-0.5" style={{ color: "var(--nous-tertiary)" }}>:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center gap-0.5">
          <button type="button" onClick={() => adj("m", 1)} className={spinnerBtn}
            style={{ color: "var(--nous-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--nous-accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--nous-secondary)")}
          ><ChevronUp /></button>
          <input
            type="number"
            min={0} max={59}
            value={String(m).padStart(2, "0")}
            onChange={e => handleInput("m", e.target.value)}
            className="w-10 text-center text-[22px] font-bold tabular-nums leading-none py-0.5 bg-transparent outline-none border-none appearance-none"
            style={{ color: "var(--nous-primary)", MozAppearance: "textfield" } as React.CSSProperties}
          />
          <button type="button" onClick={() => adj("m", -1)} className={spinnerBtn}
            style={{ color: "var(--nous-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--nous-accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--nous-secondary)")}
          ><ChevronDown /></button>
        </div>
      </div>
    </div>
  );
}

const timeInputCls = [
  "w-full px-4 py-2.5 rounded-xl outline-none transition-all duration-200",
  "bg-nous-surface border border-nous-border text-nous-primary",
  "focus:border-nous-accent focus:ring-2 focus:ring-nous-accent/20",
].join(" ");

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent;
  defaultDay?: number;
  defaultDate?: string;
  defaultTime?: string;
  userId: string;
  onSave?: () => void;
}

// ── Inline delete-confirmation dialog ──────────────────────────────────────
interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteConfirm = ({ onConfirm, onCancel, loading }: DeleteConfirmProps) => (
  <div
    className="rounded-xl p-4 space-y-3 animate-fadeIn"
    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
  >
    <p className="text-sm font-medium" style={{ color: "var(--nous-primary)" }}>
      Delete this event?
    </p>
    <p className="text-xs" style={{ color: "var(--nous-secondary)" }}>
      This action cannot be undone.
    </p>
    <div className="flex gap-2 justify-end">
      <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
        Keep
      </Button>
      <Button variant="danger" type="button" onClick={onConfirm} loading={loading}>
        Delete
      </Button>
    </div>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────

export const EventModal = ({
  isOpen,
  onClose,
  event,
  defaultDay,
  defaultDate,
  defaultTime,
  userId,
  onSave,
}: EventModalProps) => {
  const { saveDoc, deleteDocument } = useFirestore();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#7c6bff");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isWeekly, setIsWeekly] = useState(false);
  const [isClass, setIsClass] = useState(false);
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState<ClassType>("Teórica");
  const [date, setDate] = useState("");
  const [eventType, setEventType] = useState<"exam" | "project" | "">("");

  useEffect(() => {
    if (!isOpen) return;
    setShowDeleteConfirm(false);

    if (event) {
      setTitle(event.title);
      setColor(event.color);
      setStartTime(event.startTime);
      setEndTime(event.endTime);
      setIsWeekly(event.isWeekly);
      setIsClass(event.isClass);
      setRoom(event.room || "");
      const ct = event.classType;
      if (ct === "Teórica") setClassType("Teórica");
      else if (ct === "Teórico-Prática") setClassType("Teórico-Prática");
      else if (ct === "Prática") setClassType("Prática");
      else setClassType("Teórica");
      setDate(event.date);
      setEventType(event.eventType || "");
    } else {
      setTitle("");
      setColor("#7c6bff");
      setStartTime(defaultTime || "09:00");
      const [h, m] = (defaultTime || "09:00").split(":").map(Number);
      const endH = (h + 1).toString().padStart(2, "0");
      setEndTime(`${endH}:${m.toString().padStart(2, "0")}`);
      setIsWeekly(false);
      setIsClass(false);
      setRoom("");
      setClassType("Teórica");
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setEventType("");
    }
  }, [isOpen, event, defaultTime, defaultDate]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const finalStartTime = startTime || "09:00";
    const finalEndTime = endTime || "10:00";
    const today = new Date();
    const finalDate =
      date ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (finalStartTime >= finalEndTime) {
      toast.error("End time must be after start time");
      return;
    }

    setLoading(true);
    try {
      const id = event?.id || uuidv4();
      const [y, mo, d] = finalDate.split("-").map(Number);
      const dayOfWeek = new Date(y, mo - 1, d).getDay();

      const newEvent: CalendarEvent = {
        id,
        userId,
        title: title.trim(),
        color,
        startTime: finalStartTime,
        endTime: finalEndTime,
        dayOfWeek: isWeekly
          ? defaultDay !== undefined
            ? defaultDay
            : dayOfWeek
          : dayOfWeek,
        date: isWeekly ? "" : finalDate,
        isWeekly,
        isClass,
        ...(isClass ? { room, classType } : {}),
        ...(eventType ? { eventType } : {}),
        createdAt: event?.createdAt || new Date().toISOString(),
      };

      await saveDoc("events", id, newEvent);
      if (onSave) onSave();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!event) return;
    setLoading(true);
    try {
      await deleteDocument("events", event.id);
      if (onSave) onSave();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event ? "Edit Event" : "New Event"}>
      <div className="space-y-4">

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          autoFocus
        />

        <div className="flex justify-center gap-6">
          <TimeField label="Start" value={startTime} onChange={setStartTime} />
          <TimeField label="End" value={endTime} onChange={setEndTime} />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-nous-border/50">
          <span className="text-sm font-medium text-nous-secondary">Weekly Recurring?</span>
          <Toggle checked={isWeekly} onChange={setIsWeekly} />
        </div>

        {!isWeekly && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-nous-secondary mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={timeInputCls}
              style={{ colorScheme: "light dark", width: "100%" }}
            />
          </div>
        )}

        {!isWeekly && (
          <div className="flex items-center justify-between py-2 border-b border-nous-border/50">
            <span className="text-sm font-medium text-nous-secondary">Deadline Type</span>
            <div className="flex gap-1.5">
              {(["", "exam", "project"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEventType(t)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: eventType === t ? (t === "exam" ? "#ef4444" : t === "project" ? "#f97316" : "var(--nous-accent)") : "var(--nous-surface)",
                    color: eventType === t ? "#fff" : "var(--nous-secondary)",
                    border: `1px solid ${eventType === t ? "transparent" : "var(--nous-border)"}`,
                  }}
                >
                  {t === "" ? "None" : t === "exam" ? "Exam" : "Project"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-b border-nous-border/50">
          <span className="text-sm font-medium text-nous-secondary">Is Class?</span>
          <Toggle checked={isClass} onChange={setIsClass} />
        </div>

        {isClass && (
          <div className="space-y-4 pt-2 animate-fadeIn bg-nous-surface/30 p-4 rounded-xl">
            <Input
              label="Room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. B203"
            />
            <div>
              <label className="block text-sm font-medium text-nous-secondary mb-1.5">
                Class Type
              </label>
              <select
                className="w-full px-4 py-2.5 bg-nous-surface border border-nous-border rounded-xl text-nous-primary outline-none focus:border-nous-accent"
                value={classType}
                onChange={(e) => setClassType(e.target.value as ClassType)}
              >
                <option value="Teórica">Teórica</option>
                <option value="Teórico-Prática">Teórico-Prática</option>
                <option value="Prática">Prática</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-nous-secondary mb-2">Color</label>
          {/* Preset swatches */}
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {["#7c6bff","#5b8af5","#34d399","#facc15","#fb923c","#f87171","#e879f9"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-all shrink-0 relative"
                style={{
                  background: c,
                  boxShadow: color === c
                    ? `0 0 0 2px var(--nous-bg), 0 0 0 4px ${c}`
                    : "0 0 0 1px rgba(255,255,255,0.1)",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              >
                {color === c && (
                  <svg className="absolute inset-0 m-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c === "#ffffff" || c === "#a3e635" || c === "#facc15" ? "#000" : "#fff"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          {/* Hex input */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 0 1px rgba(255,255,255,0.1)` }} />
            <input
              type="text"
              value={color}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
              }}
              maxLength={7}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono outline-none transition-all"
              style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)", color: "var(--nous-primary)" }}
              placeholder="#7c6bff"
            />
          </div>
        </div>

        {/* Delete confirmation (inline, replaces native confirm()) */}
        {showDeleteConfirm && (
          <DeleteConfirm
            onConfirm={handleDeleteConfirm}
            onCancel={() => setShowDeleteConfirm(false)}
            loading={loading}
          />
        )}

        {!showDeleteConfirm && (
          <div className="pt-4 flex gap-3">
            {event && (
              <Button
                variant="danger"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} loading={loading}>
              Save
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
