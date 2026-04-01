"use client";
import React, { useEffect, useState } from "react";
import { Folder } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { v4 as uuidv4 } from "uuid";

interface FolderTreeProps {
  className?: string;
}

const FOLDER_COLORS = ["#2d8b8b","#30c48d","#e879f9","#f87171","#60a5fa","#45abab"];

export const FolderTree = ({ className = "" }: FolderTreeProps) => {
  const { subscribeCollection, saveDoc, deleteDocument } = useFirestore();
  const { selectedFolderId, setSelectedFolderId, user } = useStore();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folder: Folder } | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCollection<Folder>("folders", setFolders);
    return () => unsub();
  }, [user, subscribeCollection]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;
    const id = uuidv4();
    await saveDoc("folders", id, {
      id, userId: user.uid, name: newFolderName,
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
    });
    setNewFolderName("");
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    if (confirm(`Delete "${contextMenu.folder.name}"?`)) {
      await deleteDocument("folders", contextMenu.folder.id);
    }
    setContextMenu(null);
  };

  const itemStyle = (active: boolean) => ({
    background: active ? 'rgba(45,139,139,0.1)' : 'transparent',
    color: active ? 'var(--nous-accent)' : 'var(--nous-secondary)',
    borderRadius: '6px',
    padding: '5px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  } as React.CSSProperties);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: '#2e2e40' }}>
          Folders
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: '#2e2e40' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--nous-accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2e2e40')}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* New folder input */}
      {isCreating && (
        <form onSubmit={handleCreate} className="mb-2">
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === "Escape" && setIsCreating(false)}
            placeholder="Folder name..."
            className="w-full text-[11px] px-2 py-1.5 rounded-md outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(45,139,139,0.3)',
              color: 'var(--nous-primary)',
            }}
          />
        </form>
      )}

      {/* All Notes */}
      <div
        style={itemStyle(selectedFolderId === null)}
        onClick={() => setSelectedFolderId(null)}
        onMouseEnter={e => { if (selectedFolderId !== null) (e.currentTarget as HTMLElement).style.color = '#c8c8d8'; }}
        onMouseLeave={e => { if (selectedFolderId !== null) (e.currentTarget as HTMLElement).style.color = 'var(--nous-secondary)'; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        All Notes
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto mt-1 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
        {folders.map(folder => (
          <div
            key={folder.id}
            style={itemStyle(selectedFolderId === folder.id)}
            onClick={() => setSelectedFolderId(folder.id)}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folder }); }}
            onMouseEnter={e => { if (selectedFolderId !== folder.id) (e.currentTarget as HTMLElement).style.color = '#c8c8d8'; }}
            onMouseLeave={e => { if (selectedFolderId !== folder.id) (e.currentTarget as HTMLElement).style.color = 'var(--nous-secondary)'; }}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: folder.color }} />
            <span className="truncate">{folder.name}</span>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg py-1 w-36 animate-fadeIn"
          style={{
            top: contextMenu.y, left: contextMenu.x,
            background: '#1e1e28',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-[11px] transition-colors"
            style={{ color: '#f87171' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Delete Folder
          </button>
        </div>
      )}
    </div>
  );
};
