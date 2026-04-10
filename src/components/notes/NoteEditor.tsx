"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Note } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { format } from "date-fns";

/**
 * useDebounce — returns a stable debounced wrapper that always calls the
 * latest version of `callback`. The returned function's identity only
 * changes when `delay` changes, preventing dependency-chain instability.
 */
function useDebounce<T extends (...args: never[]) => void>(callback: T, delay: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}

interface NoteEditorProps {
  className?: string;
}

// ── Drawing canvas ────────────────────────────────────────────────────────────
const DRAW_COLORS_BASE = ["#e8e8f0", "#30c48d", "#e879f9", "#f87171", "#60a5fa", "#000000"];
const DRAW_SIZES = [2, 4, 8, 16];

interface DrawCanvasProps {
  initialDataUrl?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

type DrawTemplate = "blank" | "lined" | "grid" | "dotted";

const DrawCanvas = ({ initialDataUrl, onSave, onClose }: DrawCanvasProps) => {
  const accentColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--nous-accent").trim() || "#2d8b8b"
      : "#2d8b8b";
  const DRAW_COLORS = [accentColor, ...DRAW_COLORS_BASE];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number; pressure: number } | null>(null);
  const [color, setColor] = useState("#e8e8f0");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [template, setTemplate] = useState<DrawTemplate>("blank");
  const [showTemplates, setShowTemplates] = useState(false);
  const BG_COLOR = "#0f0f15";

  const drawTemplate = useCallback((ctx: CanvasRenderingContext2D, t: DrawTemplate, W: number, H: number) => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    if (t === "blank") return;
    const step = 28;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    if (t === "lined") {
      for (let y = step; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    } else if (t === "grid") {
      for (let x = step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else if (t === "dotted") {
      for (let x = step; x < W; x += step) {
        for (let y = step; y < H; y += step) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill();
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawTemplate(ctx, template, canvas.width, canvas.height);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialDataUrl;
    }
  }, [initialDataUrl, template, drawTemplate]);

  const getPointerPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const isPalmRejected = (e: React.PointerEvent) => {
    // Reject large-area touch events (palm) — only allow stylus or single-touch
    if (e.pointerType === "pen") return false;
    if (e.pointerType === "mouse") return false;
    // Touch: reject if contact area is large (likely palm)
    const area = e as unknown as { width?: number; height?: number };
    if ((area.width ?? 1) > 30 || (area.height ?? 1) > 30) return true;
    return false;
  };

  const startDraw = (e: React.PointerEvent) => {
    if (isPalmRejected(e)) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    lastPos.current = getPointerPos(e);
  };

  const draw = (e: React.PointerEvent) => {
    if (isPalmRejected(e)) return;
    e.preventDefault();
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPointerPos(e);
    const pressureScale = pos.pressure;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? BG_COLOR : color;
    // Pressure affects line width
    ctx.lineWidth = tool === "eraser" ? size * 4 : size * (0.5 + pressureScale * 1.5);
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
    drawTemplate(ctx, template, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL("image/png"));
  };

  const TEMPLATES: { id: DrawTemplate; label: string }[] = [
    { id: "blank",  label: "Blank" },
    { id: "lined",  label: "Lined" },
    { id: "grid",   label: "Grid" },
    { id: "dotted", label: "Dotted" },
  ];

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
                background: tool === t ? "rgba(var(--nous-accent-rgb),0.15)" : "transparent",
                color: tool === t ? "var(--nous-accent)" : "var(--nous-secondary)",
              }}
            >
              {t === "pen" ? "Pen" : "Eraser"}
            </button>
          ))}
        </div>

        {/* Template picker */}
        <div className="relative">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--nous-border)",
              color: "var(--nous-secondary)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            {TEMPLATES.find(t => t.id === template)?.label}
          </button>
          {showTemplates && (
            <div
              className="absolute top-full mt-1 left-0 z-50 rounded-xl py-1.5 shadow-2xl"
              style={{ background: "#1a1a24", border: "1px solid rgba(var(--nous-accent-rgb),0.2)", minWidth: 120 }}
            >
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTemplate(t.id); setShowTemplates(false); }}
                  className="w-full text-left px-3 py-2 text-[12px] transition-colors"
                  style={{ color: template === t.id ? "var(--nous-accent)" : "var(--nous-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(var(--nous-accent-rgb),0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className="w-6 h-6 rounded-full transition-all duration-150 hover:scale-110"
              style={{
                background: c,
                border: color === c && tool === "pen" ? "2px solid var(--nous-accent)" : "2px solid var(--nous-border)",
                boxShadow: color === c && tool === "pen" ? "0 0 8px rgba(var(--nous-accent-rgb),0.4)" : "none",
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
              style={{ background: size === s ? "rgba(var(--nous-accent-rgb),0.12)" : "transparent" }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(s * 2, 18),
                  height: Math.min(s * 2, 18),
                  background: size === s ? "var(--nous-accent)" : "var(--nous-tertiary)",
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={clear}
          className="px-4 py-2 text-[12px] font-medium rounded-lg transition-all duration-150"
          style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Clear
        </button>
        <button
          onClick={save}
          className="px-4 py-2 text-[12px] font-semibold rounded-lg transition-all duration-150"
          style={{ background: "var(--nous-accent)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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

      {/* Canvas — uses PointerEvents for pressure sensitivity + palm rejection */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        onPointerCancel={endDraw}
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
  const { saveDoc } = useFirestore();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drawing, setDrawing] = useState<string | undefined>(undefined);
  const [showDraw, setShowDraw] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "">("");
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [backlinks, setBacklinks] = useState<Note[]>([]);

  const [wikilinkSearch, setWikilinkSearch] = useState<string | null>(null);
  const [wikilinkPos, setWikilinkPos] = useState({ top: 0, left: 0 });
  const wikilinkRangeRef = useRef<{
    node: Text;
    bracketOffset: number;
    cursorOffset: number;
  } | null>(null);

  // Slash-command menu
  const [slashSearch, setSlashSearch] = useState<string | null>(null);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const slashRangeRef = useRef<{ node: Text; slashOffset: number; cursorOffset: number } | null>(null);

  const SLASH_COMMANDS = [
    { id: "h1",         label: "Heading 1",    icon: "H1", action: () => execCmd("formatBlock", "h1") },
    { id: "h2",         label: "Heading 2",    icon: "H2", action: () => execCmd("formatBlock", "h2") },
    { id: "h3",         label: "Heading 3",    icon: "H3", action: () => execCmd("formatBlock", "h3") },
    { id: "blockquote", label: "Quote",         icon: "\"", action: () => execCmd("formatBlock", "blockquote") },
    { id: "code",       label: "Code block",   icon: "</>", action: () => insertCodeBlock() },
    { id: "ul",         label: "Bullet list",  icon: "•",  action: () => execCmd("insertUnorderedList") },
    { id: "ol",         label: "Numbered list",icon: "1.", action: () => execCmd("insertOrderedList") },
    { id: "hr",         label: "Divider",      icon: "—",  action: () => execCmd("insertHorizontalRule") },
    { id: "bold",       label: "Bold",         icon: "B",  action: () => execCmd("bold") },
  ];

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

  // Load note data from the shared store instead of a separate Firestore
  // getDocById call. The allNotes array is kept up-to-date by the real-time
  // listener in useAppData, so this eliminates 1 Firestore read per note switch.
  useEffect(() => {
    if (!user || !openNoteId) {
      setNote(null);
      return;
    }
    if (note?.id === openNoteId) return;
    setWikilinkSearch(null);
    const data = allNotes.find((n) => n.id === openNoteId) ?? null;
    if (data) {
      setNote(data);
      setTitle(data.title);
      setContent(data.content);
      setDrawing(data.drawing);
      if (titleRef.current) titleRef.current.innerText = data.title;
      if (contentRef.current) contentRef.current.innerHTML = data.content;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId, user, allNotes, note?.id]);

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
      setSlashSearch(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const container = range.startContainer;
    if (container.nodeType !== Node.TEXT_NODE) {
      setWikilinkSearch(null);
      setSlashSearch(null);
      return;
    }
    const text = container.textContent?.slice(0, range.startOffset) ?? "";
    const rect = range.getBoundingClientRect();
    const cRect = contentRef.current.getBoundingClientRect();
    const posBase = { top: rect.bottom - cRect.top + 4, left: Math.max(0, rect.left - cRect.left) };

    // Slash command detection — only when the line starts with "/"
    const lineStart = text.lastIndexOf("\n") + 1;
    const lineText = text.slice(lineStart);
    if (lineText.startsWith("/")) {
      const search = lineText.slice(1);
      slashRangeRef.current = { node: container as Text, slashOffset: lineStart, cursorOffset: range.startOffset };
      setSlashPos(posBase);
      setSlashSearch(search);
      setWikilinkSearch(null);
      return;
    }
    setSlashSearch(null);

    // Wiki-link detection
    const lastBracket = text.lastIndexOf("[[");
    if (lastBracket === -1 || text.slice(lastBracket).includes("]")) {
      setWikilinkSearch(null);
      return;
    }
    const search = text.slice(lastBracket + 2);
    wikilinkRangeRef.current = {
      node: container as Text,
      bracketOffset: lastBracket,
      cursorOffset: range.startOffset,
    };
    setWikilinkPos(posBase);
    setWikilinkSearch(search);
  }, []);

  const runSlashCommand = useCallback((action: () => void) => {
    // Delete the "/" + whatever was typed before running the command
    const info = slashRangeRef.current;
    if (info) {
      const range = document.createRange();
      range.setStart(info.node, info.slashOffset);
      range.setEnd(info.node, info.cursorOffset);
      range.deleteContents();
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    }
    setSlashSearch(null);
    slashRangeRef.current = null;
    action();
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
    if (e.key === "Escape" && (wikilinkSearch !== null || slashSearch !== null)) {
      e.preventDefault();
      setWikilinkSearch(null);
      setSlashSearch(null);
      return;
    }
    // Enter/Tab to pick the first slash command
    if ((e.key === "Enter" || e.key === "Tab") && slashSearch !== null) {
      const filtered = SLASH_COMMANDS.filter(
        (c) => c.label.toLowerCase().includes(slashSearch.toLowerCase()) || c.id.startsWith(slashSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        e.preventDefault();
        runSlashCommand(filtered[0].action);
        return;
      }
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // ── Blockquote: Enter on empty line exits the blockquote ──
    if (e.key === "Enter" && !e.shiftKey) {
      let bq: Node | null = range.commonAncestorContainer;
      while (bq && bq !== contentRef.current) {
        if (bq instanceof HTMLElement && bq.tagName === "BLOCKQUOTE") break;
        bq = bq.parentNode;
      }
      if (bq instanceof HTMLElement && bq.tagName === "BLOCKQUOTE") {
        // Check if the current line inside the blockquote is empty
        const lineText = range.commonAncestorContainer.textContent ?? "";
        const atStart = range.startOffset === 0;
        if (lineText.trim() === "" || atStart) {
          e.preventDefault();
          // Insert a paragraph after the blockquote and move cursor into it
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          bq.insertAdjacentElement("afterend", p);
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          p.focus();
          const c = contentRef.current?.innerHTML ?? "";
          setContent(c);
          debouncedSave(title, c, drawing);
          return;
        }
      }
    }

    if (e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Escape")
      return;

    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== contentRef.current) {
      if (
        node instanceof HTMLElement &&
        (node.classList.contains("note-code-block") || node.classList.contains("note-code-wrapper"))
      ) {
        const codeNode = node.classList.contains("note-code-wrapper") ? node : node.closest(".note-code-wrapper") as HTMLElement ?? node;
        const isEmpty = (codeNode.querySelector(".note-code-block") ?? codeNode).textContent?.trim() === "";
        if (isEmpty || e.key === "Escape") {
          e.preventDefault();
          codeNode.remove();
          const c = contentRef.current?.innerHTML ?? "";
          setContent(c);
          debouncedSave(title, c, drawing);
        }
        return;
      }
      // Backspace at the very start of a blockquote exits it
      if (
        e.key === "Backspace" &&
        node instanceof HTMLElement &&
        node.tagName === "BLOCKQUOTE" &&
        range.startOffset === 0
      ) {
        e.preventDefault();
        document.execCommand("outdent");
        const c = contentRef.current?.innerHTML ?? "";
        setContent(c);
        debouncedSave(title, c, drawing);
        return;
      }
      node = node.parentNode;
    }
  };

  // ── Click anywhere in editor area → place cursor using caret position ──
  const handleContentAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks directly on the wrapper (not bubbled from text/elements)
    if (e.target !== e.currentTarget) return;
    const range =
      (document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }).caretRangeFromPoint?.(e.clientX, e.clientY) ??
      (() => {
        const pos = (document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint?.(e.clientX, e.clientY);
        if (!pos) return null;
        const r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse(true);
        return r;
      })();
    if (!range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
    contentRef.current?.focus();
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (contentRef.current) {
      const c = contentRef.current.innerHTML;
      setContent(c);
      debouncedSave(title, c, drawing);
    }
  };

  const insertCodeBlock = (lang = "js") => {
    contentRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "note-code-wrapper";
    wrapper.contentEditable = "false";

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "note-code-toolbar";

    const langSelect = document.createElement("select");
    langSelect.className = "note-code-lang";
    langSelect.style.cssText = "background:transparent;border:none;outline:none;cursor:pointer;color:var(--nous-accent);font:inherit;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;";
    ["js","ts","py","css","html","json","bash","go","rust","java","cpp"].forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      if (l === lang) opt.selected = true;
      langSelect.appendChild(opt);
    });

    const copyBtn = document.createElement("button");
    copyBtn.className = "note-code-copy";
    copyBtn.textContent = "Copy";
    copyBtn.type = "button";
    copyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const code = pre.textContent ?? "";
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
      });
    });

    toolbar.appendChild(langSelect);
    toolbar.appendChild(copyBtn);
    wrapper.appendChild(toolbar);

    // Code area
    const pre = document.createElement("pre");
    pre.className = "note-code-block";
    pre.contentEditable = "true";
    pre.spellcheck = false;
    pre.textContent = selectedText || "// code here";
    wrapper.appendChild(pre);

    range.deleteContents();
    range.insertNode(wrapper);

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
            style={{ background: "rgba(var(--nous-accent-rgb),0.06)" }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--nous-accent)"
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
        background: active ? "rgba(var(--nous-accent-rgb),0.12)" : "transparent",
      }}
      title={btnTitle}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--nous-primary)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? "var(--nous-primary)" : "var(--nous-secondary)"; e.currentTarget.style.background = active ? "rgba(var(--nous-accent-rgb),0.12)" : "transparent"; }}
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
        onClick={handleContentAreaClick}
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
                  border: "1px solid rgba(var(--nous-accent-rgb),0.2)",
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
                        "rgba(var(--nous-accent-rgb),0.10)")
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
                      stroke="var(--nous-accent)"
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

        {/* Slash-command menu */}
        {slashSearch !== null &&
          (() => {
            const filtered = SLASH_COMMANDS.filter(
              (c) => c.label.toLowerCase().includes(slashSearch.toLowerCase()) || c.id.startsWith(slashSearch.toLowerCase())
            );
            if (filtered.length === 0) return null;
            return (
              <div
                className="absolute z-50 rounded-xl py-1.5 shadow-2xl"
                style={{
                  top: slashPos.top,
                  left: slashPos.left,
                  background: "#1a1a24",
                  border: "1px solid rgba(var(--nous-accent-rgb),0.2)",
                  minWidth: 220,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                }}
              >
                <div className="px-3 py-2 text-[11px] font-medium" style={{ color: "var(--nous-secondary)" }}>
                  Insert block
                </div>
                {filtered.map((cmd) => (
                  <button
                    key={cmd.id}
                    onMouseDown={(e) => { e.preventDefault(); runSlashCommand(cmd.action); }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-[13px] transition-all duration-100"
                    style={{ color: "var(--nous-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(var(--nous-accent-rgb),0.10)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: "rgba(var(--nous-accent-rgb),0.12)", color: "var(--nous-accent)" }}
                    >
                      {cmd.icon}
                    </span>
                    {cmd.label}
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
                  <span className="text-[12px] font-medium" style={{ color: "var(--nous-accent)" }}>
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
                    style={{ color: "var(--nous-accent)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nous-accent2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nous-accent)")}
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
                      e.currentTarget.style.background = "rgba(var(--nous-accent-rgb),0.06)";
                      e.currentTarget.style.borderColor = "rgba(var(--nous-accent-rgb),0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nous-accent)" strokeWidth="1.5">
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
