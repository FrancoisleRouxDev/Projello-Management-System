export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const EVENT_NAME = "projello-theme-change";

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage unavailable; fall through to the OS preference
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // theme still applies for this session
  }
  window.dispatchEvent(new CustomEvent<Theme>(EVENT_NAME, { detail: theme }));
}

export function onThemeChange(handler: (theme: Theme) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<Theme>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
