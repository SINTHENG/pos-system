"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center rounded-xl p-2 transition-all duration-200 cursor-pointer",
        "text-muted hover:text-foreground hover:bg-gray-100 dark:hover:bg-slate-800",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
      title={isDark ? "Switch to light mode" : "Switch to night mode"}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {/* Sun Icon (Night mode -> Light mode) */}
        <Sun
          size={19}
          className={cn(
            "text-amber-400 transition-all duration-300",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0 absolute"
          )}
        />
        {/* Moon Icon (Light mode -> Night mode) */}
        <Moon
          size={19}
          className={cn(
            "transition-all duration-300",
            isDark
              ? "rotate-90 scale-0 opacity-0 absolute"
              : "rotate-0 scale-100 opacity-100"
          )}
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isDark ? "Light mode" : "Night mode"}
        </span>
      )}
    </button>
  );
}
