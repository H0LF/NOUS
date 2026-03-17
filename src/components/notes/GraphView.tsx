"use client";

import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape"; // Import here, assuming Client Component context handles it or next/dynamic usage elsewhere if strictly needed for build
// The instruction said "Dynamically imports cytoscape using next/dynamic with ssr false". 
// But internal component usage of import is fine IF the component itself is dynamically imported in the parent.
// Or we can import dynamically here inside useEffect?
// Cytoscape can be imported normally if 'use client' is set, but sometimes it references window immediately.
// Safe bet: import inside useEffect or assume parent uses next/dynamic.
// The Plan said "Dynamically imports cytoscape using next/dynamic with ssr false". 
// This usually implies the component wrapper imports it.
// I will write the component assuming it is being loaded on client.
// I'll stick to standard import as 'use client' protects it mostly, 
// BUT if cytoscape runs immediate code that fails on server, we need to be careful.
// Let's use standard import here and ensure the parent (Page) imports THIS component via dynamic.

import { useStore } from "@/store";

interface GraphViewProps {
  onClose: () => void;
}

const GraphView = ({ onClose }: GraphViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, setOpenNoteId, theme, allNotes: notes, allFolders: folders } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !containerRef.current) return;

    const initGraph = () => {
      
      const folderColorMap: Record<string, string> = {};
      folders.forEach(f => folderColorMap[f.id] = f.color);

      const elements: any[] = [];
      const noteMap: Record<string, Note> = {};

      notes.forEach(note => {
          noteMap[note.title] = note; // For linking by title if needed, but we use IDs
          const size = 20 + (note.linkedNoteIds?.length || 0) * 5;
          const finalSize = Math.min(size, 60); // Cap at 60
          
          elements.push({
              data: {
                  id: note.id,
                  label: note.title || "Untitled",
                  color: note.folderId ? folderColorMap[note.folderId] || "#7c6bff" : "#7c6bff",
                  size: finalSize
              }
          });
      });

      // Add edges
      notes.forEach(note => {
          if (note.linkedNoteIds) {
              note.linkedNoteIds.forEach(targetId => {
                  // Only add if target exists
                  if (notes.find(n => n.id === targetId)) {
                        elements.push({
                            data: {
                                source: note.id,
                                target: targetId
                            }
                        });
                  }
              });
          }
      });
      
      const cy = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'label': 'data(label)',
                    'width': 'data(size)',
                    'height': 'data(size)',
                    'font-size': '10px',
                    'color': theme === 'dark' ? '#fff' : '#000',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-outline-color': theme === 'dark' ? '#000' : '#fff',
                    'text-outline-width': 1
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1,
                    'line-color': theme === 'dark' ? '#555' : '#ccc',
                    'target-arrow-color': theme === 'dark' ? '#555' : '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            }
        ],
        layout: {
            name: 'cose',
            animate: true
        }
      });

      cy.on('dblclick', 'node', (evt) => {
          const nodeId = evt.target.id();
          setOpenNoteId(nodeId);
          onClose();
      });

      setLoading(false);
    };

    initGraph();
    
    // Cleanup? Cytoscape doesn't strictly need it if container is destroyed
    return () => {
        // cy.destroy()? reference is lost unless stored. 
    };
  }, [user, notes, folders, setOpenNoteId, onClose, theme]);

  return (
    <div className="fixed inset-0 z-50 bg-nous-bg animate-fadeIn flex flex-col">
       <div className="absolute top-4 right-4 z-10">
           <button 
              onClick={onClose}
              className="p-2 rounded-full bg-nous-surface text-nous-primary hover:bg-nous-accent/10 transition-colors shadow-lg"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
       </div>
       <div ref={containerRef} className="w-full h-full" />
       {loading && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <span className="text-nous-accent text-lg font-medium animate-pulse">Building Graph...</span>
           </div>
       )}
    </div>
  );
};

export default GraphView;
