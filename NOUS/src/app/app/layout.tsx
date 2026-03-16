"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useSettings();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-nous-bg">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulseGlow"
            style={{
              background: 'linear-gradient(135deg, #7c7aff, #5e5ce6)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 44 44" fill="none">
              <path d="M8 36V8L22 30V8M22 30V8L36 36" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <Spinner size="sm" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-nous-bg text-nous-primary">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      <Navbar />
    </div>
  );
}
