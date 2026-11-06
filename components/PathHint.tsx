import { OS_LABELS, type OS } from "@/types/workspace";

const HINTS: Record<OS, React.ReactNode> = {
  windows: (
    <>
      In File Explorer, hold <Kbd>Shift</Kbd> and right-click the file, then choose{" "}
      <b>Copy as path</b>. The surrounding quotes are removed automatically.
    </>
  ),
  macos: (
    <>
      In Finder, right-click the app or file, hold <Kbd>Option</Kbd>, then choose{" "}
      <b>Copy &ldquo;…&rdquo; as Pathname</b>. Apps live in <code>/Applications</code>.
    </>
  ),
  linux: (
    <>
      Copy the location from your file manager (often <Kbd>Ctrl</Kbd>+<Kbd>L</Kbd> shows it), or run{" "}
      <code>which app-name</code> in a terminal.
    </>
  ),
};

/** Browsers can't reveal full local paths, so we explain how to copy one instead. */
export default function PathHint({ os }: { os: OS }) {
  return (
    <p className="rounded-lg border border-dashed border-panel-border px-3 py-2 text-xs leading-relaxed text-muted">
      <span className="font-semibold text-accent-2">Copying a path on {OS_LABELS[os]}: </span>
      {HINTS[os]}
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-panel-border px-1 font-mono text-[0.7rem] text-fg">
      {children}
    </kbd>
  );
}
