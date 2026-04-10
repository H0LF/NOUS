"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { signInWithGoogle, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user) router.push("/app/calendar");
  }, [user, router]);

  // Keep body background in sync so there's no white gap behind the page div
  React.useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#111417';
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#111417',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* Subtle top divider */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'rgba(148,168,188,0.12)' }}
      />

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '56px', paddingLeft: '32px', paddingRight: '32px', maxWidth: '384px', width: '100%' }}>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-5 animate-fadeUp">
          <div className="text-center">
            <h1
              style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: 'clamp(80px, 20vw, 108px)',
                fontWeight: 800,
                letterSpacing: '-0.06em',
                lineHeight: 0.9,
                color: '#dde4ec',
              }}
            >
              NOUS
            </h1>
            <div
              className="h-px w-full mt-6"
              style={{ background: 'rgba(148,168,188,0.15)' }}
            />
            <p
              className="mt-4 text-[11px] font-medium tracking-[0.25em] uppercase"
              style={{ color: '#4a5a6a', fontFamily: 'var(--font-outfit)' }}
            >
              intelligence · organized
            </p>
          </div>
        </div>

        {/* Feature labels */}
        <div
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 animate-fadeUp"
          style={{ animationDelay: '120ms' }}
        >
          {['Calendar', 'Notes', 'Gym', 'Nutrition', 'AI'].map((f) => (
            <span
              key={f}
              className="text-[10px] font-medium tracking-wider uppercase"
              style={{ color: '#2e3840', fontFamily: 'var(--font-ibm-plex-mono)' }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-4 w-full animate-fadeUp"
          style={{ animationDelay: '220ms' }}
        >
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 h-[50px] rounded-xl font-medium text-[14px] transition-all duration-200 active:scale-[0.98] hover:brightness-110"
            style={{
              background: 'var(--nous-accent)',
              color: '#ffffff',
              boxShadow: '0 2px 20px rgba(var(--nous-accent-rgb),0.3)',
              fontFamily: 'var(--font-outfit)',
              letterSpacing: '-0.01em',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p
            className="text-[10px] text-center leading-relaxed"
            style={{ color: '#283038', fontFamily: 'var(--font-outfit)' }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Subtle bottom divider */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'rgba(148,168,188,0.06)' }}
      />
    </div>
  );
}
