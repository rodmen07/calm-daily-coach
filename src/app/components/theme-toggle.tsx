"use client";

import { useState } from "react";
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
  const [pendingLightMode, setPendingLightMode] = useState(false);

  function handleClick() {
    if (theme === "dark" && !pendingLightMode) {
      setPendingLightMode(true);
      return;
    }

    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setPendingLightMode(false);
  }

  function cancelLightMode() {
    setPendingLightMode(false);
  }

  return (
    <div className="theme-toggle-shell">
      <button
        className="secondary-button theme-toggle"
        type="button"
        onClick={handleClick}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={theme === "dark"}
        aria-expanded={theme === "dark" ? pendingLightMode : undefined}
        data-theme={theme}
      >
        {theme === "dark" ? (pendingLightMode ? "Confirm light mode" : "Dark mode") : "Light mode"}
      </button>

      {theme === "dark" && pendingLightMode ? (
        <div className="theme-toggle-confirmation" role="status" aria-live="polite">
          <p>Dark mode is the default because it is easier to read. Switch to light mode anyway?</p>
          <div className="theme-toggle-actions">
            <button className="secondary-button" type="button" onClick={cancelLightMode}>
              Keep dark mode
            </button>
            <button className="primary-button" type="button" onClick={handleClick}>
              Use light mode
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}