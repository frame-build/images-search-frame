"use client";

import { ThemeToggleButton3 } from "@/components/ui/skiper-ui/skiper4";
import { useThemeToggle } from "@/components/ui/skiper-ui/skiper26";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { isDark, toggleTheme } = useThemeToggle({
    variant: "circle",
    start: "top-right",
    blur: true,
  });

  return (
    <ThemeToggleButton3
      isDark={isDark}
      onClick={toggleTheme}
      className={cn("size-9 p-2", className)}
      aria-label="Toggle theme"
    />
  );
};

