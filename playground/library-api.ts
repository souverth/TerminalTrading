// Client for the trading server's Pine script library (`/api/scripts`, see
// ~/code/trading/src/routes/scripts.ts). Shared by the script library dialog and the
// Pine editor side panel.
export const API_BASE = "http://localhost:3000";

export interface LibraryScript {
  id: string;
  name: string;
  description: string;
  category: string;
  source: string;
  thumbnail: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResult {
  ok: boolean;
  plots: string[];
  error?: string;
}

export type ApiError = Error & { body?: { check?: CheckResult } };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((body as { error?: string }).error ?? `HTTP ${res.status}`) as ApiError;
    err.body = body;
    throw err;
  }
  return body as T;
}

export interface ManifestEntry {
  name: string;
  script: string;
  enabled: boolean;
  category?: string;
}

/** Library scripts as entries of the workspace's Indicators dialog (listed, never auto-added). */
export function toManifest(scripts: LibraryScript[]): ManifestEntry[] {
  return scripts.map((s) => ({
    name: s.name,
    script: s.source,
    enabled: false,
    ...(s.category ? { category: s.category } : {}),
  }));
}

export async function loadManifest(): Promise<ManifestEntry[]> {
  try {
    return toManifest((await api<{ scripts: LibraryScript[] }>("/api/scripts")).scripts);
  } catch {
    return [];
  }
}

// A tiny change bus: the dialog and the editor both mutate the library; whoever changed it
// calls `notifyLibraryChange()` and everyone else (editor picker, Indicators manifest,
// the dialog's grid) re-reads it.
const listeners = new Set<() => void>();
export function onLibraryChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function notifyLibraryChange(): void {
  for (const cb of listeners) cb();
}
