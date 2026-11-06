import { useSyncExternalStore } from "react";
import { newId } from "@/lib/id";
import { clampDelay } from "@/lib/validation";
import {
  DELAY_DEFAULT,
  type OS,
  type Workspace,
  type WorkspaceDraft,
  type WorkspaceItem,
} from "@/types/workspace";

/** All saved workspaces live under this one localStorage key, as a JSON array. */
export const STORAGE_KEY = "cosmic-workspaces";

const EMPTY: Workspace[] = [];

/* ------------------------------------------------------------------ */
/* Pure helpers (no browser access; unit-tested)                       */
/* ------------------------------------------------------------------ */

const OSES: OS[] = ["windows", "macos", "linux"];

function toItem(raw: unknown): WorkspaceItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.value !== "string") return null;
  return {
    id: typeof o.id === "string" && o.id ? o.id : newId(),
    type: o.type === "url" ? "url" : "path",
    value: o.value,
    label: typeof o.label === "string" ? o.label : "",
  };
}

function toWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  const now = new Date(0).toISOString();
  return {
    id: o.id,
    name: o.name,
    os: OSES.includes(o.os as OS) ? (o.os as OS) : "windows",
    items: Array.isArray(o.items)
      ? o.items.map(toItem).filter((i): i is WorkspaceItem => i !== null)
      : [],
    delayEnabled: typeof o.delayEnabled === "boolean" ? o.delayEnabled : true,
    delaySeconds: typeof o.delaySeconds === "number" ? clampDelay(o.delaySeconds) : DELAY_DEFAULT,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}

function toWorkspaceList(data: unknown[]): Workspace[] {
  return data.map(toWorkspace).filter((w): w is Workspace => w !== null);
}

/** Parse stored JSON defensively: skip anything malformed instead of crashing. */
export function parseWorkspaces(raw: string | null): Workspace[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? toWorkspaceList(data) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/* ---------- Export / import (JSON files) ---------- */

export const EXPORT_APP = "cosmic-workspace-deployer";

/** The contents of an export file: a small wrapper so we can recognise our own files. */
export function serializeExport(list: Workspace[], now: string): string {
  return JSON.stringify({ app: EXPORT_APP, version: 1, exportedAt: now, workspaces: list }, null, 2) + "\n";
}

/**
 * Read an export file. Accepts our wrapper format or a bare array of workspaces.
 * Returns null when the file isn't something we understand.
 */
export function parseImport(text: string): Workspace[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (Array.isArray(data)) return toWorkspaceList(data);
  if (data && typeof data === "object" && Array.isArray((data as { workspaces?: unknown }).workspaces)) {
    return toWorkspaceList((data as { workspaces: unknown[] }).workspaces);
  }
  return null;
}

export interface MergeResult {
  list: Workspace[];
  added: number;
  updated: number;
  skipped: number;
}

/**
 * Merge imported workspaces into the saved list without losing anything:
 * new ones are added; ones with a matching id replace the saved copy only if the
 * imported copy is newer; otherwise they're skipped.
 */
export function mergeImported(existing: Workspace[], incoming: Workspace[]): MergeResult {
  let list = existing;
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const ws of incoming) {
    const match = list.find((w) => w.id === ws.id);
    if (!match) {
      list = [ws, ...list];
      added++;
    } else if (ws.updatedAt > match.updatedAt) {
      list = list.map((w) => (w.id === ws.id ? ws : w));
      updated++;
    } else {
      skipped++;
    }
  }
  return { list, added, updated, skipped };
}

/** Just the editable fields of a workspace, with copied items (safe to edit). */
export function draftOf(ws: WorkspaceDraft): WorkspaceDraft {
  return {
    name: ws.name,
    os: ws.os,
    items: ws.items.map((i) => ({ id: i.id, type: i.type, value: i.value, label: i.label })),
    delayEnabled: ws.delayEnabled,
    delaySeconds: ws.delaySeconds,
  };
}

/** True when two drafts have the same content (used to detect unsaved changes). */
export function sameDraft(a: WorkspaceDraft, b: WorkspaceDraft): boolean {
  return JSON.stringify(draftOf(a)) === JSON.stringify(draftOf(b));
}

/** Insert a new workspace (id = null) or update an existing one. */
export function upsertWorkspace(
  list: Workspace[],
  draft: WorkspaceDraft,
  id: string | null,
  now: string,
): { list: Workspace[]; saved: Workspace } {
  const existing = id ? list.find((w) => w.id === id) : undefined;
  if (existing) {
    const saved: Workspace = { ...existing, ...draftOf(draft), updatedAt: now };
    return { list: list.map((w) => (w.id === id ? saved : w)), saved };
  }
  const saved: Workspace = { id: newId(), ...draftOf(draft), createdAt: now, updatedAt: now };
  return { list: [saved, ...list], saved };
}

/** Copy a workspace (new ids everywhere) and place the copy right after the original. */
export function duplicateWorkspace(
  list: Workspace[],
  id: string,
  now: string,
): { list: Workspace[]; copy: Workspace | null } {
  const index = list.findIndex((w) => w.id === id);
  if (index === -1) return { list, copy: null };
  const original = list[index];
  const copy: Workspace = {
    ...draftOf(original),
    id: newId(),
    name: `${original.name} (copy)`,
    items: original.items.map((i) => ({ ...i, id: newId() })),
    createdAt: now,
    updatedAt: now,
  };
  return { list: [...list.slice(0, index + 1), copy, ...list.slice(index + 1)], copy };
}

export function removeWorkspace(list: Workspace[], id: string): Workspace[] {
  return list.filter((w) => w.id !== id);
}

/* ------------------------------------------------------------------ */
/* Browser store (only touches localStorage on the client)            */
/* ------------------------------------------------------------------ */

let cachedRaw: string | null | undefined;
let cachedList: Workspace[] = EMPTY;
const listeners = new Set<() => void>();

/** Current saved workspaces. Returns the same array until storage actually changes. */
export function readWorkspaces(): Workspace[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY; // storage blocked (e.g. strict privacy settings)
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseWorkspaces(raw);
  }
  return cachedList;
}

/** Save the whole list. Returns false if the browser refused (full or blocked storage). */
export function writeWorkspaces(list: Workspace[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    return false;
  }
  listeners.forEach((notify) => notify());
  return true;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab changed storage: refresh too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** React hook: saved workspaces, kept in sync with localStorage (empty during server render). */
export function useSavedWorkspaces(): Workspace[] {
  return useSyncExternalStore(subscribe, readWorkspaces, () => EMPTY);
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
