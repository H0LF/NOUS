"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Note } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { format } from "date-fns";

function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}

interface NoteEditorProps {
  className?: string;
}

// ── Drawing canvas ────────────────────────────────────────────────────────────
const DRAW_COLORS = [
  "#e8e8f0",
  "#7c7aff",
  "#30c48d",
  "#e879f9",
  "#f87171",
  "#60a5fa",
  "#000000",
];
const DRAW_SIZES = [2, 4, 8, 16];

interface DrawCanvasProps {
  initialDataUrl?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

const DrawCanvas = ({ initialDataUrl, onSave, onClose }: DrawCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState("#e8e8f0");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = "#0f0f15";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#0f0f15" : color;
    ctx.lineWidth = tool === "eraser" ? size * 4 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0f0f15";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: "#0f0f15" }}
    >
      {/* Draw toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Tool toggle */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(["pen", "eraser"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className="px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                background:
                  tool === t ? "rgba(124,122,255,0.2)" : "transparent",
                color: tool === t ? "#7c7aff" : "#6a6a7e",
              }}
            >
              {t === "pen" ? "Pen" : "Eraser"}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                border:
                  color === c && tool === "pen"
                    ? "2px solid #fff"
                    : "2px solid transparent",
                boxShadow:
                  color === c && tool === "pen"
                    ? "0 0 6px rgba(255,255,255,0.4)"
                    : "none",
              }}
            />
          ))}
        </div>

        {/* Sizes */}
        <div className="flex items-center gap-1">
          {DRAW_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{
                background:
                  size === s ? "rgba(124,122,255,0.15)" : "transparent",
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(s * 2, 18),
                  height: Math.min(s * 2, 18),
                  background: size === s ? "#7c7aff" : "#6a6a7e",
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={clear}
          className="px-3 py-1.5 text-[11px] rounded-lg transition-colors"
          style={{
            color: "#f87171",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(248,113,113,0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          Clear
        </button>
        <button
          onClick={save}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors"
          style={{
            background: "rgba(124,122,255,0.2)",
            color: "#7c7aff",
            border: "1px solid rgba(124,122,255,0.3)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(124,122,255,0.3)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(124,122,255,0.2)")
          }
        >
          Save Drawing
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] rounded-lg transition-colors"
          style={{
            color: "#6a6a7e",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a7e")}
        >
          Cancel
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  );
};

// ── Main editor ───────────────────────────────────────────────────────────────
// Extract note IDs from [[wikilink]] patterns in the editor HTML
const extractLinkedNoteIds = (
  html: string,
  allNotes: Note[],
  currentId: string,
): string[] => {
  const matches = [...html.matchAll(/\[\[([^\]]+)\]\]/g)];
  const ids: string[] = [];
  for (const m of matches) {
    const t = m[1].trim().toLowerCase();
    const found = allNotes.find(
      (n) => n.title.toLowerCase() === t && n.id !== currentId,
    );
    if (found) ids.push(found.id);
  }
  return [...new Set(ids)];
};

export const NoteEditor = ({ className = "" }: NoteEditorProps) => {
  const { openNoteId, setOpenNoteId, user } = useStore();
  const { getDocById, saveDoc, subscribeCollection } = useFirestore();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drawing, setDrawing] = useState<string | undefined>(undefined);
  const [showDraw, setShowDraw] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "">("");
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastNoteId = useRef<string | null>(null);

  // All notes — for wikilink autocomplete and backlinks
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [backlinks, setBacklinks] = useState<Note[]>([]);

  // Wikilink dropdown state
  const [wikilinkSearch, setWikilinkSearch] = useState<string | null>(null);
  const [wikilinkPos, setWikilinkPos] = useState({ top: 0, left: 0 });
  const wikilinkRangeRef = useRef<{
    node: Text;
    bracketOffset: number;
    cursorOffset: number;
  } | null>(null);

  // Subscribe to all notes for wikilink autocomplete + backlinks
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCollection<Note>("notes", setAllNotes);
    return () => unsub();
  }, [user, subscribeCollection]);

  // Update backlinks when active note or allNotes changes
  useEffect(() => {
    if (!openNoteId) {
      setBacklinks([]);
      return;
    }
    setBacklinks(
      allNotes.filter(
        (n) => n.id !== openNoteId && n.linkedNoteIds?.includes(openNoteId),
      ),
    );
  }, [allNotes, openNoteId]);

  useEffect(() => {
    if (!user || !openNoteId) {
      setNote(null);
      return;
    }
    if (lastNoteId.current === openNoteId) return;
    lastNoteId.current = openNoteId;
    setWikilinkSearch(null);
    const load = async () => {
      const data = (await getDocById("notes", openNoteId)) as Note;
      if (data) {
        setNote(data);
        setTitle(data.title);
        setContent(data.content);
        setDrawing(data.drawing);
        if (titleRef.current) titleRef.current.innerText = data.title;
        if (contentRef.current) contentRef.current.innerHTML = data.content;
      }
    };
    load();
  }, [openNoteId, user, getDocById]);

  const saveNote = async (
    newTitle: string,
    newContent: string,
    newDrawing?: string,
    linkedIds?: string[],
  ) => {
    if (!openNoteId || !user) return;
    setStatus("saving");
    const update: Partial<Note> = {
      title: newTitle,
      content: newContent,
      updatedAt: new Date().toISOString(),
    };
    if (newDrawing !== undefined) update.drawing = newDrawing;
    if (linkedIds !== undefined) update.linkedNoteIds = linkedIds;
    await saveDoc("notes", openNoteId, update);
    setStatus("saved");
    setTimeout(() => setStatus(""), 2000);
  };

  // ── Wikilink helpers ──────────────────────────────────────────────────────
  const detectWikilink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !contentRef.current) {
      setWikilinkSearch(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const container = range.startContainer;
    if (container.nodeType !== Node.TEXT_NODE) {
      setWikilinkSearch(null);
      return;
    }
    const text = container.textContent?.slice(0, range.startOffset) ?? "";
    const lastBracket = text.lastIndexOf("[[");
    if (lastBracket === -1 || text.slice(lastBracket).includes("]")) {
      setWikilinkSearch(null);
      return;
    }
    const search = text.slice(lastBracket + 2);
    const rect = range.getBoundingClientRect();
    const cRect = contentRef.current.getBoundingClientRect();
    wikilinkRangeRef.current = {
      node: container as Text,
      bracketOffset: lastBracket,
      cursorOffset: range.startOffset,
    };
    setWikilinkPos({
      top: rect.bottom - cRect.top + 4,
      left: Math.max(0, rect.left - cRect.left),
    });
    setWikilinkSearch(search);
  }, []);

  const insertWikilink = useCallback(
    (targetNote: Note) => {
      const info = wikilinkRangeRef.current;
      if (!info || !contentRef.current) return;
      const range = document.createRange();
      range.setStart(info.node, info.bracketOffset);
      range.setEnd(info.node, info.cursorOffset);
      range.deleteContents();
      const textNode = document.createTextNode(`[[${targetNote.title}]] `);
      range.insertNode(textNode);
      window.getSelection()?.collapse(textNode, textNode.length);
      setWikilinkSearch(null);
      wikilinkRangeRef.current = null;
      const newContent = contentRef.current.innerHTML;
      const ids = extractLinkedNoteIds(newContent, allNotes, openNoteId ?? "");
      setContent(newContent);
      debouncedSave(title, newContent, drawing, ids);
    },
    [allNotes, openNoteId, title, drawing],
  ); // debouncedSave added below

  const debouncedSave = useDebounce(saveNote, 800);

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const t = e.currentTarget.innerText;
    setTitle(t);
    debouncedSave(t, content, drawing);
  };

  const handleContentInput = (e: React.FormEvent<HTMLDivElement>) => {
    const c = e.currentTarget.innerHTML;
    setContent(c);
    detectWikilink();
    const ids = extractLinkedNoteIds(c, allNotes, openNoteId ?? "");
    debouncedSave(title, c, drawing, ids);
  };

  // Delete whole code block when empty + Backspace/Delete, or Escape
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Close wikilink dropdown on Escape
    if (e.key === "Escape" && wikilinkSearch !== null) {
      e.preventDefault();
      setWikilinkSearch(null);
      return;
    }
    if (e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Escape")
      return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== contentRef.current) {
      if (
        node instanceof HTMLElement &&
        node.classList.contains("note-code-block")
      ) {
        const isEmpty = node.textContent?.trim() === "";
        if (isEmpty || e.key === "Escape") {
          e.preventDefault();
          node.remove();
          const c = contentRef.current?.innerHTML ?? "";
          setContent(c);
          debouncedSave(title, c, drawing);
        }
        return;
      }
      node = node.parentNode;
    }
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (contentRef.current) {
      const c = contentRef.current.innerHTML;
      setContent(c);
      debouncedSave(title, c, drawing);
    }
  };

  // Insert a code block at cursor position
  const insertCodeBlock = () => {
    contentRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const pre = document.createElement("pre");
    pre.className = "note-code-block";
    pre.contentEditable = "true";
    pre.spellcheck = false;
    pre.textContent = sel.toString() || "// code here";
    range.deleteContents();
    range.insertNode(pre);
    // Place cursor inside
    const newRange = document.createRange();
    newRange.selectNodeContents(pre);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
    // Trigger save
    setTimeout(() => {
      if (contentRef.current) {
        const c = contentRef.current.innerHTML;
        setContent(c);
        debouncedSave(title, c, drawing);
      }
    }, 50);
  };

  const handleDrawingSave = (dataUrl: string) => {
    setDrawing(dataUrl);
    setShowDraw(false);
    saveNote(title, content, dataUrl);
  };

  if (!openNoteId) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 ${className}`}
        style={{ background: "#0f0f15" }}
      >
        <div className="flex flex-col items-center gap-3 opacity-40">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7c7aff"
            strokeWidth="1.2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p className="text-[12px] font-medium" style={{ color: "#4a4a5e" }}>
            Select a note to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full relative ${className}`}
      style={{ background: "#0f0f15" }}
    >
      {/* Drawing overlay */}
      {showDraw && (
        <DrawCanvas
          initialDataUrl={drawing}
          onSave={handleDrawingSave}
          onClose={() => setShowDraw(false)}
        />
      )}

      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-0.5">
          {[
            { cmd: "bold", label: "B", style: "font-bold" },
            { cmd: "italic", label: "I", style: "italic" },
            { cmd: "underline", label: "U", style: "underline" },
          ].map(({ cmd, label, style }) => (
            <button
              key={cmd}
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd(cmd);
              }}
              className={`w-7 h-7 flex items-center justify-center rounded text-[12px] transition-colors ${style}`}
              style={{ color: "#6a6a7e" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a7e")}
            >
              {label}
            </button>
          ))}
          <div
            className="w-px h-4 mx-1"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          {[
            { cmd: "formatBlock", val: "h2", label: "H2" },
            { cmd: "formatBlock", val: "h3", label: "H3" },
          ].map(({ cmd, val, label }) => (
            <button
              key={val}
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd(cmd, val);
              }}
              className="px-2 h-7 flex items-center justify-center rounded text-[11px] font-bold transition-colors"
              style={{ color: "#6a6a7e" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a7e")}
            >
              {label}
            </button>
          ))}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd("insertUnorderedList");
            }}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: "#6a6a7e" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a7e")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>

          {/* Code block button */}
          <div
            className="w-px h-4 mx-1"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              insertCodeBlock();
            }}
            className="px-2 h-7 flex items-center justify-center rounded text-[11px] font-mono transition-colors"
            style={{ color: "#6a6a7e" }}
            title="Insert code block"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#30c48d")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a7e")}
          >
            {"</>"}
          </button>

          {/* Draw button */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowDraw(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: "#6a6a7e" }}
            title="Open drawing canvas"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e879f9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a7e")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {status === "saving" && (
            <span className="text-[10px]" style={{ color: "#4a4a5e" }}>
              Saving…
            </span>
          )}
          {status === "saved" && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "#30c48d" }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          )}
          {note?.updatedAt && (
            <span className="text-[10px]" style={{ color: "#2e2e40" }}>
              {format(new Date(note.updatedAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5 relative"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Wikilink autocomplete dropdown */}
        {wikilinkSearch !== null &&
          (() => {
            const suggestions = allNotes
              .filter(
                (n) =>
                  n.id !== openNoteId &&
                  (wikilinkSearch === "" ||
                    n.title
                      .toLowerCase()
                      .includes(wikilinkSearch.toLowerCase())),
              )
              .slice(0, 7);
            if (suggestions.length === 0) return null;
            return (
              <div
                className="absolute z-50 rounded-xl py-1 shadow-2xl"
                style={{
                  top: wikilinkPos.top,
                  left: wikilinkPos.left,
                  background: "#1e1e28",
                  border: "1px solid rgba(124,122,255,0.25)",
                  minWidth: 220,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
                }}
              >
                <div
                  className="px-3 py-1.5 text-[9px] font-semibold tracking-widest uppercase"
                  style={{ color: "#4a4a5e" }}
                >
                  Link note
                </div>
                {suggestions.map((n) => (
                  <button
                    key={n.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertWikilink(n);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
                    style={{ color: "#e8e8f0" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(124,122,255,0.12)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c7aff"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {n.title || "Untitled"}
                  </button>
                ))}
              </div>
            );
          })()}
        <div className="max-w-[860px] mx-auto">
          {/* Title */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleTitleInput}
            className="outline-none mb-6 leading-tight"
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#e8e8f0",
              letterSpacing: "-0.02em",
              minHeight: "1.2em",
            }}
            data-placeholder="Untitled"
          />

          {/* Metadata */}
          {note && (
            <div
              className="flex items-center gap-4 mb-8 pb-6"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-1.5">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3a3a50"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="text-[11px]" style={{ color: "#3a3a50" }}>
                  {format(new Date(note.createdAt), "MMMM d, yyyy")}
                </span>
              </div>
              {note.linkedNoteIds?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c7aff"
                    strokeWidth="2"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span className="text-[11px]" style={{ color: "#7c7aff" }}>
                    {note.linkedNoteIds.length} linked note
                    {note.linkedNoteIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentInput}
            onKeyDown={handleContentKeyDown}
            className="outline-none obsidian-content"
            data-placeholder="Start writing... Use [[Note Title]] to link notes"
          />

          {/* Drawing preview */}
          {drawing && !showDraw && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "#4a4a5e" }}
                >
                  Drawing
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDraw(true)}
                    className="text-[10px] transition-colors"
                    style={{ color: "#7c7aff" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#a5a3ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#7c7aff")
                    }
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDrawing(undefined);
                      saveNote(title, content, undefined);
                    }}
                    className="text-[10px] transition-colors"
                    style={{ color: "#f87171" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#fca5a5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#f87171")
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={drawing}
                alt="Note drawing"
                className="w-full rounded-xl"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  maxHeight: 400,
                  objectFit: "contain",
                }}
                onClick={() => setShowDraw(true)}
              />
            </div>
          )}

          {/* Backlinks */}
          {backlinks.length > 0 && (
            <div
              className="mt-12 pt-6"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4a4a5e"
                  strokeWidth="2"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: "#4a4a5e" }}
                >
                  Backlinks ({backlinks.length})
                </span>
              </div>
              <div className="space-y-1">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    onClick={() => setOpenNoteId(bl.id)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors"
                    style={{
                      background: "rgba(124,122,255,0.06)",
                      color: "#a5a3ff",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(124,122,255,0.12)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(124,122,255,0.06)")
                    }
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {bl.title || "Untitled"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
