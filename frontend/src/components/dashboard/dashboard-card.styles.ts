export const DASHBOARD_CARD_HOVER =
  "transition-all duration-200 ease-out hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5";

// Breakpoint-based columns give more predictable card sizing on large desktops
// (and prevent auto-fill from creating too many narrow columns on ultrawide screens).
export const DASHBOARD_GRID_STATS =
  "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
export const DASHBOARD_GRID_QUOTA =
  "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
export const DASHBOARD_GRID_CHART =
  "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

export const DASHBOARD_CARD_ANIMATION = "animate-in fade-in duration-300";
export const DASHBOARD_CARD_STAGGER_MS = 50;
