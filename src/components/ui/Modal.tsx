import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md animate-slideUp overflow-hidden flex flex-col"
        style={{
          background: 'var(--nous-surface)',
          border: '1px solid var(--nous-border)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '92vh',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.03) inset',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div
            className="w-8 h-1 rounded-full"
            style={{ background: 'var(--nous-border)' }}
          />
        </div>

        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--nous-border)' }}
          >
            <h3
              className="text-[17px] font-bold"
              style={{
                color: 'var(--nous-primary)',
                fontFamily: 'var(--font-fraunces)',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150"
              style={{ color: 'var(--nous-secondary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--nous-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--nous-card)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--nous-secondary)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150"
            style={{
              color: 'var(--nous-secondary)',
              background: 'var(--nous-card)',
              border: '1px solid var(--nous-border)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        <div className="p-6 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
