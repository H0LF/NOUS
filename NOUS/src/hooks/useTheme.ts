import { useEffect } from "react";
import { useStore } from "@/store";
import { useSettings } from "./useSettings";

export function useTheme() {
  const { theme, setTheme } = useStore();
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

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await saveSettings({ ...settings, theme: newTheme });
  };

  return { theme, toggleTheme };
}
