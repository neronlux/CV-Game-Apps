/**
 * @fileoverview Capacitor native bridge helpers
 * @module src/lib/capacitor
 *
 * Safe, graceful wrappers around Capacitor plugins.
 * Every function is a no-op when running in the browser (web / dev).
 */

import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const getPlatform = (): string => Capacitor.getPlatform();

// -----------------------------------------------------------------------------
// Haptics
// -----------------------------------------------------------------------------
export async function triggerImpact(style: "light" | "medium" | "heavy" = "medium") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch (e) {
    console.warn("Haptics impact failed:", e);
  }
}

export async function triggerNotification(type: "success" | "warning" | "error" = "success") {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await Haptics.notification({ type: map[type] });
  } catch (e) {
    console.warn("Haptics notification failed:", e);
  }
}

// -----------------------------------------------------------------------------
// Screen Orientation
// -----------------------------------------------------------------------------
export async function lockToLandscape() {
  if (!isNative()) return;
  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    await ScreenOrientation.lock({ orientation: "landscape" });
  } catch (e) {
    console.warn("ScreenOrientation lock failed:", e);
  }
}

export async function unlockOrientation() {
  if (!isNative()) return;
  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    await ScreenOrientation.unlock();
  } catch (e) {
    console.warn("ScreenOrientation unlock failed:", e);
  }
}

// -----------------------------------------------------------------------------
// Status Bar
// -----------------------------------------------------------------------------
export async function hideStatusBar() {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.hide();
  } catch (e) {
    console.warn("StatusBar hide failed:", e);
  }
}

export async function showStatusBar() {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.show();
  } catch (e) {
    console.warn("StatusBar show failed:", e);
  }
}

// -----------------------------------------------------------------------------
// Share
// -----------------------------------------------------------------------------
export async function shareText(title: string, text: string, url?: string) {
  if (!isNative()) {
    // Fallback for web: copy to clipboard + alert
    try {
      await navigator.clipboard.writeText(`${title}\n${text}${url ? `\n${url}` : ""}`);
      alert("Score copied to clipboard!");
    } catch {
      alert(`${title}\n${text}${url ? `\n${url}` : ""}`);
    }
    return;
  }
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title,
      text,
      url,
      dialogTitle: "Share your score",
    });
  } catch (e) {
    console.warn("Share failed:", e);
  }
}

// -----------------------------------------------------------------------------
// Preferences (replaces localStorage for native persistence)
// -----------------------------------------------------------------------------
export async function setPref(key: string, value: string) {
  if (!isNative()) {
    localStorage.setItem(key, value);
    return;
  }
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  } catch (e) {
    console.warn("Preferences set failed, falling back to localStorage:", e);
    localStorage.setItem(key, value);
  }
}

export async function getPref(key: string): Promise<string | null> {
  if (!isNative()) {
    return localStorage.getItem(key);
  }
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch (err) {
    console.warn("Preferences get failed, falling back to localStorage:", err);
    return localStorage.getItem(key);
  }
}

export async function removePref(key: string) {
  if (!isNative()) {
    localStorage.removeItem(key);
    return;
  }
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key });
  } catch {
    localStorage.removeItem(key);
  }
}

// -----------------------------------------------------------------------------
// Back Button (Android)
// -----------------------------------------------------------------------------
export async function registerBackButton(handler: () => void | boolean) {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", handler);
  } catch (e) {
    console.warn("Back button listener failed:", e);
  }
}
