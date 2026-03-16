"use client";
import React, { useEffect, useState } from "react";
import { Note } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { where } from "firebase/firestore";

interface NotesListProps {
  className?: string;
  onNotesChange?: (notes: Note[]) => void;
}

export const NotesList = ({ className = "", onNotesChange }: NotesListProps) => {
  const { subscribeCollection, saveDoc, deleteDocument } = useFirestore();
  const { selectedFolderId, openNoteId, setOpenNoteId, user } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeCollection<Note>("notes", (data) => {
      let filtered = selectedFolderId
        ? data.filter(n => n.folderId === selectedFolderId)
        : data;
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(filtered);
      onNotesChange?.(filtered);
    });
    return () => unsubscribe();
  }, [user, subscribeCollection, selectedFolderId, onNotesChange]);

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.replace(/<[^>]*>/g, "").toLowerCase().includes(search.toLowerCase())
  );

  const handleNewNote = async () => {
    if (!user) return;
    const id = uuidv4();
    const newNote: Note = {
      id, userId: user.uid, title: "", content: "",
      ...(selectedFolderId ? { folderId: selectedFolderId } : {}),
      linkedNoteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDoc("notes", id, newNote);
    setOpenNoteId(id);
  };

  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    await deleteDocument("notes", noteId);
    if (openNoteId === noteId) setOpenNoteId(null);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}
      style={{ background: '#111116', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="px-3 pt-4 pb-3 space-y-2.5">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="13" height="13"
            viewBox="0 0 24 24" fill="none" stroke="#4a4a5e" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-[12px] pl-8 pr-3 py-2 rounded-lg outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#e8e8f0',
            }}
          />
        </div>

        {/* New note button */}
        <button
          onClick={handleNewNote}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(124,122,255,0.1)',
            border: '1px solid rgba(124,122,255,0.2)',
            color: '#7c7aff',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Note
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {filtered.map(note => {
          const active = openNoteId === note.id;
          const preview = note.content.replace(/<[^>]*>/g, "").slice(0, 60);
          return (
            <div
              key={note.id}
              onClick={() => setOpenNoteId(note.id)}
              className="group px-3 py-3 cursor-pointer transition-all relative"
              style={{
                background: active ? 'rgba(124,122,255,0.08)' : 'transparent',
                borderLeft: `2px solid ${active ? '#7c7aff' : 'transparent'}`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-[12px] font-semibold leading-tight truncate"
                  style={{ color: active ? '#a5a3ff' : note.title ? '#e8e8f0' : '#4a4a5e' }}>
                  {note.title || "Untitled"}
                </h4>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Delete button — visible on hover */}
                  <button
                    onClick={e => handleDelete(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all"
                    style={{ color: '#4a4a5e' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4a4a5e')}
                    title="Delete note"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                  <span className="text-[9px] mt-0.5" style={{ color: '#3a3a50' }}>
                    {format(new Date(note.updatedAt), "MMM d")}
                  </span>
                </div>
              </div>
              {preview && (
                <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: '#4a4a5e' }}>
                  {preview}
                </p>
              )}
              {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#7c7aff" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  <span className="text-[9px]" style={{ color: '#7c7aff' }}>
                    {note.linkedNoteIds.length} link{note.linkedNoteIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-[11px]" style={{ color: '#3a3a50' }}>
              {search ? "No notes match your search" : "No notes yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
