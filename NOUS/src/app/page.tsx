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

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: '#0d0d12' }}>

      {/* ── Ambient orbs ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,122,255,0.12) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(48,196,141,0.07) 0%, transparent 65%)' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,122,255,0.05) 0%, transparent 65%)' }} />
      </div>

      {/* ── Subtle grid ── */}
      <div className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center gap-14 px-8 animate-fadeUp">

        {/* Logo mark */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative animate-float">
            <div
              className="w-[88px] h-[88px] rounded-[26px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #8b89ff 0%, #5e5ce6 50%, #3634c7 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1) inset, 0 24px 48px rgba(94,92,230,0.35), 0 8px 16px rgba(0,0,0,0.4)',
              }}
            >
              <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
                <path d="M8 36V8L22 30V8M22 30V8L36 36" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Glow reflection */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-14 h-5 rounded-full"
              style={{ background: 'radial-gradient(ellipse, rgba(124,122,255,0.25) 0%, transparent 70%)', filter: 'blur(8px)' }} />
          </div>

          <div className="text-center">
            <h1 className="text-[52px] font-bold tracking-tight"
              style={{ color: '#e8e8f0', letterSpacing: '-0.04em', lineHeight: 1 }}>
              NOUS
            </h1>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase mt-3"
              style={{ color: '#4a4a5e' }}>
              Intelligence · Organized
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-[280px] stagger">
          {['Calendar', 'Notes', 'Gym', 'Nutrition', 'AI'].map(f => (
            <span key={f} className="animate-fadeUp px-3.5 py-1.5 rounded-full text-[11px] font-medium"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#5a5a70',
              }}>
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 w-full max-w-[300px]">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 h-[52px] rounded-2xl font-semibold text-[15px] transition-all duration-200 active:scale-[0.97] hover:brightness-105"
            style={{
              background: 'rgba(255,255,255,0.94)',
              color: '#1a1a2e',
              boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-[11px] text-center leading-relaxed" style={{ color: '#3a3a50' }}>
            By continuing, you agree to our Terms of Service<br/>and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
