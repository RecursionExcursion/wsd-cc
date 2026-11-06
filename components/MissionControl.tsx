"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SavedWorkspaces from "@/components/SavedWorkspaces";
import ScriptPreview from "@/components/ScriptPreview";
import WorkspaceEditor, { type EditorNotice } from "@/components/WorkspaceEditor";
import { downloadTextFile } from "@/lib/download";
import { generateScript } from "@/lib/generators";
import {
  draftOf,
  duplicateWorkspace,
  mergeImported,
  parseImport,
  readWorkspaces,
  removeWorkspace,
  sameDraft,
  serializeExport,
  upsertWorkspace,
  useHydrated,
  useSavedWorkspaces,
  writeWorkspaces,
} from "@/lib/storage";
import { validateWorkspace } from "@/lib/validation";
import { DELAY_DEFAULT, type WorkspaceDraft } from "@/types/workspace";

const EMPTY_DRAFT: WorkspaceDraft = {
  name: "",
  os: "windows",
  items: [],
  delayEnabled: true,
  delaySeconds: DELAY_DEFAULT,
};

const SAVE_FAILED: EditorNotice = {
  kind: "error",
  text: "Couldn't save: this browser's storage is full or blocked.",
};

/**
 * The whole app screen: saved workspaces on the left, the editor and live script
 * preview on the right. Owns the workspace currently being edited.
 */
export default function MissionControl() {
  const saved = useSavedWorkspaces();
  const hydrated = useHydrated();

  const [draft, setDraft] = useState<WorkspaceDraft>(EMPTY_DRAFT);
  /** Which saved workspace the editor holds (null = a new, unsaved one). */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Bumped whenever a different workspace is loaded, to reset the editor's error display. */
  const [session, setSession] = useState(0);
  const [notice, setNotice] = useState<EditorNotice | null>(null);
  const [transferNotice, setTransferNotice] = useState<EditorNotice | null>(null);
  const previewRef = useRef<HTMLElement>(null);

  // If the saved copy disappears (e.g. deleted in another tab), treat the editor as unsaved.
  const editing = editingId ? (saved.find((w) => w.id === editingId) ?? null) : null;
  const isDirty = !sameDraft(draft, editing ?? EMPTY_DRAFT);

  // Ask the browser to warn before closing/reloading the tab with unsaved work.
  // (An untouched new workspace doesn't count.)
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const check = useMemo(() => validateWorkspace(draft), [draft]);
  // The preview updates live as you type, once the workspace is valid.
  const script = useMemo(() => (check.isValid ? generateScript(draft) : null), [check.isValid, draft]);

  const placeholder =
    !draft.name.trim() && draft.items.length === 0
      ? "# Name your workspace and add an item to see its launch script here."
      : `# Almost there: fix ${check.errorCount === 1 ? "1 issue" : `${check.errorCount} issues`} above to generate the script.`;

  const changeDraft = (next: WorkspaceDraft) => {
    setDraft(next);
    setNotice(null);
  };

  const loadIntoEditor = (next: WorkspaceDraft, id: string | null) => {
    setDraft(next);
    setEditingId(id);
    setSession((s) => s + 1);
    setNotice(null);
  };

  const confirmDiscard = () =>
    !isDirty || window.confirm("You have unsaved changes in Mission Control. Discard them?");

  const showPreview = () => {
    const el = previewRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };

  const save = () => {
    const { list, saved: ws } = upsertWorkspace(readWorkspaces(), draft, editing?.id ?? null, new Date().toISOString());
    if (!writeWorkspaces(list)) return setNotice(SAVE_FAILED);
    setEditingId(ws.id);
    setNotice({
      kind: "success",
      text: editing
        ? "✓ Changes saved. Download the script again to use them."
        : "✓ Saved to orbit!",
    });
  };

  const edit = (id: string) => {
    const ws = saved.find((w) => w.id === id);
    if (!ws || !confirmDiscard()) return;
    loadIntoEditor(draftOf(ws), ws.id);
  };

  const startNew = () => {
    if (!confirmDiscard()) return;
    loadIntoEditor(EMPTY_DRAFT, null);
  };

  const duplicate = (id: string) => {
    const { list, copy } = duplicateWorkspace(readWorkspaces(), id, new Date().toISOString());
    if (!copy) return;
    if (!writeWorkspaces(list)) return setNotice(SAVE_FAILED);
    setNotice({ kind: "success", text: `✓ Created "${copy.name}".` });
  };

  const remove = (id: string) => {
    if (!writeWorkspaces(removeWorkspace(readWorkspaces(), id))) return setNotice(SAVE_FAILED);
    if (id === editing?.id) {
      // Keep what's in the editor, now as an unsaved workspace, so nothing is lost by surprise.
      setEditingId(null);
      setNotice({ kind: "success", text: "Deleted. The editor still holds it if you want to save it again." });
    }
  };

  const exportAll = () => {
    const list = readWorkspaces();
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    downloadTextFile(`cosmic-workspaces-${date}.json`, serializeExport(list, now.toISOString()));
    setTransferNotice({
      kind: "success",
      text: `✓ Exported ${list.length} ${list.length === 1 ? "workspace" : "workspaces"}.`,
    });
  };

  const importFile = async (file: File) => {
    if (file.size > 5_000_000) {
      return setTransferNotice({ kind: "error", text: "That file is too large to be a workspace export." });
    }
    const incoming = parseImport(await file.text());
    if (!incoming) {
      return setTransferNotice({ kind: "error", text: "That doesn't look like a Cosmic Workspace export file." });
    }
    if (incoming.length === 0) {
      return setTransferNotice({ kind: "error", text: "No workspaces found in that file." });
    }
    const { list, added, updated, skipped } = mergeImported(readWorkspaces(), incoming);
    if ((added || updated) && !writeWorkspaces(list)) return setTransferNotice(SAVE_FAILED);
    const parts = [
      added && `${added} added`,
      updated && `${updated} updated`,
      skipped && `${skipped} already up to date`,
    ].filter(Boolean);
    setTransferNotice({ kind: "success", text: `✓ Import done: ${parts.join(", ")}.` });
  };

  const status = editing
    ? isDirty
      ? "Editing a saved workspace · unsaved changes"
      : "Editing a saved workspace"
    : "New workspace · not saved yet";

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <SavedWorkspaces
        workspaces={saved}
        hydrated={hydrated}
        activeId={editing?.id ?? null}
        activeDirty={isDirty}
        onNew={startNew}
        onEdit={edit}
        onDuplicate={duplicate}
        onDelete={remove}
        onExport={exportAll}
        onImport={importFile}
        transferNotice={transferNotice}
      />

      <div className="flex min-w-0 flex-col gap-6">
        <section className="glass p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">Mission Control</h1>
            <span className="text-xs text-muted">
              {isDirty && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-warn align-middle" aria-hidden="true" />}
              {status}
            </span>
          </div>
          <p className="mt-2 mb-6 max-w-prose text-muted">
            Gather your apps and links into one workspace, then download a script that launches
            everything with a single double-click.
          </p>
          <WorkspaceEditor
            key={session}
            draft={draft}
            onChange={changeDraft}
            onLaunch={showPreview}
            onSave={save}
            saveLabel={editing ? (isDirty ? "Save changes" : "Saved") : "Save to Orbit"}
            saveDisabled={Boolean(editing) && !isDirty}
            notice={notice}
          />
        </section>

        <ScriptPreview ref={previewRef} script={script} placeholder={placeholder} />
      </div>
    </div>
  );
}
