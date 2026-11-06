import {
  DELAY_MAX,
  DELAY_MIN,
  OS_LABELS,
  type ItemType,
  type OS,
  type WorkspaceDraft,
  type WorkspaceItem,
} from "@/types/workspace";

/** Result of checking one item. `error` blocks generation; `warning` does not. */
export interface ItemCheck {
  error?: string;
  warning?: string;
  /** A one-click fix the UI can offer, e.g. adding https://. */
  fix?: { label: string; value: string };
}

export interface WorkspaceCheck {
  nameError?: string;
  itemsError?: string;
  items: Record<string, ItemCheck>;
  errorCount: number;
  warningCount: number;
  isValid: boolean;
}

const HTTP_URL = /^https?:\/\/\S+$/i;
const BARE_HTTP = /^https?:\/\/$/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WINDOWS_PATH = /^(?:[a-z]:[\\/]|\\\\)/i;

/** Strip one pair of wrapping quotes (Windows "Copy as path" adds them). */
function unquote(value: string): string {
  const m = value.match(/^(["'])(.*)\1$/);
  return m ? m[2] : value;
}

/** Tidy a value when the user leaves the field: trim, and unquote paths. */
export function normalizeItemValue(type: ItemType, value: string): string {
  const trimmed = value.trim();
  return type === "path" ? unquote(trimmed).trim() : trimmed;
}

export function checkUrl(raw: string): ItemCheck {
  const value = raw.trim();
  if (!value) return { error: "Enter a URL." };
  if (/\s/.test(value)) return { error: "URLs can't contain spaces." };
  if (HTTP_URL.test(value)) return {};
  if (BARE_HTTP.test(value)) return { error: "Add the rest of the address after the //." };
  // Has a scheme, but not http(s) (e.g. ftp:, file:, mailto:) — or "localhost:3000" style.
  if (ANY_SCHEME.test(value) && !/^[\w.-]+:\d+/.test(value)) {
    return { error: "Only http:// and https:// links are supported." };
  }
  return {
    error: "URLs must start with http:// or https://.",
    fix: { label: "Add https://", value: `https://${value.replace(/^\/+/, "")}` },
  };
}

export function checkPath(raw: string, os: OS): ItemCheck {
  const value = unquote(raw.trim()).trim();
  if (!value) return { error: "Enter a path." };

  if (os === "windows" && (value.startsWith("/") || value.startsWith("~"))) {
    return { warning: "This looks like a macOS/Linux path, but Windows is selected." };
  }
  if (os !== "windows" && WINDOWS_PATH.test(value)) {
    return { warning: `This looks like a Windows path, but ${OS_LABELS[os]} is selected.` };
  }
  if (os === "linux" && (value.startsWith("/Applications/") || /\.app\/?$/i.test(value))) {
    return { warning: "This looks like a macOS app, but Linux is selected." };
  }
  return {};
}

export function checkItem(item: WorkspaceItem, os: OS): ItemCheck {
  return item.type === "url" ? checkUrl(item.value) : checkPath(item.value, os);
}

export function clampDelay(seconds: number): number {
  if (!Number.isFinite(seconds)) return DELAY_MIN;
  const clamped = Math.min(DELAY_MAX, Math.max(DELAY_MIN, seconds));
  return Math.round(clamped * 10) / 10;
}

export function validateWorkspace(draft: WorkspaceDraft): WorkspaceCheck {
  const nameError = draft.name.trim() ? undefined : "Give your workspace a name.";
  const itemsError =
    draft.items.length === 0 ? "Add at least one app or URL to launch." : undefined;

  const items: Record<string, ItemCheck> = {};
  let errorCount = (nameError ? 1 : 0) + (itemsError ? 1 : 0);
  let warningCount = 0;

  for (const item of draft.items) {
    const result = checkItem(item, draft.os);
    items[item.id] = result;
    if (result.error) errorCount++;
    if (result.warning) warningCount++;
  }

  return { nameError, itemsError, items, errorCount, warningCount, isValid: errorCount === 0 };
}
