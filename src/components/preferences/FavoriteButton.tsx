"use client";

import { useSyncExternalStore } from "react";

const KEY = "sepang-box-box:favorites";
const EVENT = "sepang-box-box:preferences";

type Favorites = { drivers: string[]; constructors: string[] };

function readFavorites(): Favorites {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      drivers: Array.isArray(value.drivers) ? value.drivers : [],
      constructors: Array.isArray(value.constructors) ? value.constructors : [],
    };
  } catch {
    return { drivers: [], constructors: [] };
  }
}

export function FavoriteButton({
  id,
  kind,
  name,
}: {
  id: string;
  kind: "driver" | "constructor";
  name: string;
}) {
  const selected = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => {
      const favorites = readFavorites();
      return (kind === "driver" ? favorites.drivers : favorites.constructors).includes(id);
    },
    () => false,
  );

  function toggle() {
    const favorites = readFavorites();
    const list = kind === "driver" ? favorites.drivers : favorites.constructors;
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    const updated = kind === "driver"
      ? { ...favorites, drivers: next }
      : { ...favorites, constructors: next };
    try {
      localStorage.setItem(KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // Storage is optional; the app remains usable when it is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={selected}
      aria-label={`${selected ? "Remove" : "Add"} ${name} ${kind === "driver" ? "as a favorite driver" : "as a favorite constructor"}`}
      className="text-caption text-muted hover:text-ink underline underline-offset-4"
    >
      {selected ? "Following" : "Follow"}
    </button>
  );
}
