# PLAN.md – Cosmic Workspace Deployer

## Overview

Build a Next.js web app that lets a user define a "workspace": a list of local executable paths and/or URLs. The app generates a downloadable script for the user's chosen operating system. Running that script opens every item on their computer: executables launch and URLs open in the default browser.

This is a starter project, run locally only (`npm run dev`). No backend, no database, no authentication. Vercel deployment may come later, so keep the app compatible with it (no server-only filesystem access).

## Tech Stack

- Next.js (latest stable, App Router, TypeScript)
- Tailwind CSS
- Browser localStorage for persistence
- No external backend or API

## Core Features

### 1. Workspace Editor

- Workspace name field (required).
- OS selector: Windows, macOS, Linux.
- List of items. Each item has:
  - Type: Executable/Path or URL
  - Value: the path or URL, typed or pasted manually by the user
  - Optional label (for display only)
- Add, remove, and reorder items (up/down buttons are fine; drag-and-drop optional).
- Optional delay between launches: a toggle plus a number input, 0 to 2 seconds, default 1 second. Applied between each item.
- Note: browsers cannot expose full local file paths, so do not use a file picker. Show a short helper hint explaining how to copy a file path on each OS (Windows: Shift + right-click > "Copy as path"; macOS: Option + right-click > "Copy as Pathname"; Linux: copy from file manager or terminal).

### 2. Validation

- URLs must start with http:// or https:// (offer to auto-prefix https:// if missing).
- Paths must be non-empty. Warn (do not block) if a path looks like the wrong OS format, e.g. a `C:\` path when macOS is selected.
- Workspace must have at least one item before generating.

### 3. Script Generation

Generate the script entirely client-side and trigger a download via a Blob.

**Windows (.bat)**

- `@echo off` at top.
- Executables: `start "" "C:\path\to\app.exe"`
- URLs: `start "" "https://example.com"` (opens default browser)
- Delay: `timeout /t N /nobreak >nul` (timeout uses whole seconds; round up any value above 0 to 1 or 2).
- Escape special characters such as `%` (double it to `%%`) and `&` inside quoted strings.
- File name: `<workspace-name>.bat`

**macOS (.command)**

- `#!/bin/bash` at top.
- Applications: `open "/Applications/App.app"`; other executables/files: `open "/path/to/file"`
- URLs: `open "https://example.com"`
- Delay: `sleep N`
- File name: `<workspace-name>.command` (double-clickable in Finder).
- Show instructions: run `chmod +x <file>` once in Terminal; first launch may require right-click > Open due to Gatekeeper.

**Linux (.sh)**

- `#!/bin/bash` at top.
- Executables: `"/path/to/app" &` followed by `disown` (or `nohup ... >/dev/null 2>&1 &`) so they don't block.
- URLs: `xdg-open "https://example.com" >/dev/null 2>&1 &`
- Delay: `sleep N`
- File name: `<workspace-name>.sh`
- Show instructions: `chmod +x <file>`, then run it.

General rules:

- Always wrap paths and URLs in double quotes; escape embedded double quotes.
- Sanitize the workspace name for the filename (letters, numbers, dashes, underscores).
- Add a comment header in each script with workspace name and generation date.
- Use LF line endings for macOS/Linux and CRLF for Windows.

### 4. Script Preview

- Show a read-only preview of the generated script before download, with a Copy button and a Download button.

### 5. Saved Workspaces (localStorage)

- Save each workspace to localStorage under a single key (e.g. `cosmic-workspaces`) as a JSON array.
- Each saved workspace: id (uuid), name, os, items, delayEnabled, delaySeconds, createdAt, updatedAt.
- Sidebar or list view showing saved workspaces with Edit, Duplicate, and Delete (with confirm).
- Editing loads it into the editor; saving updates it. User then re-downloads a new script file (the browser cannot modify files already on disk; note this in the UI).
- Export all workspaces to a JSON file and import from JSON (nice-to-have, lower priority).

## UI / Aesthetic: Space Theme

- Dark mode is the default: deep navy and black backgrounds, subtle animated or static starfield (CSS or a lightweight canvas; keep it performant and respect `prefers-reduced-motion`).
- Accent colors: glowing purple and cyan, with soft glow on buttons, focus rings, and cards.
- Cards with slightly translucent "glass" panels over the starfield.
- Light mode: a softer "dawn" palette (pale lavender/blue), same accents toned down.
- Theme toggle in the header; remember the choice in localStorage.
- Fonts: clean sans-serif for body; optionally a futuristic display font for headings (e.g. from next/font/google).
- Copy can lean playful: e.g. "Launch Workspace", "Mission Control", "Add to Orbit".
- Responsive layout; usable on desktop first.

## Suggested Structure

- `app/page.tsx` – main page (saved list + editor + preview)
- `components/` – WorkspaceEditor, ItemRow, OsSelector, DelayControl, ScriptPreview, SavedWorkspaces, ThemeToggle, Starfield
- `lib/generators/` – windows.ts, macos.ts, linux.ts, plus a shared index
- `lib/storage.ts` – localStorage read/write helpers (guard for SSR: only access window in client components)
- `lib/validation.ts`
- `types/workspace.ts`

## Build Phases

Work in phases and stop after each one so the user can test before continuing.

1. **Setup** – Create the Next.js + TypeScript + Tailwind project, base layout, theme toggle, and starfield background.
2. **Editor** – Workspace name, OS selector, add/remove/reorder items, delay control, validation.
3. **Generators** – Script generators for all three OSes, preview, copy, and download. Add simple unit tests for the generators if practical.
4. **Persistence** – Save, load, edit, duplicate, and delete workspaces in localStorage.
5. **Polish** – Run instructions per OS, path-copy hints, empty states, cosmic styling pass, optional JSON import/export.

## Out of Scope (for now)

- Passing arguments to executables
- Choosing a specific browser
- User accounts or cloud sync
- Deployment (local only for now; Vercel later)

## Notes for Claude Code

- The user is new to vibe coding: explain what you did at the end of each phase and how to run and test it.
- Keep dependencies minimal.
- Ask before making major decisions not covered here.
