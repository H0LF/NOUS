"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Note, Folder } from "@/types";
import { FOLDER_COLORS } from "@/lib/constants";

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulse: number;
  isFolder: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
}

interface NeuralGraphProps {
  notes: Note[];
  folders?: Folder[];
  activeNoteId: string | null;
  onNodeClick: (id: string) => void;
}

const ACCENT = "#7c7aff";

// Cache CSS variable reads to avoid getComputedStyle() on every animation frame.
// Refreshed every 500ms so theme changes are picked up promptly.
const cssVarCache: Record<string, { value: string; ts: number }> = {};
const CSS_CACHE_TTL = 500;
function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "#0d0d12";
  const now = performance.now();
  const cached = cssVarCache[name];
  if (cached && now - cached.ts < CSS_CACHE_TTL) return cached.value;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#0d0d12";
  cssVarCache[name] = { value, ts: now };
  return value;
}

export const NeuralGraph = ({
  notes,
  folders = [],
  activeNoteId,
  onNodeClick,
}: NeuralGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Camera (pan + zoom)
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });
  const lastPinchRef = useRef<number | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const notesRef = useRef(notes);
  const foldersRef = useRef(folders);
  notesRef.current = notes;
  foldersRef.current = folders;

  const toWorld = useCallback((sx: number, sy: number) => {
    const { x, y, zoom } = camRef.current;
    return { x: (sx - x) / zoom, y: (sy - y) / zoom };
  }, []);

  const buildGraph = (
    W: number,
    H: number,
    currentNotes: Note[],
    currentFolders: Folder[],
  ) => {
    const cx = W / 2;
    const cy = H / 2;
    const existing = nodesRef.current;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const folderGroups = new Map<string, Note[]>();
    const ungrouped: Note[] = [];
    currentNotes.forEach((note) => {
      if (note.folderId) {
        if (!folderGroups.has(note.folderId))
          folderGroups.set(note.folderId, []);
        folderGroups.get(note.folderId)!.push(note);
      } else {
        ungrouped.push(note);
      }
    });

    const totalGroups = folderGroups.size + (ungrouped.length > 0 ? 1 : 0);
    const outerR = Math.min(W, H) * 0.33;
    let groupIndex = 0;

    folderGroups.forEach((groupNotes, folderId) => {
      const folder = currentFolders.find((f) => f.id === folderId);
      const folderColor =
        folder?.color || FOLDER_COLORS[groupIndex % FOLDER_COLORS.length];
      const groupAngle =
        (groupIndex / Math.max(totalGroups, 1)) * Math.PI * 2 - Math.PI / 2;
      const folderX = cx + outerR * Math.cos(groupAngle);
      const folderY = cy + outerR * Math.sin(groupAngle);
      const fNodeId = `folder:${folderId}`;
      const prevFolder = existing.find((n) => n.id === fNodeId);
      nodes.push({
        id: fNodeId,
        label: folder?.name || "Folder",
        x: prevFolder?.x ?? folderX,
        y: prevFolder?.y ?? folderY,
        vx: prevFolder?.vx ?? 0,
        vy: prevFolder?.vy ?? 0,
        radius: 10,
        color: folderColor,
        pulse: prevFolder?.pulse ?? Math.random() * Math.PI * 2,
        isFolder: true,
      });

      const innerR = Math.min(55 + groupNotes.length * 10, 100);
      groupNotes.forEach((note, ni) => {
        const noteAngle = (ni / Math.max(groupNotes.length, 1)) * Math.PI * 2;
        const nx = folderX + innerR * Math.cos(noteAngle);
        const ny = folderY + innerR * Math.sin(noteAngle);
        const prev = existing.find((n) => n.id === note.id);
        nodes.push({
          id: note.id,
          label: note.title || "Untitled",
          x: prev?.x ?? nx,
          y: prev?.y ?? ny,
          vx: prev?.vx ?? 0,
          vy: prev?.vy ?? 0,
          radius: 6,
          color: folderColor + "cc",
          pulse: prev?.pulse ?? Math.random() * Math.PI * 2,
          isFolder: false,
        });
        edges.push({ source: fNodeId, target: note.id, strength: 1 });
        if (ni > 0)
          edges.push({
            source: groupNotes[ni - 1].id,
            target: note.id,
            strength: 1,
          });
      });
      groupIndex++;
    });

    if (ungrouped.length > 0) {
      const ungroupedR = Math.min(W, H) * 0.15;
      ungrouped.forEach((note, ni) => {
        const angle =
          (ni / Math.max(ungrouped.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const nx = cx + ungroupedR * Math.cos(angle);
        const ny = cy + ungroupedR * Math.sin(angle);
        const prev = existing.find((n) => n.id === note.id);
        nodes.push({
          id: note.id,
          label: note.title || "Untitled",
          x: prev?.x ?? nx,
          y: prev?.y ?? ny,
          vx: prev?.vx ?? 0,
          vy: prev?.vy ?? 0,
          radius: 6,
          color: ACCENT + "cc",
          pulse: prev?.pulse ?? Math.random() * Math.PI * 2,
          isFolder: false,
        });
        if (ni > 0)
          edges.push({
            source: ungrouped[ni - 1].id,
            target: note.id,
            strength: 1,
          });
      });
      if (ungrouped.length > 2)
        edges.push({
          source: ungrouped[ungrouped.length - 1].id,
          target: ungrouped[0].id,
          strength: 1,
        });
    }

    currentNotes.forEach((note) => {
      note.linkedNoteIds?.forEach((targetId) => {
        if (currentNotes.find((n) => n.id === targetId))
          edges.push({ source: note.id, target: targetId, strength: 2 });
      });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
  };

  // Track which data we last built the graph for — use count+length
  // instead of building a full key string every frame (was O(n) per frame).
  const builtCountRef = useRef(0);
  const builtNoteCountRef = useRef(0);
  const builtFolderCountRef = useRef(0);

  // Node lookup map rebuilt alongside the graph — turns O(n) find() into O(1).
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();
    window.addEventListener("resize", setSize);

    const ro = new ResizeObserver(() => setSize());
    ro.observe(canvas);

    let frame = 0;

    const drawGrid = (W: number, H: number, darkMode: boolean) => {
      const cam = camRef.current;
      const gridSize = 40 * cam.zoom;
      const offsetX = ((cam.x % gridSize) + gridSize) % gridSize;
      const offsetY = ((cam.y % gridSize) + gridSize) % gridSize;
      ctx.strokeStyle = darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = offsetX; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = offsetY; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    };

    // Rebuild the node lookup map whenever the graph is rebuilt
    const rebuildNodeMap = () => {
      const map = new Map<string, GraphNode>();
      for (const node of nodesRef.current) {
        map.set(node.id, node);
      }
      nodeMapRef.current = map;
    };

    const tick = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      // Rebuild graph when notes/folders change. Uses cheap reference +
      // length checks instead of building a key string every frame.
      if (W > 0 && H > 0) {
        const curNotes = notesRef.current;
        const curFolders = foldersRef.current;
        const noteCount = curNotes.length;
        const folderCount = curFolders.length;
        // Increment a counter any time note/folder data arrives so we
        // detect content changes (id/folderId edits) not just length.
        const dataVersion = curNotes.reduce((s, n) => s + n.id.charCodeAt(0) + (n.folderId?.charCodeAt(0) ?? 0), 0)
          + curFolders.reduce((s, f) => s + f.id.charCodeAt(0), 0);
        if (
          noteCount !== builtNoteCountRef.current ||
          folderCount !== builtFolderCountRef.current ||
          dataVersion !== builtCountRef.current
        ) {
          builtNoteCountRef.current = noteCount;
          builtFolderCountRef.current = folderCount;
          builtCountRef.current = dataVersion;
          buildGraph(W, H, curNotes, curFolders);
          rebuildNodeMap();
        }
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = nodeMapRef.current;
      const active = activeNoteIdRef.current;
      const cam = camRef.current;
      frame++;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2500 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }
      // Edge spring forces — O(1) lookup via nodeMap instead of O(n) find()
      edges.forEach((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = edge.strength === 2 ? 70 : 90;
        const force = (dist - idealDist) * 0.04 * edge.strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        src.vx += fx;
        src.vy += fy;
        tgt.vx -= fx;
        tgt.vy -= fy;
      });
      nodes.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.0015;
        n.vy += (H / 2 - n.y) * 0.0015;
        n.vx *= 0.8;
        n.vy *= 0.8;
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.025;
      });

      // getCSSVar is now cached (500ms TTL) so this is cheap
      const bg = getCSSVar("--nous-bg");
      const bgHex = bg.replace("#", "");
      const bgR = parseInt(bgHex.slice(0, 2), 16) || 0;
      const bgG = parseInt(bgHex.slice(2, 4), 16) || 0;
      const bgB = parseInt(bgHex.slice(4, 6), 16) || 0;
      const darkMode = (bgR * 0.299 + bgG * 0.587 + bgB * 0.114) < 128;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      drawGrid(W, H, darkMode);

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      const edgeBase = darkMode ? "255,255,255" : "0,0,0";

      // Edge rendering — O(1) lookup via nodeMap
      edges.forEach((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return;
        const isAct =
          src.id === active ||
          tgt.id === active ||
          src.id === hoveredRef.current ||
          tgt.id === hoveredRef.current;
        const isExplicit = edge.strength === 2;

        const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
        if (isAct) {
          grad.addColorStop(0, isExplicit ? "rgba(124,122,255,0.8)" : `rgba(${edgeBase},0.28)`);
          grad.addColorStop(1, isExplicit ? "rgba(96,165,250,0.8)" : `rgba(${edgeBase},0.28)`);
        } else {
          grad.addColorStop(0, isExplicit ? "rgba(124,122,255,0.3)" : `rgba(${edgeBase},0.1)`);
          grad.addColorStop(1, isExplicit ? "rgba(96,165,250,0.3)" : `rgba(${edgeBase},0.1)`);
        }
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = isAct ? (isExplicit ? 1.5 : 0.9) : isExplicit ? 1 : 0.5;
        ctx.stroke();

        if (isExplicit && isAct) {
          const t = (frame * 0.012) % 1;
          const px = src.x + (tgt.x - src.x) * t;
          const py = src.y + (tgt.y - src.y) * t;
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 5);
          pg.addColorStop(0, ACCENT);
          pg.addColorStop(1, "rgba(124,122,255,0)");
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = pg;
          ctx.fill();
        }
      });

      nodes.forEach((node) => {
        const isActive = node.id === active;
        const isHovered = node.id === hoveredRef.current;
        const r = node.radius + (isActive ? 2.5 : 0);
        const baseColor = node.color.replace("cc", "");
        const pulseAmp = Math.sin(node.pulse);

        if (isActive || isHovered || node.isFolder) {
          const glowR = r + (node.isFolder ? 14 : 9) + pulseAmp * 3;
          const grd = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, glowR);
          grd.addColorStop(0, isActive ? "rgba(124,122,255,0.45)" : baseColor + "38");
          grd.addColorStop(1, baseColor + "00"); // color-matched transparent — no black bleed
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        if (node.isFolder) {
          const haloR = r + 20 + pulseAmp * 4;
          const halo = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, haloR);
          halo.addColorStop(0, baseColor + "22");
          halo.addColorStop(1, baseColor + "00"); // color-matched transparent
          ctx.beginPath();
          ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
          ctx.fillStyle = halo;
          ctx.fill();
        }

        const grd = ctx.createRadialGradient(
          node.x - r * 0.35,
          node.y - r * 0.35,
          0,
          node.x,
          node.y,
          r,
        );
        grd.addColorStop(0, isActive ? "#d0ceff" : baseColor + "ee");
        grd.addColorStop(
          1,
          isActive ? ACCENT : baseColor + (node.isFolder ? "99" : "55"),
        );
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isActive
          ? "#a5a3ff"
          : baseColor + (node.isFolder ? "ff" : "88");
        ctx.lineWidth = isActive ? 2.5 : node.isFolder ? 2 : 1;
        ctx.stroke();

        if (node.isFolder || isActive) {
          ctx.beginPath();
          ctx.arc(node.x - r * 0.3, node.y - r * 0.3, r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fill();
        }

        if (node.isFolder || isActive || isHovered || r > 8) {
          const fontSize = node.isFolder ? 10 : 9;
          ctx.font = `${isActive || node.isFolder ? "600" : "400"} ${fontSize}px -apple-system, sans-serif`;
          const primaryColor = getCSSVar("--nous-primary");
          ctx.fillStyle = isActive
            ? "#ffffff"
            : node.isFolder
              ? primaryColor
              : "rgba(128,128,160,0.7)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const label =
            node.label.length > 15
              ? node.label.slice(0, 14) + "\u2026"
              : node.label;
          ctx.shadowColor = bg;
          ctx.shadowBlur = 4;
          ctx.fillText(label, node.x, node.y + r + 5, 96);
          ctx.shadowBlur = 0;
        }
      });

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", setSize);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  const getNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const { x: wx, y: wy } = toWorld(clientX - rect.left, clientY - rect.top);
      return (
        nodesRef.current.find((n) => {
          const dx = n.x - wx,
            dy = n.y - wy;
          return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
        }) || null
      );
    },
    [toWorld],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const cam = camRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.max(0.3, Math.min(4, cam.zoom * factor));
    cam.x = mx - (mx - cam.x) * (newZoom / cam.zoom);
    cam.y = my - (my - cam.y) * (newZoom / cam.zoom);
    cam.zoom = newZoom;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAt(e.clientX, e.clientY);
      if (!node) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          mx: e.clientX,
          my: e.clientY,
          cx: camRef.current.x,
          cy: camRef.current.y,
        };
        (canvasRef.current as HTMLCanvasElement).style.cursor = "grabbing";
      }
    },
    [getNodeAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingRef.current) {
        const ds = dragStartRef.current;
        camRef.current.x = ds.cx + (e.clientX - ds.mx);
        camRef.current.y = ds.cy + (e.clientY - ds.my);
        return;
      }
      const node = getNodeAt(e.clientX, e.clientY);
      hoveredRef.current = node?.id || null;
      if (node) {
        const rect = canvasRef.current!.getBoundingClientRect();
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 38,
          label: node.label,
        });
        (canvasRef.current as HTMLCanvasElement).style.cursor = "pointer";
      } else {
        setTooltip(null);
        (canvasRef.current as HTMLCanvasElement).style.cursor = "grab";
      }
    },
    [getNodeAt],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        (canvasRef.current as HTMLCanvasElement).style.cursor = "grab";
        return;
      }
      const node = getNodeAt(e.clientX, e.clientY);
      if (node && !node.isFolder) onNodeClick(node.id);
    },
    [getNodeAt, onNodeClick],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      lastTouchRef.current = { x: t.clientX, y: t.clientY };
      dragStartRef.current = {
        mx: t.clientX,
        my: t.clientY,
        cx: camRef.current.x,
        cy: camRef.current.y,
      };
      lastPinchRef.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchRef.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouchRef.current) {
      const t = e.touches[0];
      camRef.current.x =
        dragStartRef.current.cx + (t.clientX - dragStartRef.current.mx);
      camRef.current.y =
        dragStartRef.current.cy + (t.clientY - dragStartRef.current.my);
    } else if (e.touches.length === 2 && lastPinchRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / lastPinchRef.current;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = midX - rect.left;
      const my = midY - rect.top;
      const cam = camRef.current;
      const newZoom = Math.max(0.3, Math.min(4, cam.zoom * factor));
      cam.x = mx - (mx - cam.x) * (newZoom / cam.zoom);
      cam.y = my - (my - cam.y) * (newZoom / cam.zoom);
      cam.zoom = newZoom;
      lastPinchRef.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (
        e.changedTouches.length === 1 &&
        e.touches.length === 0 &&
        lastTouchRef.current
      ) {
        const t = e.changedTouches[0];
        const dx = t.clientX - dragStartRef.current.mx;
        const dy = t.clientY - dragStartRef.current.my;
        if (Math.sqrt(dx * dx + dy * dy) < 8) {
          const node = getNodeAt(t.clientX, t.clientY);
          if (node && !node.isFolder) onNodeClick(node.id);
        }
      }
      lastTouchRef.current = null;
      lastPinchRef.current = null;
    },
    [getNodeAt, onNodeClick],
  );

  const resetCamera = useCallback(() => {
    camRef.current = { x: 0, y: 0, zoom: 1 };
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: "var(--nous-bg)" }}>
      {notes.length === 0 && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(124,122,255,0.1)",
              border: "1px solid rgba(124,122,255,0.2)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c7aff"
              strokeWidth="1.8"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <p className="text-[11px] font-medium" style={{ color: "var(--nous-secondary)" }}>
            Create notes to build your graph
          </p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          hoveredRef.current = null;
          setTooltip(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => {
            const cam = camRef.current;
            const c = canvasRef.current;
            if (!c) return;
            const mx = c.offsetWidth / 2;
            const my = c.offsetHeight / 2;
            const newZoom = Math.min(4, cam.zoom * 1.2);
            cam.x = mx - (mx - cam.x) * (newZoom / cam.zoom);
            cam.y = my - (my - cam.y) * (newZoom / cam.zoom);
            cam.zoom = newZoom;
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[16px] font-bold transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#6a6a7e",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            const cam = camRef.current;
            const c = canvasRef.current;
            if (!c) return;
            const mx = c.offsetWidth / 2;
            const my = c.offsetHeight / 2;
            const newZoom = Math.max(0.3, cam.zoom * 0.83);
            cam.x = mx - (mx - cam.x) * (newZoom / cam.zoom);
            cam.y = my - (my - cam.y) * (newZoom / cam.zoom);
            cam.zoom = newZoom;
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[16px] font-bold transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#6a6a7e",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {"\u2212"}
        </button>
        <button
          onClick={resetCamera}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#6a6a7e",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          title="Reset view"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <div
        className="absolute bottom-3 left-3 text-[10px]"
        style={{ color: "#2e2e40" }}
      >
        Scroll to zoom {"\u00b7"} Drag to pan {"\u00b7"} Tap node to open
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: "var(--nous-surface)",
            border: "1px solid rgba(124,122,255,0.3)",
            color: "var(--nous-primary)",
            transform: "translateX(-50%)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
};
