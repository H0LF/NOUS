"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Note, Folder } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useStore } from "@/store";
import { v4 as uuidv4 } from "uuid";
import { FOLDER_COLORS } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileExplorerProps {
  className?: string;
  /** Optional callback — called whenever the shared notes list updates */
  onNotesChange?: (notes: Note[]) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: "folder" | "note";
  id: string;
  name: string;
}

// A folder node extended with its nested children for rendering.
interface FolderNode extends Folder {
  children: FolderNode[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a recursive tree from a flat folder list. */
function buildFolderTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));

  const roots: FolderNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** Collect a folder's ID plus every descendant folder ID (BFS). */
function getDescendantIds(folderId: string, folders: Folder[]): Set<string> {
  const result = new Set<string>();
  const queue = [folderId];
  while (queue.length) {
    const id = queue.shift()!;
    result.add(id);
    folders.filter((f) => f.parentId === id).forEach((f) => queue.push(f.id));
  }
  return result;
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative rounded-2xl p-5 max-w-xs w-full mx-4"
        style={{
          background: "var(--nous-card)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <p
          className="text-[13px] mb-4 leading-relaxed"
          style={{ color: "var(--nous-primary)" }}
        >
          {message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--nous-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Move-to-folder picker ────────────────────────────────────────────────────

function MovePickerNode({
  node,
  depth,
  excludeIds,
  onMove,
}: {
  node: FolderNode;
  depth: number;
  excludeIds: Set<string>;
  onMove: (id: string) => void;
}) {
  if (excludeIds.has(node.id)) return null;
  return (
    <>
      <button
        onClick={() => onMove(node.id)}
        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all"
        style={{ color: "var(--nous-primary)", paddingLeft: 12 + depth * 14 }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: node.color }}
        />
        {node.name}
      </button>
      {node.children.map((child) => (
        <MovePickerNode
          key={child.id}
          node={child}
          depth={depth + 1}
          excludeIds={excludeIds}
          onMove={onMove}
        />
      ))}
    </>
  );
}

function MovePicker({
  folders,
  excludeIds,
  onMove,
  onCancel,
}: {
  folders: Folder[];
  excludeIds: Set<string>;
  onMove: (targetFolderId: string | null) => void;
  onCancel: () => void;
}) {
  const tree = buildFolderTree(folders);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative rounded-2xl p-4 max-w-xs w-full mx-4"
        style={{
          background: "var(--nous-card)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--nous-secondary)" }}
        >
          Move to folder
        </p>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          <button
            onClick={() => onMove(null)}
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all"
            style={{ color: "var(--nous-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span>No folder (top level)</span>
          </button>
          {tree.map((node) => (
            <MovePickerNode
              key={node.id}
              node={node}
              depth={0}
              excludeIds={excludeIds}
              onMove={onMove}
            />
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full py-2 rounded-lg text-[12px] font-medium transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: "var(--nous-secondary)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const FileExplorer = ({ className = "", onNotesChange }: FileExplorerProps) => {
  const { saveDoc, deleteDocument } = useFirestore();
  // Read shared data from the store (populated by useAppData in the layout).
  const { openNoteId, setOpenNoteId, user, allNotes: notes, allFolders: folders } = useStore();

  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "folder" | "note";
    id: string;
    name: string;
  } | null>(null);
  const [movePicker, setMovePicker] = useState<{
    type: "folder" | "note";
    id: string;
  } | null>(null);
  const [creatingSubfolderId, setCreatingSubfolderId] = useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [dragItem, setDragItem] = useState<{ type: "note" | "folder"; id: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | "root" | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  // Notify parent when shared notes list changes.
  useEffect(() => {
    onNotesChange?.(notes);
  }, [notes, onNotesChange]);

  // Auto-expand the full ancestor chain for the currently open note.
  useEffect(() => {
    if (!openNoteId) return;
    const n = notes.find((n) => n.id === openNoteId);
    if (!n?.folderId) return;
    const toExpand: string[] = [];
    let current: string | undefined = n.folderId;
    while (current) {
      toExpand.push(current);
      const parent = folders.find((f) => f.id === current);
      current = parent?.parentId ?? undefined;
    }
    if (toExpand.length > 0) {
      setExpandedFolders((prev) => new Set([...prev, ...toExpand]));
    }
  }, [openNoteId, notes, folders]);

  // Close context menu on any click outside.
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ── Tree builder ─────────────────────────────────────────────────────────

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  // ── Search filter ─────────────────────────────────────────────────────────
  // useMemo so we don't strip HTML on every render.
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.replace(/<[^>]*>/g, "").toLowerCase().includes(q),
    );
  }, [notes, search]);

  // ── CRUD operations ───────────────────────────────────────────────────────

  const createNote = async (folderId?: string) => {
    if (!user) return;
    const id = uuidv4();
    await saveDoc("notes", id, {
      id,
      userId: user.uid,
      title: "",
      content: "",
      ...(folderId ? { folderId } : {}),
      linkedNoteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setOpenNoteId(id);
    if (folderId) setExpandedFolders((prev) => new Set([...prev, folderId]));
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;
    const id = uuidv4();
    await saveDoc("folders", id, {
      id,
      userId: user.uid,
      name: newFolderName.trim(),
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
    });
    setNewFolderName("");
    setCreatingFolder(false);
    setExpandedFolders((prev) => new Set([...prev, id]));
  };

  const createSubfolder = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!newSubfolderName.trim() || !user) return;
    const id = uuidv4();
    await saveDoc("folders", id, {
      id,
      userId: user.uid,
      name: newSubfolderName.trim(),
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
      parentId,
    });
    setNewSubfolderName("");
    setCreatingSubfolderId(null);
    setExpandedFolders((prev) => new Set([...prev, parentId, id]));
  };

  const confirmAndDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "note") {
      await deleteDocument("notes", confirmDelete.id);
      if (openNoteId === confirmDelete.id) setOpenNoteId(null);
    } else {
      // Recursively delete all descendant folders and their notes.
      const descendantFolderIds = getDescendantIds(confirmDelete.id, folders);
      const affectedNotes = notes.filter(
        (n) => n.folderId && descendantFolderIds.has(n.folderId),
      );
      await Promise.all(affectedNotes.map((n) => deleteDocument("notes", n.id)));
      await Promise.all(
        [...descendantFolderIds].map((fid) => deleteDocument("folders", fid)),
      );
      if (openNoteId && affectedNotes.some((n) => n.id === openNoteId)) {
        setOpenNoteId(null);
      }
    }
    setConfirmDelete(null);
  };

  const handleRenameSubmit = async (
    e: React.FormEvent | React.FocusEvent,
  ) => {
    e.preventDefault?.();
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const isFolder = folders.some((f) => f.id === renamingId);
    if (isFolder) {
      await saveDoc("folders", renamingId, { name: renameValue.trim() });
    } else {
      await saveDoc("notes", renamingId, {
        title: renameValue.trim(),
        updatedAt: new Date().toISOString(),
      });
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const changeFolderColor = async (folderId: string, color: string) => {
    await saveDoc("folders", folderId, { color });
    setColorPickerId(null);
  };

  const handleMove = useCallback(
    async (targetFolderId: string | null) => {
      if (!movePicker) return;
      if (movePicker.type === "note") {
        await saveDoc("notes", movePicker.id, {
          folderId: targetFolderId ?? null,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Moving a folder — parentId changes. targetFolderId cannot be a descendant.
        await saveDoc("folders", movePicker.id, {
          parentId: targetFolderId ?? null,
        });
        // Ensure moved folder is visible.
        if (targetFolderId) {
          setExpandedFolders((prev) => new Set([...prev, targetFolderId]));
        }
      }
      setMovePicker(null);
    },
    [movePicker, saveDoc],
  );

  // Compute which folder IDs to exclude from the move picker.
  const movePickerExcludeIds = useMemo<Set<string>>(() => {
    if (!movePicker || movePicker.type !== "folder") return new Set();
    return getDescendantIds(movePicker.id, folders);
  }, [movePicker, folders]);

  const handleDrop = useCallback(
    async (targetFolderId: string | null) => {
      if (!dragItem) return;
      if (dragItem.type === "note") {
        await saveDoc("notes", dragItem.id, {
          folderId: targetFolderId ?? null,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Prevent dropping a folder into its own descendant.
        const descendants = getDescendantIds(dragItem.id, folders);
        if (targetFolderId && descendants.has(targetFolderId)) return;
        await saveDoc("folders", dragItem.id, { parentId: targetFolderId ?? null });
        if (targetFolderId) {
          setExpandedFolders((prev) => new Set([...prev, targetFolderId]));
        }
      }
      setDragItem(null);
      setDragOverId(null);
    },
    [dragItem, folders, saveDoc],
  );

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderNote = (note: Note, indentLevel = 0) => {
    const active = openNoteId === note.id;
    const isRenaming = renamingId === note.id;

    return (
      <div
        key={note.id}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          setDragItem({ type: "note", id: note.id });
        }}
        onDragEnd={() => { setDragItem(null); setDragOverId(null); }}
        className="group flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all duration-150"
        style={{
          padding: "6px 10px",
          marginLeft: indentLevel * 12,
          background: active ? "rgba(45,139,139,0.10)" : "transparent",
          color: active ? "var(--nous-primary)" : "var(--nous-secondary)",
          opacity: dragItem?.id === note.id ? 0.4 : 1,
        }}
        onClick={() => !isRenaming && setOpenNoteId(note.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: "note",
            id: note.id,
            name: note.title || "Untitled",
          });
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0"
          style={{ opacity: active ? 0.9 : 0.4 }}
        >
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <polyline
            points="14 2 14 8 20 8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="8"
            y1="13"
            x2="16"
            y2="13"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.5"
          />
          <line
            x1="8"
            y1="17"
            x2="13"
            y2="17"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.5"
          />
        </svg>

        {isRenaming ? (
          <form
            onSubmit={handleRenameSubmit}
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === "Escape" && setRenamingId(null)}
              className="w-full text-[13px] bg-transparent outline-none border-b"
              style={{
                color: "var(--nous-primary)",
                borderColor: "var(--nous-accent)",
              }}
            />
          </form>
        ) : (
          <span
            className="text-[13px] truncate flex-1"
            style={{ fontWeight: active ? 500 : 400 }}
          >
            {note.title || "Untitled"}
          </span>
        )}

        <button
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-all"
          style={{ color: "var(--nous-secondary)" }}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete({
              type: "note",
              id: note.id,
              name: note.title || "Untitled",
            });
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--nous-secondary)")
          }
          title="Delete note"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
        </button>
      </div>
    );
  };

  const renderFolderNode = (node: FolderNode, depth = 0): React.ReactNode => {
    const folderNotes = notes.filter((n) => n.folderId === node.id);
    const isExpanded = expandedFolders.has(node.id);
    const hasActiveNote =
      folderNotes.some((n) => n.id === openNoteId) ||
      node.children.some((c) =>
        notes.filter((n) => n.folderId === c.id).some((n) => n.id === openNoteId),
      );
    const isRenaming = renamingId === node.id;

    const isDragOver = dragOverId === node.id;
    const isDraggingThis = dragItem?.id === node.id;
    // When dragging a folder, its descendants are invalid drop targets.
    const isInvalidTarget =
      dragItem?.type === "folder" && dragItem.id !== node.id
        ? getDescendantIds(dragItem.id, folders).has(node.id)
        : false;

    return (
      <div
        key={node.id}
        style={{
          marginLeft: depth * 12,
          borderRadius: 8,
          outline: isDragOver ? "1px solid rgba(45,139,139,0.4)" : "none",
          background: isDragOver ? "rgba(45,139,139,0.08)" : "transparent",
          opacity: isDraggingThis ? 0.4 : 1,
          transition: "background 150ms, outline 150ms",
        }}
        onDragOver={(e) => {
          if (!dragItem || isDraggingThis || isInvalidTarget) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          setDragOverId(node.id);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverId((prev) => (prev === node.id ? null : prev));
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDraggingThis && !isInvalidTarget) {
            handleDrop(node.id);
            if (!expandedFolders.has(node.id)) toggleFolder(node.id);
          }
        }}
      >
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            setDragItem({ type: "folder", id: node.id });
          }}
          onDragEnd={() => { setDragItem(null); setDragOverId(null); }}
          className="group flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all duration-150"
          style={{
            padding: "6px 10px",
            color: hasActiveNote ? "var(--nous-primary)" : "var(--nous-secondary)",
            background: hasActiveNote && !isDragOver ? "rgba(255,255,255,0.03)" : "transparent",
          }}
          onClick={() => !isRenaming && toggleFolder(node.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              type: "folder",
              id: node.id,
              name: node.name,
            });
          }}
        >
          {/* Expand chevron */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="shrink-0 transition-transform duration-200"
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
              opacity: 0.5,
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>

          {/* Colour dot */}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: node.color }}
          />

          {/* Name or inline rename input */}
          {isRenaming ? (
            <form
              onSubmit={handleRenameSubmit}
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => e.key === "Escape" && setRenamingId(null)}
                className="w-full text-[13px] bg-transparent outline-none border-b"
                style={{
                  color: "var(--nous-primary)",
                  borderColor: "var(--nous-accent)",
                }}
              />
            </form>
          ) : (
            <span className="text-[13px] font-medium truncate flex-1">
              {node.name}
            </span>
          )}

          <span
            className="text-[11px] tabular-nums shrink-0"
            style={{ color: "var(--nous-secondary)" }}
          >
            {folderNotes.length}
          </span>

          {/* Add note to folder */}
          <button
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              createNote(node.id);
            }}
            title="New note in folder"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Expanded: notes + nested subfolders */}
        {isExpanded && (
          <div className="space-y-0.5 mt-0.5 mb-1">
            {/* Nested subfolders first */}
            {node.children.map((child) => renderFolderNode(child, depth + 1))}

            {/* Inline new-subfolder form */}
            {creatingSubfolderId === node.id && (
              <form
                onSubmit={(e) => createSubfolder(e, node.id)}
                style={{ marginLeft: (depth + 1) * 12 + 10 }}
                className="pr-2"
              >
                <input
                  autoFocus
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  onBlur={() => {
                    if (!newSubfolderName.trim()) {
                      setCreatingSubfolderId(null);
                      setNewSubfolderName("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setCreatingSubfolderId(null);
                      setNewSubfolderName("");
                    }
                  }}
                  placeholder="Subfolder name…"
                  className="w-full text-[12px] px-2 py-1.5 rounded-lg outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(45,139,139,0.3)",
                    color: "var(--nous-primary)",
                  }}
                />
              </form>
            )}

            {/* Notes in this folder */}
            {folderNotes.map((n) => renderNote(n, depth + 1))}

            {folderNotes.length === 0 && node.children.length === 0 && creatingSubfolderId !== node.id && (
              <div
                className="py-2 text-[12px] text-center"
                style={{ color: "var(--nous-tertiary)", marginLeft: (depth + 1) * 12 }}
              >
                Empty
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const ungrouped = filteredNotes
    ? filteredNotes.filter((n) => !n.folderId)
    : notes.filter((n) => !n.folderId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${className}`}
      style={{ background: "var(--nous-surface)" }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2d8b8b 0%, #1d6b6b 100%)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 44 44" fill="none">
              <path
                d="M8 36V8L22 30V8M22 30V8L36 36"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            className="text-[14px] font-semibold tracking-tight"
            style={{ color: "var(--nous-primary)" }}
          >
            Notes
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--nous-secondary)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[13px] pl-9 pr-3 py-2 rounded-lg outline-none transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "var(--nous-primary)",
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => createNote()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
            style={{
              background: "rgba(45,139,139,0.08)",
              color: "var(--nous-accent)",
              border: "1px solid rgba(45,139,139,0.12)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(45,139,139,0.15)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(45,139,139,0.08)")
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Page
          </button>
          <button
            onClick={() => setCreatingFolder(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.03)",
              color: "var(--nous-secondary)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            title="New folder"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--nous-accent)";
              e.currentTarget.style.background = "rgba(45,139,139,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--nous-secondary)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* New folder inline form */}
      {creatingFolder && (
        <form onSubmit={createFolder} className="px-4 pb-3 shrink-0">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Escape" &&
              (setCreatingFolder(false), setNewFolderName(""))
            }
            placeholder="Folder name…"
            className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(45,139,139,0.3)",
              color: "var(--nous-primary)",
            }}
          />
        </form>
      )}

      <div
        className="mx-4 mb-1"
        style={{ height: 1, background: "rgba(255,255,255,0.04)" }}
      />

      {/* File tree */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 pb-4"
        style={{ scrollbarWidth: "none" }}
        onDragOver={(e) => {
          // Allow dropping on the empty space at the bottom (root level)
          if (!dragItem) return;
          // Only activate if not already over a specific folder
          if (dragOverId !== null && dragOverId !== "root") return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOverId("root");
        }}
        onDrop={(e) => {
          if (dragOverId === "root") {
            e.preventDefault();
            handleDrop(null);
          }
        }}
      >
        <div className="space-y-0.5">
          {/* Search results */}
          {filteredNotes && (
            <>
              <div
                className="px-2 pt-1 pb-2 text-[11px] font-medium"
                style={{ color: "var(--nous-secondary)" }}
              >
                {filteredNotes.length} result
                {filteredNotes.length !== 1 ? "s" : ""}
              </div>
              {filteredNotes.map((n) => renderNote(n))}
              {filteredNotes.length === 0 && (
                <p
                  className="text-[13px] px-2 py-6 text-center"
                  style={{ color: "var(--nous-secondary)" }}
                >
                  No notes found
                </p>
              )}
            </>
          )}

          {/* Normal tree */}
          {!filteredNotes && (
            <>
              {folderTree.length > 0 && (
                <div
                  className="px-2 pt-1 pb-2 text-[11px] font-medium"
                  style={{ color: "var(--nous-secondary)" }}
                >
                  Workspace
                </div>
              )}

              {folderTree.map((node) => renderFolderNode(node))}

              {(ungrouped.length > 0 || (dragItem !== null && dragOverId === "root")) && (
                <div
                  className="mt-2 rounded-lg transition-all duration-150"
                  style={{
                    outline: dragOverId === "root" ? "1px solid rgba(45,139,139,0.4)" : "none",
                    background: dragOverId === "root" ? "rgba(45,139,139,0.07)" : "transparent",
                    minHeight: dragItem ? 32 : undefined,
                  }}
                  onDragOver={(e) => {
                    if (!dragItem) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverId("root");
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverId((prev) => prev === "root" ? null : prev);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(null);
                  }}
                >
                  {folderTree.length > 0 && (
                    <div
                      className="px-2 pt-3 pb-2 text-[11px] font-medium"
                      style={{ color: "var(--nous-secondary)" }}
                    >
                      Pages
                    </div>
                  )}
                  {ungrouped.map((n) => renderNote(n))}
                  {dragOverId === "root" && ungrouped.length === 0 && (
                    <div
                      className="py-2 text-[12px] text-center"
                      style={{ color: "var(--nous-accent)" }}
                    >
                      Drop here to remove from folder
                    </div>
                  )}
                </div>
              )}

              {notes.length === 0 && folderTree.length === 0 && (
                <div className="py-12 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(45,139,139,0.08)" }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2d8b8b"
                      strokeWidth="1.5"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="12" x2="12" y2="18" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p
                    className="text-[13px] mb-1 font-medium"
                    style={{ color: "var(--nous-secondary)" }}
                  >
                    No notes yet
                  </p>
                  <p
                    className="text-[12px] mb-4"
                    style={{ color: "var(--nous-secondary)" }}
                  >
                    Create your first page to get started
                  </p>
                  <button
                    onClick={() => createNote()}
                    className="text-[12px] font-medium px-4 py-2 rounded-lg transition-all"
                    style={{
                      color: "var(--nous-accent)",
                      background: "rgba(45,139,139,0.1)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(45,139,139,0.18)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(45,139,139,0.1)")
                    }
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
      <div
        className="px-4 py-2.5 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <p className="text-[11px]" style={{ color: "var(--nous-secondary)" }}>
          {notes.length} page{notes.length !== 1 ? "s" : ""}
        </p>
        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ color: "#2e2e40" }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Synced
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl py-1.5 w-44"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            background: "var(--nous-card)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-1.5 text-[11px] truncate"
            style={{ color: "var(--nous-secondary)" }}
          >
            {contextMenu.name || "Untitled"}
          </div>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.05)",
              margin: "4px 8px",
            }}
          />

          {/* Open (notes only) */}
          {contextMenu.type === "note" && (
            <button
              onClick={() => {
                setOpenNoteId(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
              style={{ color: "var(--nous-primary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Open
            </button>
          )}

          {/* Rename */}
          <button
            onClick={() => {
              setRenamingId(contextMenu.id);
              setRenameValue(contextMenu.name);
              setContextMenu(null);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "var(--nous-primary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Rename
          </button>

          {/* New subfolder (folders only) */}
          {contextMenu.type === "folder" && (
            <button
              onClick={() => {
                setCreatingSubfolderId(contextMenu.id);
                setExpandedFolders((prev) => new Set([...prev, contextMenu.id]));
                setContextMenu(null);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
              style={{ color: "var(--nous-primary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              New subfolder
            </button>
          )}

          {/* Change color (folders only) */}
          {contextMenu.type === "folder" && (
            <button
              onClick={() => {
                setColorPickerId(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
              style={{ color: "var(--nous-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(45,139,139,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Change color
            </button>
          )}

          {/* Move to */}
          <button
            onClick={() => {
              setMovePicker({ type: contextMenu.type, id: contextMenu.id });
              setContextMenu(null);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "var(--nous-primary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Move to…
          </button>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.05)",
              margin: "4px 8px",
            }}
          />

          {/* Delete */}
          <button
            onClick={() => {
              setConfirmDelete({
                type: contextMenu.type,
                id: contextMenu.id,
                name: contextMenu.name,
              });
              setContextMenu(null);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
            style={{ color: "#f87171" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(248,113,113,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmModal
          message={
            confirmDelete.type === "folder"
              ? `Delete folder "${confirmDelete.name}" and all its notes? This cannot be undone.`
              : `Delete "${confirmDelete.name}"? This cannot be undone.`
          }
          onConfirm={confirmAndDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Move-to-folder picker */}
      {movePicker && (
        <MovePicker
          folders={folders}
          excludeIds={movePickerExcludeIds}
          onMove={handleMove}
          onCancel={() => setMovePicker(null)}
        />
      )}

      {/* Folder color picker */}
      {colorPickerId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setColorPickerId(null)} />
          <div
            className="relative rounded-2xl p-5 w-64"
            style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--nous-secondary)" }}>
              Folder color
            </p>
            <div className="grid grid-cols-4 gap-3">
              {FOLDER_COLORS.map((c) => {
                const folder = folders.find((f) => f.id === colorPickerId);
                const isActive = folder?.color === c;
                return (
                  <button
                    key={c}
                    onClick={() => changeFolderColor(colorPickerId, c)}
                    className="w-10 h-10 rounded-full transition-all hover:scale-110 relative"
                    style={{
                      background: c,
                      boxShadow: isActive ? `0 0 0 2px var(--nous-bg), 0 0 0 4px ${c}` : "none",
                      transform: isActive ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    {isActive && (
                      <svg className="absolute inset-0 m-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setColorPickerId(null)}
              className="mt-4 w-full py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: "var(--nous-card)", color: "var(--nous-secondary)", border: "1px solid var(--nous-border)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
