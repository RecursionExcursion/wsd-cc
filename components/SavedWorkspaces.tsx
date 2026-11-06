"use client";

import { useRef, useState } from "react";
import { OS_LABELS, type Workspace } from "@/types/workspace";

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? `today ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function SavedWorkspaces({
  workspaces,
  hydrated,
  activeId,
  activeDirty,
  onNew,
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
  onImport,
  transferNotice,
}: {
  workspaces: Workspace[];
  /** False until the browser has loaded saved data; avoids flashing the empty state. */
  hydrated: boolean;
  activeId: string | null;
  activeDirty: boolean;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  /** Result of the last export/import. */
  transferNotice: { kind: "success" | "error"; text: string } | null;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Most recently updated first.
  const sorted = [...workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <aside className="glass flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-6" aria-labelledby="saved-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="saved-heading" className="font-display text-sm font-semibold tracking-widest text-accent">
          SAVED ORBITS
        </h2>
        <button type="button" className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={onNew}>
          <span aria-hidden="true">＋</span> New
        </button>
      </div>

      {!hydrated ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-accent/10" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-panel-border px-3 py-6 text-center text-sm text-muted">
          <span className="mb-1 block text-xl" aria-hidden="true">🌌</span>
          No saved workspaces yet. Build one in Mission Control and press <b>Save to Orbit</b>.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((ws) => {
            const active = ws.id === activeId;
            const confirming = ws.id === confirmingId;
            const updated = formatUpdated(ws.updatedAt);
            return (
              <li
                key={ws.id}
                className={`rounded-xl border p-3 transition ${
                  active
                    ? "border-accent bg-accent/10 shadow-[0_0_16px_-6px_var(--glow)]"
                    : "border-panel-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold" title={ws.name}>
                    {ws.name || "Untitled"}
                  </p>
                  {active && (
                    <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-accent">
                      {activeDirty ? "UNSAVED" : "EDITING"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {OS_LABELS[ws.os]} · {ws.items.length} {ws.items.length === 1 ? "item" : "items"}
                  {updated && ` · ${updated}`}
                </p>

                {confirming ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" role="alert">
                    <span className="text-danger">Delete for good?</span>
                    <button
                      type="button"
                      className="btn-ghost !border-danger !py-0.5 !text-xs text-danger"
                      onClick={() => {
                        setConfirmingId(null);
                        onDelete(ws.id);
                      }}
                    >
                      Yes, delete
                    </button>
                    <button type="button" className="btn-ghost !py-0.5 !text-xs" onClick={() => setConfirmingId(null)} autoFocus>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-0.5 !text-xs"
                      onClick={() => onEdit(ws.id)}
                      disabled={active}
                      aria-label={`Edit ${ws.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-0.5 !text-xs"
                      onClick={() => onDuplicate(ws.id)}
                      aria-label={`Duplicate ${ws.name}`}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-0.5 !text-xs hover:!border-danger hover:text-danger"
                      onClick={() => setConfirmingId(ws.id)}
                      aria-label={`Delete ${ws.name}`}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-panel-border pt-3">
        <button
          type="button"
          className="btn-ghost !px-2.5 !py-1 !text-xs"
          onClick={onExport}
          disabled={!hydrated || workspaces.length === 0}
          title="Download all saved workspaces as a JSON file"
        >
          ⬇ Export all
        </button>
        <button
          type="button"
          className="btn-ghost !px-2.5 !py-1 !text-xs"
          onClick={() => fileInput.current?.click()}
          disabled={!hydrated}
          title="Add workspaces from an exported JSON file"
        >
          ⬆ Import
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow picking the same file again later
            if (file) onImport(file);
          }}
        />
      </div>
      <p role="status" aria-live="polite" className="-mt-2 text-xs empty:hidden">
        {transferNotice && (
          <span className={transferNotice.kind === "error" ? "text-danger" : "text-accent-2"}>
            {transferNotice.text}
          </span>
        )}
      </p>

      <p className="text-xs leading-relaxed text-muted">
        Saved in this browser only (use Export to back up or move them). After editing, download the script again: files already on
        your computer don&apos;t update themselves.
      </p>
    </aside>
  );
}
