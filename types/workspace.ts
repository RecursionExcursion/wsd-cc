export type OS = "windows" | "macos" | "linux";

/** "path" = an executable, app bundle, or file on disk. "url" = a web link. */
export type ItemType = "path" | "url";

export interface WorkspaceItem {
  id: string;
  type: ItemType;
  value: string;
  /** Optional display name; not used in the generated script except as a comment. */
  label: string;
}

/** Everything the editor edits. */
export interface WorkspaceDraft {
  name: string;
  os: OS;
  items: WorkspaceItem[];
  delayEnabled: boolean;
  /** 0–2 seconds, applied between each item. */
  delaySeconds: number;
}

/** A workspace as stored in localStorage (Phase 4). */
export interface Workspace extends WorkspaceDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const DELAY_MIN = 0;
export const DELAY_MAX = 2;
export const DELAY_DEFAULT = 1;

export const OS_LABELS: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export const OS_EXTENSIONS: Record<OS, string> = {
  windows: ".bat",
  macos: ".command",
  linux: ".sh",
};
