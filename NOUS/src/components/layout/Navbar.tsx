"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  notes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  gym: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/>
      <path d="M6 20v-4"/><path d="M18 20v-4"/>
      <path d="M6 8V4"/><path d="M18 8V4"/>
      <path d="M3 12h18"/>
    </svg>
  ),
  food: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

const navItems = [
  { href: "/app/calendar", label: "Agenda",  icon: icons.calendar },
  { href: "/app/notes",    label: "Notas",   icon: icons.notes    },
  { href: "/app/gym",      label: "Gym",     icon: icons.gym      },
  { href: "/app/food",     label: "Food",    icon: icons.food     },
  { href: "/app/settings", label: "Perfil",  icon: icons.profile  },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-4 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-0.5 px-2 py-2 rounded-[26px]"
        style={{
          background: 'var(--nous-surface)',
          backdropFilter: 'saturate(180%) blur(28px)',
          WebkitBackdropFilter: 'saturate(180%) blur(28px)',
          border: '1px solid var(--nous-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(255,255,255,0.04) inset',
        }}
      >
        {navItems.map(({ href, label, icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-[20px] transition-all duration-200 min-w-[58px]"
              style={{
                background: active ? 'rgba(124,122,255,0.12)' : 'transparent',
              }}
            >
              <span
                className="w-1 h-1 rounded-full transition-opacity"
                style={{
                  background: 'var(--nous-accent)',
                  opacity: active ? 1 : 0,
                }}
              />
              <span style={{ color: active ? 'var(--nous-accent)' : 'var(--nous-secondary)' }}>
                {icon}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? 'var(--nous-accent)' : 'var(--nous-secondary)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
