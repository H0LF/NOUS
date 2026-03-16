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
        className="group flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all duration-150"
        style={{
          padding: "6px 10px",
          marginLeft: indented ? 12 : 0,
          background: active ? "rgba(124,122,255,0.10)" : "transparent",
          color: active ? "#e8e8f0" : "#6a6a7e",
        }}
        onClick={() => setOpenNoteId(note.id)}
        onContextMenu={e => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, type: "note", id: note.id, name: note.title || "Untitled" });
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = active ? "#e8e8f0" : "#a0a0b4"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = active ? "#e8e8f0" : "#6a6a7e"; }}
      >
        {/* Page icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ opacity: active ? 0.9 : 0.4 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
          <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
        </svg>
        <span className="text-[13px] truncate flex-1" style={{ fontWeight: active ? 500 : 400 }}>
          {note.title || "Untitled"}
        </span>
        {/* Delete on hover */}
        <button
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-all"
          style={{ color: "#6a6a7e" }}
          onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6a6a7e")}
          title="Delete note"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
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
      style={{ background: "#111118" }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        {/* App logo area */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c7aff 0%, #5e5ce6 100%)" }}>
            <svg width="14" height="14" viewBox="0 0 44 44" fill="none">
              <path d="M8 36V8L22 30V8M22 30V8L36 36" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "#e8e8f0" }}>
            Notes
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13"
            viewBox="0 0 24 24" fill="none" stroke="#4a4a5e" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-[13px] pl-9 pr-3 py-2 rounded-lg outline-none transition-all duration-150 focus:ring-1 focus:ring-[#7c7aff]/30"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#e8e8f0",
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => createNote()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
            style={{
              background: "rgba(124,122,255,0.08)",
              color: "#7c7aff",
              border: "1px solid rgba(124,122,255,0.12)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,122,255,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,122,255,0.08)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Page
          </button>
          <button
            onClick={() => setCreatingFolder(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.03)",
              color: "#4a4a5e",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            title="New folder"
            onMouseEnter={e => { e.currentTarget.style.color = "#7c7aff"; e.currentTarget.style.background = "rgba(124,122,255,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#4a4a5e"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* New folder form */}
      {creatingFolder && (
        <form onSubmit={createFolder} className="px-4 pb-3 shrink-0">
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === "Escape" && (setCreatingFolder(false), setNewFolderName(""))}
            placeholder="Folder name..."
            className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#7c7aff]/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(124,122,255,0.3)",
              color: "#e8e8f0",
            }}
          />
        </form>
      )}

      {/* Divider */}
      <div className="mx-4 mb-1" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-3 py-2 pb-4" style={{ scrollbarWidth: "none" }}>
        <div className="space-y-0.5">

          {/* Search results */}
          {filteredNotes && (
            <>
              <div className="px-2 pt-1 pb-2 text-[11px] font-medium" style={{ color: "#4a4a5e" }}>
                {filteredNotes.length} result{filteredNotes.length !== 1 ? "s" : ""}
              </div>
              {filteredNotes.map(n => renderNote(n))}
              {filteredNotes.length === 0 && (
                <p className="text-[13px] px-2 py-6 text-center" style={{ color: "#3a3a50" }}>
                  No notes found
                </p>
              )}
            </>
          )}

          {/* Normal tree */}
          {!filteredNotes && (
            <>
              {/* Section label */}
              {folders.length > 0 && (
                <div className="px-2 pt-1 pb-2 text-[11px] font-medium" style={{ color: "#3a3a50" }}>
                  Workspace
                </div>
              )}

              {folders.map(folder => {
                const folderNotes = notes.filter(n => n.folderId === folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                const hasActiveNote = folderNotes.some(n => n.id === openNoteId);
                return (
                  <div key={folder.id}>
                    <div
                      className="group flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all duration-150"
                      style={{
                        padding: "6px 10px",
                        color: hasActiveNote ? "#e8e8f0" : "#7a7a8c",
                        background: hasActiveNote ? "rgba(255,255,255,0.03)" : "transparent",
                      }}
                      onClick={() => toggleFolder(folder.id)}
                      onContextMenu={e => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: "folder", id: folder.id, name: folder.name });
                      }}
                      onMouseEnter={e => { if (!hasActiveNote) { e.currentTarget.style.color = "#c8c8d8"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}
                      onMouseLeave={e => { if (!hasActiveNote) { e.currentTarget.style.color = "#7a7a8c"; e.currentTarget.style.background = "transparent"; }}}
                    >
                      {/* Chevron */}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        className="shrink-0 transition-transform duration-200"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)", opacity: 0.5 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      {/* Folder dot */}
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: folder.color }} />
                      <span className="text-[13px] font-medium truncate flex-1">{folder.name}</span>
                      <span className="text-[11px] tabular-nums shrink-0" style={{ color: "#3a3a50" }}>
                        {folderNotes.length}
                      </span>
                      {/* + note button */}
                      <button
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-all"
                        onClick={e => { e.stopPropagation(); createNote(folder.id); }}
                        title="New note in folder"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>

                    {/* Notes inside folder */}
                    {isExpanded && (
                      <div className="space-y-0.5 mt-0.5 mb-1">
                        {folderNotes.map(n => renderNote(n, true))}
                        {folderNotes.length === 0 && (
                          <div className="py-2 text-[12px] text-center" style={{ color: "#2e2e40", marginLeft: 12 }}>
                            No pages yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ungrouped notes */}
              {ungrouped.length > 0 && (
                <div className="mt-2">
                  {folders.length > 0 && (
                    <div className="px-2 pt-3 pb-2 text-[11px] font-medium" style={{ color: "#3a3a50" }}>
                      Pages
                    </div>
                  )}
                  {ungrouped.map(n => renderNote(n))}
                </div>
              )}

              {notes.length === 0 && folders.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(124,122,255,0.08)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="12" x2="12" y2="18"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-[13px] mb-1 font-medium" style={{ color: "#6a6a7e" }}>No notes yet</p>
                  <p className="text-[12px] mb-4" style={{ color: "#3a3a50" }}>Create your first page to get started</p>
                  <button
                    onClick={() => createNote()}
                    className="text-[12px] font-medium px-4 py-2 rounded-lg transition-all"
                    style={{ color: "#7c7aff", background: "rgba(124,122,255,0.1)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,122,255,0.18)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(124,122,255,0.1)")}
                  >
                    New Page
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 shrink-0 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-[11px]" style={{ color: "#3a3a50" }}>
          {notes.length} page{notes.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: "#2e2e40" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Synced
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl py-1.5 w-44"
          style={{
            top: contextMenu.y, left: contextMenu.x,
            background: "#1a1a24",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[11px] truncate" style={{ color: "#4a4a5e" }}>
            {contextMenu.name || "Untitled"}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 8px" }} />
          {contextMenu.type === "note" && (
            <button
              onClick={() => { setOpenNoteId(contextMenu.id); setContextMenu(null); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
              style={{ color: "#c8c8d8" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open
            </button>
          )}
          <button
            onClick={() => {
              if (contextMenu.type === "folder") deleteFolder(contextMenu.id);
              else deleteNote(contextMenu.id);
              setContextMenu(null);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "#f87171" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
