"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  const [mobilePanel, setMobilePanel] = useState<Panel>("list");

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

          // ── 1. Find or create a folder named after the event ──
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

          // ── 2. Build note title ──
          // For class events: "Teórica 1", "Teórica 2", etc. based on existing notes for this event
          // For non-class events: use the event title directly
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

          // ── 3. Create the note inside the folder ──
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

          // Navigate to the new note and select its folder
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
        {/* Panel 1: File Explorer (Obsidian-style unified sidebar) */}
        <div
          className="w-[240px] shrink-0"
          style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}
        >
          <FileExplorer className="h-full" onNotesChange={handleNotesChange} />
        </div>

        {/* Panel 2: Editor */}
        <div className="flex-1 min-w-0">
          <NoteEditor className="h-full" />
        </div>

        {/* Panel 4: Neural Graph (toggleable) */}
        {showGraph && (
          <div
            className="w-[280px] shrink-0 flex flex-col"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
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
                <span
                  className="text-[10px] font-semibold tracking-wide"
                  style={{ color: "#7c7aff" }}
                >
                  Neural Graph
                </span>
              </div>
              <button
                onClick={() => setShowGraph(false)}
                className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                style={{ color: "#3a3a50" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a50")}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
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
              className="px-3 py-2 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p
                className="text-[9px] text-center"
                style={{ color: "#2e2e40" }}
              >
                {allNotes.length} note{allNotes.length !== 1 ? "s" : ""} · Click
                node to open · Drag to explore
              </p>
            </div>
          </div>
        )}

        {/* Show graph button when hidden */}
        {!showGraph && (
          <button
            onClick={() => setShowGraph(true)}
            className="w-8 shrink-0 flex flex-col items-center justify-center gap-2 transition-colors"
            style={{
              background: "#0e0e14",
              borderLeft: "1px solid rgba(255,255,255,0.04)",
              color: "#3a3a50",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#7c7aff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#3a3a50")}
            title="Show Graph"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
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
        {/* Mobile tab bar */}
        <div
          className="flex shrink-0"
          style={{
            background: "#0e0e14",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {(
            [
              { key: "list", label: "Notes" },
              { key: "editor", label: "Editor" },
              { key: "graph", label: "Graph" },
            ] as { key: Panel; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMobilePanel(key)}
              className="flex-1 py-3 text-[11px] font-medium transition-colors"
              style={{
                color: mobilePanel === key ? "#7c7aff" : "#3a3a50",
                borderBottom:
                  mobilePanel === key
                    ? "2px solid #7c7aff"
                    : "2px solid transparent",
              }}
            >
              {label}
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
