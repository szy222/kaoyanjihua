function isStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorage<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures so the UI remains usable.
  }
}
