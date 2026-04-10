import { useEffect } from "react";
import { useStore } from "@/store";
import { useSettings } from "./useSettings";

export function useTheme() {
  const { theme, setTheme } = useStore();
  // useSettings reads from the Zustand store (already loaded by layout) — no
  // extra Firestore call since getDocById is only fired on the first mount.
  const { saveSettings, settings } = useSettings();

  // Sync theme from settings when settings are loaded
  useEffect(() => {
    if (settings.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings.theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Apply accent color to CSS variables whenever it changes
  useEffect(() => {
    if (!settings.accentColor) return;
    const root = window.document.documentElement;
    root.style.setProperty("--nous-accent", settings.accentColor);
    root.style.setProperty("--nous-accent2", settings.accentColor);
    // Also set --nous-accent-rgb (R,G,B without alpha) for rgba() usage
    const hex = settings.accentColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    root.style.setProperty("--nous-accent-rgb", `${r},${g},${b}`);
  }, [settings.accentColor]);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await saveSettings({ ...settings, theme: newTheme });
  };

  return { theme, toggleTheme };
}
