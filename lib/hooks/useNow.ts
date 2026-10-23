"use client";
import { useSyncExternalStore } from "react";

// One shared 1s ticker for every relative timestamp on the page.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Current time in ms, re-rendering every second. Returns null during SSR/hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => now, () => null);
}
