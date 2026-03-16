"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Note, Folder } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { v4 as uuidv4 } from "uuid";

const FOLDER_COLORS = ["#7c7aff","#30c48d","#e879f9","#f87171","#60a5fa","#c084fc","#38bdf8"];

interface FileExplorerProps {
  className?: string;
  onNotesChange?: (notes: Note[]) => void;
}

export const FileExplorer = ({ className = "", onNotesChange }: FileExplorerProps) => {
  const { subscribeCollection, saveDoc, deleteDocument } = useFirestore();
  const { openNoteId, setOpenNoteId, user } = useStore();

  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; type: "folder" | "note"; id: string; name: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCollection<Note>("notes", (data) => {
      const sorted = [...data].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNotes(sorted);
      onNotesChange?.(sorted);
    });
    return () => unsub();
  }, [user, subscribeCollection, onNotesChange]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCollection<Folder>("folders", setFolders);
    return () => unsub();
  }, [user, subscribeCollection]);

  // Auto-expand the folder containing the active note
  useEffect(() => {
    if (!openNoteId) return;
    const n = notes.find(n => n.id === openNoteId);
    if (n?.folderId) {
      setExpandedFolders(prev => new Set([...prev, n.folderId!]));
    }
  }, [openNoteId, notes]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const createNote = async (folderId?: string) => {
    if (!user) return;
    const id = uuidv4();
    await saveDoc("notes", id, {
      id, userId: user.uid, title: "", content: "",
      ...(folderId ? { folderId } : {}),
      linkedNoteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setOpenNoteId(id);
    if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]));
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;
    const id = uuidv4();
    await saveDoc("folders", id, {
      id, userId: user.uid, name: newFolderName.trim(),
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
    });
    setNewFolderName("");
    setCreatingFolder(false);
    setExpandedFolders(prev => new Set([...prev, id]));
  };

  const deleteNote = async (noteId: string) => {
    await deleteDocument("notes", noteId);
    if (openNoteId === noteId) setOpenNoteId(null);
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and all its notes?")) return;
    const folderNotes = notes.filter(n => n.folderId === folderId);
    await Promise.all(folderNotes.map(n => deleteDocument("notes", n.id)));
    await deleteDocument("folders", folderId);
  };

  const query = search.trim().toLowerCase();
  const filteredNotes = query
    ? notes.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.replace(/<[^>]*>/g, "").toLowerCase().includes(query)
      )
    : null;

  const renderNote = (note: Note, indented = false) => {
    const active = openNoteId === note.id;
    return (
      <div
        key={note.id}
        className="group flex items-center gap-1.5 rounded-md cursor-pointer select-none transition-all"
        style={{
          padding: "3px 6px",
          paddingLeft: indented ? 20 : 6,
          background: active ? "rgba(124,122,255,0.13)" : "transparent",
          color: active ? "#a5a3ff" : "#5a5a6e",
        }}
        onClick={() => setOpenNoteId(note.id)}
        onContextMenu={e => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, type: "note", id: note.id, name: note.title || "Untitled" });
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#c8c8d8"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#5a5a6e"; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          className="shrink-0 opacity-50">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span className="text-[12px] truncate flex-1">{note.title || "Untitled"}</span>
        <button
          className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded shrink-0"
          style={{ color: "#f87171" }}
          onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
          title="Delete note"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    );
  };

  const ungrouped = filteredNotes
    ? filteredNotes.filter(n => !n.folderId)
    : notes.filter(n => !n.folderId);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}
      style={{ background: "#0e0e14" }}>

      {/* Header */}
      <div className="px-3 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: "#2e2e40" }}>
            Vault
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => createNote()}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "#3a3a50" }}
              title="New note"
              onMouseEnter={e => (e.currentTarget.style.color = "#7c7aff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#3a3a50")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="13" x2="12" y2="18"/>
                <line x1="9.5" y1="15.5" x2="14.5" y2="15.5"/>
              </svg>
            </button>
            <button
              onClick={() => { setCreatingFolder(true); }}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "#3a3a50" }}
              title="New folder"
              onMouseEnter={e => (e.currentTarget.style.color = "#7c7aff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#3a3a50")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9.5" y1="14" x2="14.5" y2="14"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="11" height="11"
            viewBox="0 0 24 24" fill="none" stroke="#3a3a50" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-[11px] pl-7 pr-3 py-1.5 rounded-lg outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "#e8e8f0",
            }}
          />
        </div>
      </div>

      {/* New folder form */}
      {creatingFolder && (
        <form onSubmit={createFolder} className="px-3 pb-2 shrink-0">
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === "Escape" && (setCreatingFolder(false), setNewFolderName(""))}
            placeholder="Folder name..."
            className="w-full text-[11px] px-2 py-1.5 rounded-md outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(124,122,255,0.3)",
              color: "#e8e8f0",
            }}
          />
        </form>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: "none" }}>
        <div className="space-y-0.5">

          {/* Search results */}
          {filteredNotes && (
            <>
              <div className="px-1 pt-1 pb-1.5 text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#2e2e40" }}>
                Results · {filteredNotes.length}
              </div>
              {filteredNotes.map(n => renderNote(n))}
              {filteredNotes.length === 0 && (
                <p className="text-[11px] px-2 py-3" style={{ color: "#3a3a50" }}>No matches</p>
              )}
            </>
          )}

          {/* Normal tree */}
          {!filteredNotes && (
            <>
              {folders.map(folder => {
                const folderNotes = notes.filter(n => n.folderId === folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                const isSelected = folderNotes.some(n => n.id === openNoteId);
                return (
                  <div key={folder.id}>
                    <div
                      className="group flex items-center gap-1.5 rounded-md cursor-pointer select-none transition-all"
                      style={{
                        padding: "4px 6px",
                        color: isSelected ? "#c8c8d8" : "#5a5a6e",
                        background: isSelected ? "rgba(255,255,255,0.03)" : "transparent",
                      }}
                      onClick={() => toggleFolder(folder.id)}
                      onContextMenu={e => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: "folder", id: folder.id, name: folder.name });
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.color = "#c8c8d8"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color = "#5a5a6e"; }}
                    >
                      {/* Chevron */}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        className="shrink-0 transition-transform duration-150"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      {/* Folder icon */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"
                        className="shrink-0" style={{ color: folder.color }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="text-[12px] font-medium truncate flex-1">{folder.name}</span>
                      <span className="text-[10px] opacity-40 shrink-0">{folderNotes.length}</span>
                      {/* + note button */}
                      <button
                        className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded shrink-0 transition-all"
                        onClick={e => { e.stopPropagation(); createNote(folder.id); }}
                        title="New note in folder"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>

                    {/* Notes inside folder */}
                    {isExpanded && (
                      <div className="space-y-0.5 mt-0.5 mb-0.5">
                        {folderNotes.map(n => renderNote(n, true))}
                        {folderNotes.length === 0 && (
                          <div className="py-1 text-[10px]" style={{ paddingLeft: 20, color: "#2e2e40" }}>
                            Empty
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ungrouped notes */}
              {ungrouped.length > 0 && (
                <div className="mt-1">
                  {folders.length > 0 && (
                    <div className="px-1 pt-2 pb-1 text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#2e2e40" }}>
                      Loose
                    </div>
                  )}
                  {ungrouped.map(n => renderNote(n))}
                </div>
              )}

              {notes.length === 0 && folders.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[11px] mb-3" style={{ color: "#3a3a50" }}>Your vault is empty</p>
                  <button
                    onClick={() => createNote()}
                    className="text-[11px] transition-colors"
                    style={{ color: "#7c7aff" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#a5a3ff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#7c7aff")}
                  >
                    Create first note
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
        <p className="text-[9px]" style={{ color: "#2e2e40" }}>
          {notes.length} note{notes.length !== 1 ? "s" : ""} · {folders.length} folder{folders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl py-1 w-40"
          style={{
            top: contextMenu.y, left: contextMenu.x,
            background: "#1e1e28",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === "note" && (
            <>
              <button
                onClick={() => { setOpenNoteId(contextMenu.id); setContextMenu(null); }}
                className="w-full text-left px-3 py-2 text-[11px] transition-colors"
                style={{ color: "#c8c8d8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Open Note
              </button>
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "2px 8px" }} />
            </>
          )}
          <button
            onClick={() => {
              if (contextMenu.type === "folder") deleteFolder(contextMenu.id);
              else deleteNote(contextMenu.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-[11px] transition-colors"
            style={{ color: "#f87171" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Delete {contextMenu.type === "folder" ? "Folder" : "Note"}
          </button>
        </div>
      )}
    </div>
  );
};
