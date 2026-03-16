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
        <div className="flex flex-col">
            <span className="font-medium text-nous-primary">Gemini API Key</span>
            <span className="text-xs text-nous-secondary">Required for AI features (Planner, Food Analysis)</span>
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
