"use client";

import { useLayoutEffect } from "react";
import { THEME_KEY } from "@/lib/theme";

type Theme = "dark" | "light";

function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * The theme lives on <html data-theme="...">, which an inline script in
 * layout.tsx sets before first paint. The icon is chosen by CSS (dark: variant),
 * so this component needs no React state and never flashes the wrong icon.
 */
export default function ThemeToggle() {
  // Re-apply after React's dev-mode remount clears the attribute (no-op in production).
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", storedTheme());
  }, []);

  function toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next: Theme = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable: theme still changes for this visit */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dawn / deep space theme"
      title="Toggle theme"
      className="glass flex h-10 w-10 items-center justify-center !rounded-full text-accent transition hover:shadow-[0_0_18px_var(--glow)]"
    >
      {/* Sun: shown in dark mode (switch to dawn) */}
      <svg className="hidden dark:block" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Moon: shown in light mode (switch to deep space) */}
      <svg className="block dark:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
