export interface Favorites {
  drivers: string[];
  constructors: string[];
}

export const FAVORITES_KEY = "sepang-box-box:favorites";
export const FAVORITES_EVENT = "sepang-box-box:preferences";
export const EMPTY_FAVORITES: Favorites = { drivers: [], constructors: [] };
export const getServerFavorites = () => EMPTY_FAVORITES;

let cachedRaw: string | null = null;
let cachedFavorites: Favorites = EMPTY_FAVORITES;

export function readFavorites(): Favorites {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw === cachedRaw) return cachedFavorites;
    cachedRaw = raw;
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object") {
      cachedFavorites = EMPTY_FAVORITES;
      return cachedFavorites;
    }
    const record = value as { drivers?: unknown; constructors?: unknown };
    cachedFavorites = {
      drivers: Array.isArray(record.drivers) ? record.drivers.filter((id): id is string => typeof id === "string") : [],
      constructors: Array.isArray(record.constructors) ? record.constructors.filter((id): id is string => typeof id === "string") : [],
    };
    return cachedFavorites;
  } catch {
    cachedRaw = null;
    cachedFavorites = EMPTY_FAVORITES;
    return cachedFavorites;
  }
}

export function subscribeToFavorites(onChange: () => void) {
  window.addEventListener(FAVORITES_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writeFavorites(favorites: Favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    cachedRaw = localStorage.getItem(FAVORITES_KEY);
    cachedFavorites = favorites;
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  } catch {
    // Preferences are optional and must never block the app.
  }
}

export function toggleFavorite(favorites: Favorites, kind: "driver" | "constructor", id: string): Favorites {
  const key = kind === "driver" ? "drivers" : "constructors";
  const list = favorites[key];
  return {
    ...favorites,
    [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
  };
}
