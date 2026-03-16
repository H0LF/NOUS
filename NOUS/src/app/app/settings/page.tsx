"use client";

import React from "react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { GeminiKeyInput } from "@/components/settings/GeminiKeyInput";
import { UserProfile } from "@/components/settings/UserProfile";
import { GamificationPanel } from "@/components/gamification/GamificationPanel";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full space-y-6 max-w-2xl mx-auto w-full p-4 overflow-y-auto custom-scrollbar">
      <h1 className="text-2xl font-bold text-nous-primary">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Account
        </h2>
        <UserProfile />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Progress
        </h2>
        <GamificationPanel />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Appearance
        </h2>
        <ThemeToggle />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-nous-secondary uppercase tracking-wider">
          Integration
        </h2>
        <GeminiKeyInput />
      </section>

      <div className="pt-8 text-center text-xs text-nous-secondary">
        <p>NOUS Productivity App © 2024</p>
        <p className="mt-1">v1.0.0</p>
      </div>
    </div>
  );
}
