"use client";

import { useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "calm-daily-coach:theme";

type ThemeMode = "dark" | "light";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event("themechange"));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("themechange", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("themechange", callback);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => "dark");

  function handleClick() {
    if (theme === "dark") {
      const shouldSwitch = window.confirm(
        "Dark mode is the default because it is easier to read. Switch to light mode anyway?",
      );

      if (!shouldSwitch) {
        return;
      }
    }

    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  return (
    <button
      className="secondary-button theme-toggle"
      type="button"
      onClick={handleClick}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      data-theme={theme}
    >
      {theme === "dark" ? "Dark mode" : "Light mode"}
    </button>
  );
}