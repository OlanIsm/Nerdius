import { useSyncExternalStore } from "react";

type PreferenceKey = "nerdungeon.displayName" | "nerdungeon.summonSound" | "nerdungeon.reduceMotion";
const changed = "nerdungeon.preferencesChanged";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changed, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changed, listener);
  };
}

export function usePreference(key: PreferenceKey, fallback: string) {
  const value = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }, () => fallback);
  function save(next: string) {
    try { localStorage.setItem(key, next); }
    catch { throw new Error("Could not save settings. Allow browser storage and try again."); }
    window.dispatchEvent(new Event(changed));
  }
  return [value, save] as const;
}
