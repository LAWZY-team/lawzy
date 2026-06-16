"use client";

import * as React from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * App uses fixed light theme (see root layout). Avoid next-themes inline script —
 * React 19 warns when <script> is rendered inside client component trees.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }, []);

  return <>{children}</>;
}
