"use client";

import { useSyncExternalStore } from "react";

const KEY = "sepang-box-box:low-data";
const EVENT = "sepang-box-box:preferences";

function readLowData() {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function LowDataToggle() {
  const enabled = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readLowData,
    () => false,
  );

  function toggle() {
    const next = !enabled;
    try {
      localStorage.setItem(KEY, String(next));
      document.documentElement.dataset.lowData = String(next);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // Optional preference; do not block the race-weekend experience.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className="text-caption text-muted hover:text-ink underline underline-offset-4"
    >
      Low-data mode: {enabled ? "On" : "Off"}
    </button>
  );
}
