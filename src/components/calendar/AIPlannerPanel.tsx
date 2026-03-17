import React, { useState, useRef } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { CalendarEvent, AITask } from "@/types";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

interface AIPlannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyEvents: CalendarEvent[];
  userId: string;
}

export const AIPlannerPanel = ({ isOpen, onClose, weeklyEvents, userId }: AIPlannerPanelProps) => {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdf, setPdf] = useState<{ name: string; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useStore();
  const { saveDoc } = useFirestore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are supported"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("PDF must be under 20 MB"); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]; // strip data:...;base64,
      setPdf({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!goal.trim() && !pdf) { toast.error("Enter a goal or attach a PDF"); return; }
    if (!settings.geminiApiKey) { toast.error("Gemini API Key missing — set it in Settings."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, goal, weeklyEvents,
          geminiApiKey: settings.geminiApiKey,
          pdfBase64: pdf?.base64,
          pdfName: pdf?.name,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Failed to generate plan");
      const tasks: any[] = body;
      if (!Array.isArray(tasks)) throw new Error("Unexpected response — try rephrasing your goal");

      await Promise.all(tasks.map(async (task: any) => {
        const id = uuidv4();
        const newTask: AITask = { id, userId, date: task.date, task: task.task, duration: task.duration, done: false, createdAt: new Date().toISOString() };
        return saveDoc("ai_tasks", id, newTask);
      }));

      toast.success(`Generated ${tasks.length} tasks!`);
      setGoal(""); setPdf(null);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[340px] h-full flex flex-col animate-slideUp"
        style={{ background: 'var(--nous-surface)', borderLeft: '1px solid var(--nous-border)', boxShadow: '-24px 0 80px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-10 pb-6"
          style={{ borderBottom: '1px solid var(--nous-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,122,255,0.12)', border: '1px solid rgba(124,122,255,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#7c7aff">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--nous-primary)', letterSpacing: '-0.01em' }}>Plan with AI</h2>
              <p className="text-[10px]" style={{ color: 'var(--nous-secondary)' }}>Powered by Gemini</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--nous-secondary)', background: 'rgba(255,255,255,0.03)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--nous-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--nous-secondary)')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'none' }}>
          <p className="text-[12px] leading-relaxed mb-5" style={{ color: 'var(--nous-secondary)' }}>
            Describe your goal or attach a PDF (syllabus, notes, exam sheet) and AI will build a study schedule around your classes.
          </p>

          {/* PDF Upload */}
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />

          {pdf ? (
            <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
              style={{ background: 'rgba(124,122,255,0.06)', border: '1px solid rgba(124,122,255,0.15)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,122,255,0.12)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--nous-primary)' }}>{pdf.name}</p>
                <p className="text-[10px]" style={{ color: '#7c7aff' }}>Ready to analyse</p>
              </div>
              <button onClick={() => { setPdf(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="w-5 h-5 flex items-center justify-center rounded-full transition-colors shrink-0"
                style={{ color: 'var(--nous-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--nous-error)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--nous-secondary)')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-3 rounded-xl mb-4 transition-colors"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,122,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,122,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nous-secondary)" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-[12px] font-medium" style={{ color: 'var(--nous-secondary)' }}>Attach PDF</p>
                <p className="text-[10px]" style={{ color: 'var(--nous-tertiary)' }}>Syllabus, notes, exam sheet · max 20 MB</p>
              </div>
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }}/>
            <span className="text-[10px]" style={{ color: 'var(--nous-tertiary)' }}>and / or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }}/>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["Exam on Friday", "Project due next week", "Revise chapters 1–5"].map(ex => (
              <button key={ex} onClick={() => setGoal(ex)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
                style={{ background: 'rgba(124,122,255,0.06)', border: '1px solid rgba(124,122,255,0.12)', color: '#7c7aff' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,122,255,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,122,255,0.06)')}>
                {ex}
              </button>
            ))}
          </div>

          <textarea
            className="w-full h-28 px-4 py-3 rounded-xl text-[13px] outline-none resize-none transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--nous-primary)', lineHeight: 1.6 }}
            placeholder="e.g. Exam on March 15 covering chapters 1–5..."
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onFocus={e => (e.currentTarget.style.border = '1px solid rgba(124,122,255,0.35)')}
            onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)')}
          />

          {weeklyEvents.length > 0 && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-[9px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: 'var(--nous-tertiary)' }}>
                Working around {weeklyEvents.length} class{weeklyEvents.length !== 1 ? "es" : ""}
              </p>
              {weeklyEvents.slice(0, 3).map(e => (
                <div key={e.id} className="flex items-center gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color || '#7c7aff' }} />
                  <span className="text-[11px] truncate" style={{ color: 'var(--nous-secondary)' }}>{e.title}</span>
                </div>
              ))}
              {weeklyEvents.length > 3 && <p className="text-[10px] mt-1" style={{ color: 'var(--nous-tertiary)' }}>+{weeklyEvents.length - 3} more</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-32 pt-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={handleSubmit}
            disabled={loading || (!goal.trim() && !pdf)}
            className="w-full h-11 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: loading || (!goal.trim() && !pdf) ? 'rgba(124,122,255,0.1)' : 'linear-gradient(135deg, #7c7aff, #5e5ce6)',
              color: loading || (!goal.trim() && !pdf) ? 'var(--nous-secondary)' : '#fff',
              boxShadow: loading || (!goal.trim() && !pdf) ? 'none' : '0 4px 20px rgba(124,122,255,0.35)',
              cursor: loading || (!goal.trim() && !pdf) ? 'not-allowed' : 'pointer',
            }}>
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                {pdf ? "Analysing PDF…" : "Generating…"}
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                {pdf && !goal.trim() ? "Analyse PDF & Plan" : "Generate Plan"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
