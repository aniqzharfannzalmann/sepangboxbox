"use client";

import { useSyncExternalStore } from "react";
import { readFavorites, subscribeToFavorites, toggleFavorite, writeFavorites } from "@/lib/preferences/favorites";

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
      return subscribeToFavorites(onChange);
    },
    () => {
      const favorites = readFavorites();
      return (kind === "driver" ? favorites.drivers : favorites.constructors).includes(id);
    },
    () => false,
  );

  function toggle() {
    const favorites = readFavorites();
    writeFavorites(toggleFavorite(favorites, kind, id));
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
