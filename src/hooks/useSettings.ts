import { useEffect } from "react";
import { useStore } from "@/store";
import { useFirestore } from "./useFirestore";
import { UserSettings } from "@/types";

const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: "",
  theme: "dark",
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 250,
  dailyFatGoal: 65,
  gamificationEnabled: true,
  gamificationFeatures: {
    food: true,
    gym: true,
    calendar: true,
    notes: true,
  },
};

export function useSettings() {
  const { user, settings, setSettings } = useStore();
  const { getDocById, saveDoc } = useFirestore();

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const data = await getDocById("settings", "prefs");
      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data } as UserSettings);
      } else {
        // Init default settings
        await saveDoc("settings", "prefs", DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
      }
    };

    loadSettings();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    await saveDoc("settings", "prefs", newSettings);
  };

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const merged = { ...settings, ...partial };
    setSettings(merged);
    await saveDoc("settings", "prefs", merged);
  };

  return { settings, saveSettings, updateSettings };
}
