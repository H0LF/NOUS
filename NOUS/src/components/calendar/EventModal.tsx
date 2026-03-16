import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { CalendarEvent } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { useFirestore } from "@/hooks/useFirestore";
import toast from "react-hot-toast";

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
  
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#7c6bff");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isWeekly, setIsWeekly] = useState(false);
  const [isClass, setIsClass] = useState(false);
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState<"Teórica" | "Teórico-Prática" | "Prática">("Teórica");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setColor(event.color);
        setStartTime(event.startTime);
        setEndTime(event.endTime);
        setIsWeekly(event.isWeekly);
        setIsClass(event.isClass);
        setRoom(event.room || "");
        setClassType(event.classType || "Teórica");
        setDate(event.date);
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
      }
    }
  }, [isOpen, event, defaultTime, defaultDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const finalStartTime = startTime || "09:00";
    const finalEndTime = endTime || "10:00";
    const today = new Date();
    const finalDate = date || `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

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
        dayOfWeek: isWeekly ? (defaultDay !== undefined ? defaultDay : dayOfWeek) : dayOfWeek,
        date: isWeekly ? "" : finalDate,
        isWeekly,
        isClass,
        ...(isClass ? { room, classType } : {}),
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

  const handleDelete = async () => {
    if (!event) return;
    if (confirm("Are you sure you want to delete this event?")) {
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
    }
  };

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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-nous-secondary mb-1.5">Start</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className={timeInputCls} style={{ colorScheme: "dark" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-nous-secondary mb-1.5">End</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className={timeInputCls} style={{ colorScheme: "dark" }} />
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-nous-border/50">
           <span className="text-sm font-medium text-nous-secondary">Weekly Recurring?</span>
           <Toggle checked={isWeekly} onChange={setIsWeekly} />
        </div>

         {!isWeekly && (
           <div>
             <label className="block text-xs font-semibold uppercase tracking-widest text-nous-secondary mb-1.5">Date</label>
             <input type="date" value={date} onChange={e => setDate(e.target.value)}
               className={timeInputCls} style={{ colorScheme: "dark", width: "100%" }} />
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
              <label className="block text-sm font-medium text-nous-secondary mb-1.5">Class Type</label>
              <select 
                className="w-full px-4 py-2.5 bg-nous-surface border border-nous-border rounded-xl text-nous-primary outline-none focus:border-nous-accent"
                value={classType}
                onChange={(e) => setClassType(e.target.value as any)}
              >
                <option value="Teórica">Teórica</option>
                <option value="Teórico-Prática">Teórico-Prática</option>
                <option value="Prática">Prática</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-nous-secondary mb-1.5">Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-full cursor-pointer border-none p-0 overflow-hidden"
            />
            <span className="text-xs text-nous-secondary uppercase">{color}</span>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          {event && (
            <Button variant="danger" type="button" onClick={handleDelete} disabled={loading} className="mr-auto">
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
      </div>
    </Modal>
  );
};
