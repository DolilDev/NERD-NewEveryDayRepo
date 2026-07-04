// Thin, defensive wrappers around localStorage so the editor can persist the
// document locally and survive reloads. All access is guarded — localStorage
// can be unavailable (SSR-like contexts) or throw (private mode / quota).

export function loadDocument(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveDocument(key: string, content: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, content);
  } catch {
    // Ignore: storage may be full or disabled. Persistence is best-effort.
  }
}
