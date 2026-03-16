import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { Toggle } from "@/components/ui/Toggle";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 bg-nous-surface/30 border border-nous-border rounded-xl">
        <div className="flex flex-col">
            <span className="font-medium text-nous-primary">Dark Mode</span>
            <span className="text-xs text-nous-secondary">Switch between light and dark themes</span>
        </div>
        <Toggle 
            checked={theme === "dark"} 
            onChange={toggleTheme} 
        />
    </div>
  );
};
