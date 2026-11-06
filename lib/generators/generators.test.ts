import { describe, expect, it } from "vitest";
import type { WorkspaceDraft, WorkspaceItem } from "@/types/workspace";
import { generateScript, sanitizeFileName } from "./index";
import { bashQuote } from "./shared";
import { escapeBatchPath, escapeBatchUrl } from "./windows";

// Fixed local time so the "Generated:" line is predictable.
const NOW = new Date(2026, 10, 5, 18, 30);

let nextId = 0;
const url = (value: string, label = ""): WorkspaceItem => ({ id: String(nextId++), type: "url", value, label });
const path = (value: string, label = ""): WorkspaceItem => ({ id: String(nextId++), type: "path", value, label });

function draft(overrides: Partial<WorkspaceDraft>): WorkspaceDraft {
  return { name: "Morning Launch", os: "windows", items: [], delayEnabled: true, delaySeconds: 1, ...overrides };
}

describe("sanitizeFileName", () => {
  it("turns spaces into dashes and drops other symbols", () => {
    expect(sanitizeFileName("  My Work: Space!! ")).toBe("My-Work-Space");
  });
  it("strips accents", () => {
    expect(sanitizeFileName("Café Déjà")).toBe("Cafe-Deja");
  });
  it("keeps underscores and dashes", () => {
    expect(sanitizeFileName("dev_setup-2")).toBe("dev_setup-2");
  });
  it("falls back when nothing usable is left", () => {
    expect(sanitizeFileName("🚀🚀")).toBe("workspace");
  });
});

describe("Windows (.bat)", () => {
  const ws = draft({
    os: "windows",
    items: [
      url("https://example.com/search?q=a%20b&x=1", "Search"),
      path('"C:\\Program Files\\App\\app.exe"', "My App"),
      path("%LOCALAPPDATA%\\Discord\\Update.exe"),
    ],
  });
  const { filename, content } = generateScript(ws, NOW);

  it("names the file after the workspace", () => {
    expect(filename).toBe("Morning-Launch.bat");
  });
  it("starts with @echo off and a header", () => {
    expect(content.startsWith("@echo off\r\n")).toBe(true);
    expect(content).toContain("REM  Cosmic Workspace: Morning Launch");
    expect(content).toContain("REM  Generated: 2026-11-05 18:30");
  });
  it("uses CRLF line endings only", () => {
    expect(content.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it('launches each item with start ""', () => {
    expect(content).toContain('start "" "https://example.com/search?q=a%%20b&x=1"');
    expect(content).toContain('start "" "C:\\Program Files\\App\\app.exe"');
  });
  it("keeps %VAR% environment variables in paths", () => {
    expect(content).toContain('start "" "%LOCALAPPDATA%\\Discord\\Update.exe"');
  });
  it("puts a delay between items but not after the last", () => {
    expect(content.match(/timeout \/t 1 \/nobreak >nul/g)).toHaveLength(2);
    expect(content.trimEnd().endsWith('Update.exe"\r\n\r\nexit /b 0')).toBe(true);
  });
  it("rounds fractional delays up to whole seconds", () => {
    const out = generateScript({ ...ws, delaySeconds: 0.5 }, NOW).content;
    expect(out).toContain("timeout /t 1 /nobreak >nul");
    const out2 = generateScript({ ...ws, delaySeconds: 1.5 }, NOW).content;
    expect(out2).toContain("timeout /t 2 /nobreak >nul");
  });
  it("omits delays when disabled or zero", () => {
    expect(generateScript({ ...ws, delayEnabled: false }, NOW).content).not.toContain("timeout");
    expect(generateScript({ ...ws, delaySeconds: 0 }, NOW).content).not.toContain("timeout");
  });
  it("strips risky characters from REM comments", () => {
    const out = generateScript(draft({ name: "A & B > C %PATH%", items: [url("https://a.com")] }), NOW).content;
    expect(out).toContain("REM  Cosmic Workspace: A  B  C PATH");
  });
});

describe("Windows escaping helpers", () => {
  it("doubles stray percent signs in paths", () => {
    expect(escapeBatchPath("C:\\100% Done\\a.exe")).toBe("C:\\100%% Done\\a.exe");
  });
  it("encodes quotes in URLs and doubles every percent", () => {
    expect(escapeBatchUrl('https://a.com/?q="hi"')).toBe("https://a.com/?q=%%22hi%%22");
  });
});

describe("macOS (.command)", () => {
  const ws = draft({
    os: "macos",
    delaySeconds: 1.5,
    items: [path("/Applications/Safari.app", "Safari"), url("https://github.com"), path("~/Documents/notes.txt")],
  });
  const { filename, content } = generateScript(ws, NOW);

  it("names the file .command", () => {
    expect(filename).toBe("Morning-Launch.command");
  });
  it("starts with a bash shebang and uses LF endings", () => {
    expect(content.startsWith("#!/bin/bash\n")).toBe(true);
    expect(content).not.toContain("\r");
  });
  it("opens apps, files and URLs with open", () => {
    expect(content).toContain('open "/Applications/Safari.app"');
    expect(content).toContain('open "https://github.com"');
  });
  it("expands ~ to $HOME (tilde doesn't work inside quotes)", () => {
    expect(content).toContain('open "$HOME/Documents/notes.txt"');
  });
  it("supports fractional sleeps between items only", () => {
    expect(content.match(/sleep 1\.5/g)).toHaveLength(2);
  });
  it("includes chmod instructions in the header", () => {
    expect(content).toContain("chmod +x Morning-Launch.command");
  });
});

describe("Linux (.sh)", () => {
  const ws = draft({
    os: "linux",
    items: [path("/usr/bin/firefox"), url("https://example.com")],
  });
  const { filename, content } = generateScript(ws, NOW);

  it("names the file .sh", () => {
    expect(filename).toBe("Morning-Launch.sh");
  });
  it("runs executables in the background with nohup", () => {
    expect(content).toContain('nohup "/usr/bin/firefox" >/dev/null 2>&1 &');
  });
  it("opens URLs with xdg-open in the background", () => {
    expect(content).toContain('xdg-open "https://example.com" >/dev/null 2>&1 &');
  });
  it("sleeps between items", () => {
    expect(content.match(/^sleep 1$/gm)).toHaveLength(1);
  });
});

describe("bashQuote", () => {
  it("escapes characters that are special inside double quotes", () => {
    expect(bashQuote('a"b$c`d\\e')).toBe('"a\\"b\\$c\\`d\\\\e"');
  });
  it("only expands ~ for paths, and only at the start", () => {
    expect(bashQuote("~/x", true)).toBe('"$HOME/x"');
    expect(bashQuote("~/x")).toBe('"~/x"');
    expect(bashQuote("/a/~b", true)).toBe('"/a/~b"');
  });
});
