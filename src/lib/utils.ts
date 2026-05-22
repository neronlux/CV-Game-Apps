import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local storage helpers (will be replaced by Capacitor Preferences in native builds)
const getLocalStorage = <T = unknown>(key: string): T | null =>
  JSON.parse(window.localStorage.getItem(key) || "null");
const setLocalStorage = (key: string, value: unknown): void =>
  window.localStorage.setItem(key, JSON.stringify(value));

export { getLocalStorage, setLocalStorage };
