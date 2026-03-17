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
      style={{ background: "var(--nous-bg)" }}
    >
      {/* Draw toolbar */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0 flex-wrap"
        style={{ background: "var(--nous-surface)", borderBottom: "1px solid var(--nous-border)" }}
      >
        {/* Tool toggle */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--nous-border)" }}
        >
          {(["pen", "eraser"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className="px-3 py-1.5 text-[12px] font-medium transition-all duration-150"
              style={{
                background:
                  tool === t ? "rgba(124,122,255,0.15)" : "transparent",
                color: tool === t ? "#7c7aff" : "var(--nous-secondary)",
              }}
            >
              {t === "pen" ? "Pen" : "Eraser"}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              className="w-6 h-6 rounded-full transition-all duration-150 hover:scale-110"
              style={{
                background: c,
                border:
                  color === c && tool === "pen"
                    ? "2px solid var(--nous-accent)"
                    : "2px solid var(--nous-border)",
                boxShadow:
                  color === c && tool === "pen"
                    ? "0 0 8px rgba(124,122,255,0.4)"
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
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
              style={{
                background:
                  size === s ? "rgba(124,122,255,0.12)" : "transparent",
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(s * 2, 18),
                  height: Math.min(s * 2, 18),
                  background: size === s ? "#7c7aff" : "var(--nous-tertiary)",
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={clear}
          className="px-4 py-2 text-[12px] font-medium rounded-lg transition-all duration-150"
          style={{
            color: "#f87171",
            border: "1px solid rgba(248,113,113,0.15)",
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
          className="px-4 py-2 text-[12px] font-semibold rounded-lg transition-all duration-150"
          style={{
            background: "var(--nous-accent)",
            color: "#fff",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.opacity = "0.85")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.opacity = "1")
          }
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-[12px] rounded-lg transition-all duration-150"
          style={{
            color: "var(--nous-secondary)",
            border: "1px solid var(--nous-border)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nous-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nous-secondary)")}
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
  // Read shared data from the store (populated by useAppData in the layout).
  // No local Firestore subscription needed.
  const { openNoteId, setOpenNoteId, user, allNotes } = useStore();
  const { getDocById, saveDoc } = useFirestore();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drawing, setDrawing] = useState<string | undefined>(undefined);
  const [showDraw, setShowDraw] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "">("");
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastNoteId = useRef<string | null>(null);

  const [backlinks, setBacklinks] = useState<Note[]>([]);

  const [wikilinkSearch, setWikilinkSearch] = useState<string | null>(null);
  const [wikilinkPos, setWikilinkPos] = useState({ top: 0, left: 0 });
  const wikilinkRangeRef = useRef<{
    node: Text;
    bracketOffset: number;
    cursorOffset: number;
  } | null>(null);

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
  );

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

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
    const newRange = document.createRange();
    newRange.selectNodeContents(pre);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
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

  // ── Empty state ──
  if (!openNoteId) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 ${className}`}
        style={{ background: "var(--nous-bg)" }}
      >
        <div className="flex flex-col items-center gap-4 opacity-60">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(124,122,255,0.06)" }}>
            <svg
              width="28"
              height="28"
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
          </div>
          <div className="text-center">
            <p className="text-[14px] font-medium mb-1" style={{ color: "var(--nous-secondary)" }}>
              Select a note
            </p>
            <p className="text-[12px]" style={{ color: "var(--nous-tertiary)" }}>
              Choose a page from the sidebar to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Toolbar button helper ──
  const ToolbarBtn = ({ onClick, active, children, title: btnTitle }: {
    onClick: () => void; active?: boolean; children: React.ReactNode; title?: string;
  }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
      style={{
        color: active ? "var(--nous-primary)" : "var(--nous-secondary)",
        background: active ? "rgba(124,122,255,0.12)" : "transparent",
      }}
      title={btnTitle}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--nous-primary)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? "var(--nous-primary)" : "var(--nous-secondary)"; e.currentTarget.style.background = active ? "rgba(124,122,255,0.12)" : "transparent"; }}
    >
      {children}
    </button>
  );

  const ToolbarSep = () => (
    <div className="w-px h-5 mx-0.5" style={{ background: "rgba(255,255,255,0.06)" }} />
  );

  return (
    <div
      className={`flex flex-col h-full relative ${className}`}
      style={{ background: "var(--nous-bg)" }}
    >
      {/* Drawing overlay */}
      {showDraw && (
        <DrawCanvas
          initialDataUrl={drawing}
          onSave={handleDrawingSave}
          onClose={() => setShowDraw(false)}
        />
      )}

      {/* Toolbar — Notion-style floating bar */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-0.5">
          {/* Text formatting */}
          <ToolbarBtn onClick={() => execCmd("bold")} title="Bold">
            <span className="text-[13px] font-bold">B</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("italic")} title="Italic">
            <span className="text-[13px] italic">I</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("underline")} title="Underline">
            <span className="text-[13px] underline">U</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("strikeThrough")} title="Strikethrough">
            <span className="text-[13px] line-through">S</span>
          </ToolbarBtn>

          <ToolbarSep />

          {/* Headings */}
          <ToolbarBtn onClick={() => execCmd("formatBlock", "h1")} title="Heading 1">
            <span className="text-[11px] font-bold">H1</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("formatBlock", "h2")} title="Heading 2">
            <span className="text-[11px] font-bold">H2</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("formatBlock", "h3")} title="Heading 3">
            <span className="text-[11px] font-bold">H3</span>
          </ToolbarBtn>

          <ToolbarSep />

          {/* Lists */}
          <ToolbarBtn onClick={() => execCmd("insertUnorderedList")} title="Bullet list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd("insertOrderedList")} title="Numbered list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="20" y2="6" />
              <line x1="10" y1="12" x2="20" y2="12" />
              <line x1="10" y1="18" x2="20" y2="18" />
              <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="600">1</text>
              <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="600">2</text>
              <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="600">3</text>
            </svg>
          </ToolbarBtn>

          {/* Quote */}
          <ToolbarBtn onClick={() => execCmd("formatBlock", "blockquote")} title="Quote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
            </svg>
          </ToolbarBtn>

          <ToolbarSep />

          {/* Code block */}
          <ToolbarBtn onClick={insertCodeBlock} title="Code block">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarBtn>

          {/* Draw button */}
          <ToolbarBtn onClick={() => setShowDraw(true)} title="Drawing canvas">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </ToolbarBtn>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          {status === "saving" && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f59e0b" }} />
              <span className="text-[11px]" style={{ color: "var(--nous-secondary)" }}>Saving</span>
            </div>
          )}
          {status === "saved" && (
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30c48d" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[11px]" style={{ color: "#30c48d" }}>Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor area — Notion-style centered page ── */}
      <div
        className="flex-1 overflow-y-auto relative"
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
                className="absolute z-50 rounded-xl py-1.5 shadow-2xl"
                style={{
                  top: wikilinkPos.top,
                  left: wikilinkPos.left,
                  background: "#1a1a24",
                  border: "1px solid rgba(124,122,255,0.2)",
                  minWidth: 240,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                }}
              >
                <div
                  className="px-3 py-2 text-[11px] font-medium"
                  style={{ color: "var(--nous-secondary)" }}
                >
                  Link to page
                </div>
                {suggestions.map((n) => (
                  <button
                    key={n.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertWikilink(n);
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-[13px] transition-all duration-100"
                    style={{ color: "var(--nous-primary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(124,122,255,0.10)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c7aff"
                      strokeWidth="1.5"
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

        {/* Notion-style page content with generous padding */}
        <div className="max-w-[720px] mx-auto px-6 md:px-12 py-10 md:py-16">
          {/* Title */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleTitleInput}
            className="outline-none mb-2 leading-tight"
            style={{
              fontSize: "40px",
              fontWeight: 700,
              color: "var(--nous-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              minHeight: "1.15em",
            }}
            data-placeholder="Untitled"
          />

          {/* Metadata row — Notion-style properties */}
          {note && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 mt-3 pb-6"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {/* Date */}
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>Created</span>
                <span className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>
                  {format(new Date(note.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {/* Updated */}
              {note.updatedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>Updated</span>
                  <span className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>
                    {format(new Date(note.updatedAt), "MMM d, h:mm a")}
                  </span>
                </div>
              )}
              {/* Links */}
              {note.linkedNoteIds?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: "var(--nous-secondary)" }}>Links</span>
                  <span className="text-[12px] font-medium" style={{ color: "#7c7aff" }}>
                    {note.linkedNoteIds.length}
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
            data-placeholder="Start writing... Use [[Note Title]] to link pages"
          />

          {/* Drawing preview */}
          {drawing && !showDraw && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nous-secondary)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="var(--nous-secondary)"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span className="text-[12px] font-medium" style={{ color: "var(--nous-secondary)" }}>Drawing</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDraw(true)}
                    className="text-[12px] font-medium transition-colors"
                    style={{ color: "#7c7aff" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#a5a3ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7aff")}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setDrawing(undefined); saveNote(title, content, undefined); }}
                    className="text-[12px] transition-colors"
                    style={{ color: "var(--nous-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nous-secondary)")}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={drawing}
                alt="Note drawing"
                className="w-full rounded-xl cursor-pointer transition-all duration-200 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  maxHeight: 400,
                  objectFit: "contain",
                }}
                onClick={() => setShowDraw(true)}
              />
            </div>
          )}

          {/* Backlinks — Notion-style linked mentions */}
          {backlinks.length > 0 && (
            <div className="mt-16 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nous-secondary)" strokeWidth="1.8">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
                <span className="text-[13px] font-semibold" style={{ color: "var(--nous-secondary)" }}>
                  {backlinks.length} Backlink{backlinks.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1.5">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    onClick={() => setOpenNoteId(bl.id)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      color: "#c8c8d8",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(124,122,255,0.06)";
                      e.currentTarget.style.borderColor = "rgba(124,122,255,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="font-medium">{bl.title || "Untitled"}</span>
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
