"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { FileExplorer } from "@/components/notes/FileExplorer";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NeuralGraph } from "@/components/notes/NeuralGraph";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { v4 as uuidv4 } from "uuid";
import { Note, Folder } from "@/types";
import { where } from "firebase/firestore";

type Panel = "folders" | "list" | "editor" | "graph";

export default function NotesPage() {
  const { setOpenNoteId, openNoteId, user } = useStore();
  const { saveDoc, queryDocs, subscribeCollection } = useFirestore();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [showGraph, setShowGraph] = useState(true);
  const [graphWidth, setGraphWidth] = useState(300);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });
  const [mobilePanel, setMobilePanel] = useState<Panel>("list");

  // Graph panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, width: graphWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = resizeStartRef.current.x - ev.clientX;
      const newWidth = Math.max(200, Math.min(600, resizeStartRef.current.width + delta));
      setGraphWidth(newWidth);
    };
    const handleUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [graphWidth]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCollection<Folder>("folders", setAllFolders);
    return () => unsub();
  }, [user, subscribeCollection]);

  // Handle pending note from calendar double-click
  useEffect(() => {
    const handlePendingNote = async () => {
      const pendingStr = sessionStorage.getItem("pendingNote");
      if (pendingStr && user) {
        sessionStorage.removeItem("pendingNote");
        try {
          const { eventId, eventTitle, isClass, classType } =
            JSON.parse(pendingStr);

          const existingFolders = await queryDocs<Folder>(
            "folders",
            where("name", "==", eventTitle),
          );
          let folderId: string;
          if (existingFolders.length > 0) {
            folderId = existingFolders[0].id;
          } else {
            folderId = uuidv4();
            const FOLDER_COLORS = [
              "#7c7aff",
              "#30c48d",
              "#e879f9",
              "#f87171",
              "#60a5fa",
              "#c084fc",
              "#38bdf8",
            ];
            await saveDoc("folders", folderId, {
              id: folderId,
              userId: user.uid,
              name: eventTitle,
              color:
                FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
            });
          }

          let title = eventTitle;
          if (isClass && classType) {
            const existingNotes = await queryDocs<Note>(
              "notes",
              where("eventId", "==", eventId),
            );
            const sameTypeNotes = existingNotes.filter((n) =>
              n.title.startsWith(classType),
            );
            title = `${classType} ${sameTypeNotes.length + 1}`;
          }

          const id = uuidv4();
          await saveDoc("notes", id, {
            id,
            userId: user.uid,
            title,
            content: `<h2>${title}</h2><p>Ref: ${eventTitle}</p>`,
            folderId,
            eventId,
            linkedNoteIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          setOpenNoteId(id);
          setMobilePanel("editor");
        } catch (e) {
          console.error(e);
        }
      }
    };
    if (user) handlePendingNote();
  }, [user, setOpenNoteId, saveDoc, queryDocs]);

  const handleNotesChange = useCallback((notes: Note[]) => {
    setAllNotes(notes);
  }, []);

  const handleGraphNodeClick = (id: string) => {
    setOpenNoteId(id);
    setMobilePanel("editor");
  };

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: "#0d0d12" }}
    >
      {/* ══ DESKTOP LAYOUT ══ */}
      <div className="hidden md:flex w-full h-full">
        {/* Sidebar */}
        <div
          className="w-[260px] shrink-0"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <FileExplorer className="h-full" onNotesChange={handleNotesChange} />
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          <NoteEditor className="h-full" />
        </div>

        {/* Neural Graph (toggleable, resizable) */}
        {showGraph && (
          <div
            className="shrink-0 flex flex-col relative"
            style={{ width: graphWidth, borderLeft: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Resize handle */}
            <div
              onMouseDown={handleResizeStart}
              className="absolute left-0 top-0 bottom-0 w-1 z-20"
              style={{ cursor: "col-resize" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,122,255,0.3)"; }}
              onMouseLeave={(e) => { if (!isResizingRef.current) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            />
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(124,122,255,0.1)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="2.5">
                    <circle cx="18" cy="5" r="2.5" />
                    <circle cx="6" cy="12" r="2.5" />
                    <circle cx="18" cy="19" r="2.5" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <span className="text-[12px] font-semibold" style={{ color: "#7a7a8c" }}>
                  Graph
                </span>
              </div>
              <button
                onClick={() => setShowGraph(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150"
                style={{ color: "#3a3a50" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#e8e8f0"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#3a3a50"; e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <NeuralGraph
                notes={allNotes}
                folders={allFolders}
                activeNoteId={openNoteId}
                onNodeClick={handleGraphNodeClick}
              />
            </div>
            <div
              className="px-4 py-2.5 shrink-0 flex items-center justify-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p className="text-[10px]" style={{ color: "#2e2e40" }}>
                {allNotes.length} page{allNotes.length !== 1 ? "s" : ""} connected
              </p>
            </div>
          </div>
        )}

        {/* Show graph button when hidden */}
        {!showGraph && (
          <button
            onClick={() => setShowGraph(true)}
            className="w-10 shrink-0 flex flex-col items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: "#0e0e14",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              color: "#3a3a50",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7c7aff"; e.currentTarget.style.background = "rgba(124,122,255,0.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#3a3a50"; e.currentTarget.style.background = "#0e0e14"; }}
            title="Show Graph"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        )}
      </div>

      {/* ══ MOBILE LAYOUT ══ */}
      <div className="md:hidden flex flex-col w-full h-full">
        {/* Mobile tab bar — cleaner design */}
        <div
          className="flex shrink-0"
          style={{
            background: "#111118",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {(
            [
              { key: "list", label: "Pages", icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              )},
              { key: "editor", label: "Editor", icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              )},
              { key: "graph", label: "Graph", icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              )},
            ] as { key: Panel; label: string; icon: React.ReactNode }[]
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMobilePanel(key)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-150"
              style={{
                color: mobilePanel === key ? "#7c7aff" : "#3a3a50",
                borderBottom:
                  mobilePanel === key
                    ? "2px solid #7c7aff"
                    : "2px solid transparent",
              }}
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {mobilePanel === "list" && (
            <FileExplorer
              className="h-full"
              onNotesChange={handleNotesChange}
            />
          )}
          {mobilePanel === "editor" && <NoteEditor className="h-full" />}
          {mobilePanel === "graph" && (
            <NeuralGraph
              notes={allNotes}
              folders={allFolders}
              activeNoteId={openNoteId}
              onNodeClick={handleGraphNodeClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
