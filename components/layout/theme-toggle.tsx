"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { buttonClass } from "@/components/ui/button";

/**
 * Reflects and toggles the `.dark` class on <html>, persisting to localStorage.
 * State is read via useSyncExternalStore so it stays in sync with the DOM (set
 * by the no-flash script in the root layout) without a setState-in-effect.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    /* ignore storage failures (private mode) */
  }
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    isDark,
    () => false, // server snapshot: assume light
  );

  return (
    <button
      type="button"
      onClick={() => setDark(!isDark())}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={buttonClass("ghost", "icon")}
    >
      {dark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
