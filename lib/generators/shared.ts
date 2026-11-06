import { normalizeItemValue } from "@/lib/validation";
import type { WorkspaceDraft, WorkspaceItem } from "@/types/workspace";

/** Letters, numbers, dashes and underscores only; spaces become dashes. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // é → e
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 64);
  return cleaned || "workspace";
}

/** Local time as "YYYY-MM-DD HH:mm". */
export function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Make arbitrary text safe to sit on a single comment line. */
export function commentText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim();
}

/** "1. GitHub", or "1. Website" / "1. App" when there's no label. */
export function itemTitle(item: WorkspaceItem, index: number): string {
  const name = commentText(item.label) || (item.type === "url" ? "Website" : "App");
  return `${index + 1}. ${name}`;
}

/** The item's value, trimmed and unquoted — the same cleanup the editor does on blur. */
export function itemValue(item: WorkspaceItem): string {
  return normalizeItemValue(item.type, item.value);
}

/** Seconds to wait between items, or 0 for no delay. */
export function delaySeconds(draft: WorkspaceDraft): number {
  return draft.delayEnabled && draft.delaySeconds > 0 ? draft.delaySeconds : 0;
}

/**
 * Wrap a value in double quotes for bash. Inside double quotes, only \ " $ and `
 * are special, so we backslash-escape those. A leading ~ (home folder) does not
 * expand inside quotes, so for paths we turn it into $HOME.
 */
export function bashQuote(value: string, expandHome = false): string {
  let prefix = "";
  let rest = value;
  if (expandHome && (value === "~" || value.startsWith("~/"))) {
    prefix = "$HOME";
    rest = value.slice(1);
  }
  return `"${prefix}${rest.replace(/[\\"$`]/g, "\\$&")}"`;
}

/** Build a bash header shared by macOS and Linux scripts. */
export function bashHeader(draft: WorkspaceDraft, target: string, filename: string, now: Date): string[] {
  return [
    "#!/bin/bash",
    "# ==================================================",
    `#  Cosmic Workspace: ${commentText(draft.name)}`,
    `#  Target: ${target}`,
    `#  Generated: ${formatTimestamp(now)} by Cosmic Workspace Deployer`,
    "#",
    `#  First time only, make it runnable:  chmod +x ${filename}`,
    "# ==================================================",
    "",
  ];
}
