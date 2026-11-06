# Cosmic Workspace Deployer 🚀

Build a "workspace" — a list of apps, files, and websites — and download a script for
Windows, macOS, or Linux that opens all of them with one double-click.

Everything runs in your browser. There's no server, database, or account; saved
workspaces live in your browser's localStorage.

## Run it

```bash
npm install     # first time only
npm run dev
```

Then open http://localhost:3000.

## Use it

1. **Name** your workspace and pick the **target system** (Windows `.bat`, macOS `.command`, Linux `.sh`).
2. **Add items**: apps/files (paste their full path) or URLs. Reorder with ↑ ↓.
   Browsers can't read file paths for you, so the app shows how to copy one on each system.
3. Optionally **pause between launches** (0–2 seconds).
4. Press **🚀 Launch Workspace** to jump to the script preview, then **Copy** or **Download** it.
5. Follow the "How to run it" steps shown under the preview.
6. **💾 Save to Orbit** (or Ctrl/⌘+S) keeps the workspace in the sidebar to edit, duplicate, or delete later.
   After editing, download the script again — files already on your computer don't update.
7. **Export all / Import** in the sidebar moves your workspaces between browsers or computers as a JSON file.
   Importing never deletes anything: new workspaces are added, and an existing one is only replaced
   by a newer copy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app locally with live reload |
| `npm test` | Run the unit tests once (generators and storage) |
| `npm run test:watch` | Re-run tests as you edit |
| `npm run lint` | Check code style and common mistakes |
| `npm run build` | Production build (what Vercel would run) |

## Project layout

```
app/                 Page, layout, global styles, tab icon
components/          UI pieces (editor, item rows, preview, sidebar, theme toggle, starfield)
lib/generators/      Script generators: windows.ts, macos.ts, linux.ts (+ tests)
lib/storage.ts       Saving/loading workspaces in localStorage, import/export (+ tests)
lib/validation.ts    Checks for names, URLs, and paths
types/workspace.ts   The shape of a workspace
```

## Notes

- **Windows scripts** keep `%VARIABLES%` like `%LOCALAPPDATA%` working, double any other `%`,
  and switch the console to UTF-8 so paths with accents work.
- **macOS/Linux scripts** turn a leading `~` into `$HOME` (since `~` doesn't expand inside quotes).
- The app is static and Vercel-compatible: it never touches the server's file system.
