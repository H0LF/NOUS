import React, { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export const GeminiKeyInput = () => {
  const { settings, updateSettings } = useSettings();
  const [key, setKey] = useState("");

  useEffect(() => {
    if (settings?.geminiApiKey) {
        setKey(settings.geminiApiKey);
    }
  }, [settings]);

  const handleSave = async () => {
    // Save to Firestore via hook
    await updateSettings({ geminiApiKey: key });
    toast.success("API Key saved");
  };

  return (
    <div className="p-4 bg-nous-surface/30 border border-nous-border rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-nous-primary">Gemini API Key</span>
          <span className="text-xs text-nous-secondary">Required for AI features (Planner, Food Analysis)</span>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
          style={{
            color: "var(--nous-accent)",
            background: "rgba(124,122,255,0.08)",
            border: "1px solid rgba(124,122,255,0.2)",
            textDecoration: "none",
          }}
        >
          Get key
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter your Gemini API Key"
          className="flex-1"
        />
        <Button onClick={handleSave} size="sm">
          Save
        </Button>
      </div>
      <p className="text-[10px] text-nous-secondary">
        Your key is stored securely in your private database document.
      </p>
    </div>
  );
};
