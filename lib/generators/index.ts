import { OS_EXTENSIONS, type OS, type WorkspaceDraft } from "@/types/workspace";
import { generateLinux } from "./linux";
import { generateMacos } from "./macos";
import { sanitizeFileName } from "./shared";
import { generateWindows } from "./windows";

export interface GeneratedScript {
  os: OS;
  filename: string;
  content: string;
}

/** Turn a (valid) workspace into a ready-to-download script for its OS. */
export function generateScript(draft: WorkspaceDraft, now: Date = new Date()): GeneratedScript {
  const filename = `${sanitizeFileName(draft.name)}${OS_EXTENSIONS[draft.os]}`;
  const content =
    draft.os === "windows"
      ? generateWindows(draft, now)
      : draft.os === "macos"
        ? generateMacos(draft, filename, now)
        : generateLinux(draft, filename, now);
  return { os: draft.os, filename, content };
}

export { sanitizeFileName };
