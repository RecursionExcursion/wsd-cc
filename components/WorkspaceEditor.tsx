"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import DelayControl from "@/components/DelayControl";
import ItemRow from "@/components/ItemRow";
import OsSelector from "@/components/OsSelector";
import PathHint from "@/components/PathHint";
import { newId } from "@/lib/id";
import { normalizeItemValue, validateWorkspace } from "@/lib/validation";
import type { ItemType, WorkspaceDraft, WorkspaceItem } from "@/types/workspace";

export interface EditorNotice {
  kind: "success" | "error";
  text: string;
}

export default function WorkspaceEditor({
  draft,
  onChange,
  onLaunch,
  onSave,
  saveLabel,
  saveDisabled,
  notice,
}: {
  draft: WorkspaceDraft;
  onChange: (draft: WorkspaceDraft) => void;
  /** Called when the user hits Launch and everything is valid. */
  onLaunch: () => void;
  /** Called when the user hits Save and the workspace has a name. */
  onSave: () => void;
  saveLabel: string;
  saveDisabled: boolean;
  /** Result of the last save, shown next to the buttons. */
  notice: EditorNotice | null;
}) {
  // Fields the user has left at least once; errors only show for these (or after a launch attempt).
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [attempted, setAttempted] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const check = useMemo(() => validateWorkspace(draft), [draft]);
  const shows = (key: string) => attempted || touched.has(key);
  const touch = (key: string) => setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  const update = (patch: Partial<WorkspaceDraft>) => onChange({ ...draft, ...patch });

  const updateItem = (id: string, patch: Partial<WorkspaceItem>) =>
    update({ items: draft.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });

  const addItem = (type: ItemType) => {
    const id = newId();
    update({ items: [...draft.items, { id, type, value: "", label: "" }] });
    setJustAdded(id);
  };

  const removeItem = (id: string) => update({ items: draft.items.filter((it) => it.id !== id) });

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    [items[index], items[target]] = [items[target], items[index]];
    update({ items });
  };

  const launch = () => {
    setAttempted(true);
    if (check.isValid) onLaunch();
  };

  // Saving only needs a name, so half-finished workspaces can be kept.
  const save = () => {
    if (check.nameError) {
      touch("name");
      document.getElementById("ws-name")?.focus();
      return;
    }
    onSave();
  };

  // Ctrl+S (Windows/Linux) or Cmd+S (macOS) saves instead of "Save page as…".
  const onSaveShortcut = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!saveDisabled) save();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onSaveShortcut(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const nameError = shows("name") ? check.nameError : undefined;
  const itemsError = attempted ? check.itemsError : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Name */}
      <div>
        <label htmlFor="ws-name" className="mb-2 block text-sm font-medium">
          Workspace name <span className="text-danger">*</span>
        </label>
        <input
          id="ws-name"
          type="text"
          value={draft.name}
          placeholder="e.g. Morning Launch"
          onChange={(e) => update({ name: e.target.value })}
          onBlur={() => touch("name")}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "ws-name-error" : undefined}
          className="field"
          autoComplete="off"
        />
        {nameError && (
          <p id="ws-name-error" className="mt-1.5 text-xs text-danger">
            ✕ {nameError}
          </p>
        )}
      </div>

      <OsSelector value={draft.os} onChange={(os) => update({ os })} />

      {/* Items */}
      <section aria-labelledby="items-heading">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="items-heading" className="text-sm font-medium">
            Items in orbit{" "}
            <span className="text-muted">({draft.items.length})</span>
          </h2>
        </div>

        {draft.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-panel-border px-4 py-8 text-center">
            <p className="text-2xl" aria-hidden="true">🛰️</p>
            <p className="mt-2 text-sm text-muted">
              Nothing in orbit yet. Add an app or a website to get started.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {draft.items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                total={draft.items.length}
                os={draft.os}
                check={check.items[item.id] ?? {}}
                showError={shows(item.id)}
                focusOnMount={item.id === justAdded}
                onChange={(patch) => updateItem(item.id, patch)}
                onBlurValue={() => {
                  const normalized = normalizeItemValue(item.type, item.value);
                  if (normalized !== item.value) updateItem(item.id, { value: normalized });
                  touch(item.id);
                }}
                onMove={(dir) => moveItem(index, dir)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ol>
        )}

        {itemsError && <p className="mt-2 text-xs text-danger">✕ {itemsError}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => addItem("path")}>
            <span aria-hidden="true">＋</span> Add app / path
          </button>
          <button type="button" className="btn-ghost" onClick={() => addItem("url")}>
            <span aria-hidden="true">＋</span> Add URL
          </button>
        </div>

        <div className="mt-3">
          <PathHint os={draft.os} />
        </div>
      </section>

      <DelayControl
        enabled={draft.delayEnabled}
        seconds={draft.delaySeconds}
        os={draft.os}
        onEnabledChange={(delayEnabled) => update({ delayEnabled })}
        onSecondsChange={(delaySeconds) => update({ delaySeconds })}
      />

      {/* Launch */}
      <div className="flex flex-wrap items-center gap-3 border-t border-panel-border pt-5">
        <button type="button" className="btn-glow" onClick={launch}>
          🚀 Launch Workspace
        </button>
        <button
          type="button"
          className="btn-ghost !py-2"
          onClick={save}
          disabled={saveDisabled}
          title="Save (Ctrl+S / ⌘S)"
          aria-keyshortcuts="Control+S Meta+S"
        >
          💾 {saveLabel}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {notice ? (
            <span className={notice.kind === "error" ? "text-danger" : "text-accent-2"}>{notice.text}</span>
          ) : attempted && !check.isValid && (
            <span className="text-danger">
              {check.errorCount === 1 ? "1 issue needs" : `${check.errorCount} issues need`} fixing before launch.
            </span>
          )}
          {!notice && check.isValid && check.warningCount > 0 && (
            <span className="text-warn">
              {check.warningCount === 1 ? "1 warning" : `${check.warningCount} warnings`}. You can still launch.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
