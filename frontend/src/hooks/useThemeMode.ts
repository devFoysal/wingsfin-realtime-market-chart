import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

function initialThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage?.getItem?.("wingsfin-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    window.localStorage?.setItem?.("wingsfin-theme", themeMode);
  }, [themeMode]);

  return { themeMode, setThemeMode };
}
