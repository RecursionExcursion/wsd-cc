import type { WorkspaceDraft } from "@/types/workspace";
import { commentText, delaySeconds, formatTimestamp, itemTitle, itemValue } from "./shared";

/** Environment variables like %USERPROFILE% or %ProgramFiles(x86)%. */
const ENV_VAR = /%[A-Za-z_][A-Za-z0-9_()]*%/g;

/** In a .bat file a single % starts a variable, so a literal % must be written %%. */
export function escapePercent(text: string): string {
  return text.replace(/%/g, "%%");
}

/**
 * Escape a path for a .bat file. %VAR% references (e.g. %LOCALAPPDATA%) are kept
 * so Windows expands them; any other % is doubled. Double quotes can't appear in
 * Windows paths, so they're dropped.
 */
export function escapeBatchPath(path: string): string {
  const clean = path.replace(/"/g, "");
  let out = "";
  let last = 0;
  for (const match of clean.matchAll(ENV_VAR)) {
    out += escapePercent(clean.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return out + escapePercent(clean.slice(last));
}

/**
 * Escape a URL for a .bat file. A " would end the quoted string, so it's
 * percent-encoded as %22; then every % (including URL encodings like %20) is doubled.
 */
export function escapeBatchUrl(url: string): string {
  return escapePercent(url.replace(/"/g, "%22"));
}

/**
 * Comments (REM lines) still get some parsing by cmd, so strip characters that
 * could misbehave there. (Inside "quoted strings" & | < > ^ are already literal.)
 */
function remText(text: string): string {
  return commentText(text).replace(/[&|<>^%"]/g, "");
}

export function generateWindows(draft: WorkspaceDraft, now: Date): string {
  const delay = Math.ceil(delaySeconds(draft)); // timeout only takes whole seconds
  const lines = [
    "@echo off",
    "REM ==================================================",
    `REM  Cosmic Workspace: ${remText(draft.name)}`,
    "REM  Target: Windows",
    `REM  Generated: ${formatTimestamp(now)} by Cosmic Workspace Deployer`,
    "REM ==================================================",
    "",
    "REM Read this file as UTF-8 so paths with accents work",
    "chcp 65001 >nul",
    "",
  ];

  draft.items.forEach((item, index) => {
    const value = itemValue(item);
    const target = item.type === "url" ? escapeBatchUrl(value) : escapeBatchPath(value);
    lines.push(`REM ${remText(itemTitle(item, index))}`);
    // The empty "" is the window title; without it, start treats the first quoted arg as the title.
    lines.push(`start "" "${target}"`);
    if (delay > 0 && index < draft.items.length - 1) {
      lines.push(`timeout /t ${delay} /nobreak >nul`);
    }
    lines.push("");
  });

  lines.push("exit /b 0");
  return lines.join("\r\n") + "\r\n";
}
