"use client";

import { useEffect, useRef, useState } from "react";
import { copyText, downloadTextFile } from "@/lib/download";
import type { GeneratedScript } from "@/lib/generators";
import type { OS } from "@/types/workspace";

type CopyState = "idle" | "copied" | "failed";

export default function ScriptPreview({
  script,
  placeholder,
  ref,
}: {
  script: GeneratedScript | null;
  /** Shown instead of a script when the workspace isn't valid yet. */
  placeholder: string;
  ref?: React.Ref<HTMLElement>;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  // The exact script object that was downloaded. Once the workspace changes, a new
  // object is generated, so the "Downloaded" note disappears on its own.
  const [downloaded, setDownloaded] = useState<GeneratedScript | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (state: CopyState) => {
    setCopyState(state);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  const copy = async () => {
    if (script) flash((await copyText(script.content)) ? "copied" : "failed");
  };

  const download = () => {
    if (!script) return;
    downloadTextFile(script.filename, script.content);
    setDownloaded(script);
  };

  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="preview-heading" className="glass p-5 outline-none sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="preview-heading" className="font-display text-sm font-semibold tracking-widest text-accent-2">
          LAUNCH SEQUENCE
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ghost" onClick={copy} disabled={!script}>
            {copyState === "copied" ? "✓ Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
          </button>
          <button type="button" className="btn-glow !py-1.5 text-sm" onClick={download} disabled={!script}>
            ⬇ Download {script ? <span className="font-mono">{script.filename}</span> : "script"}
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-panel-border">
        {script && (
          <div className="flex items-center gap-2 border-b border-panel-border bg-accent/5 px-3 py-1.5 text-xs text-muted">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-accent/60" />
              <span className="h-2 w-2 rounded-full bg-accent-2/60" />
              <span className="h-2 w-2 rounded-full bg-muted/40" />
            </span>
            <span className="font-mono">{script.filename}</span>
          </div>
        )}
        <pre
          className="max-h-[28rem] overflow-auto bg-accent/5 p-4 font-mono text-[0.8rem] leading-relaxed dark:bg-black/30"
          aria-label={script ? `Preview of ${script.filename}` : "Script preview"}
        >
          <code className={script ? "" : "text-muted"}>{script ? script.content : placeholder}</code>
        </pre>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-muted">
        {copyState === "failed" && "Couldn't reach the clipboard. Select the text above and copy it manually."}
        {script && downloaded === script && copyState !== "failed" &&
          `Downloaded ${script.filename}. Check your browser's downloads.`}
      </p>

      {script && <RunInstructions os={script.os} filename={script.filename} />}
    </section>
  );
}

function RunInstructions({ os, filename }: { os: OS; filename: string }) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-panel-border px-4 py-3 text-sm">
      <p className="font-semibold">How to run it</p>
      {os === "windows" && (
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
          <li>Double-click <Code>{filename}</Code> in your Downloads folder.</li>
          <li>If Windows SmartScreen appears, click <b>More info</b> then <b>Run anyway</b>.</li>
        </ol>
      )}
      {os === "macos" && (
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
          <li>
            First time only, open Terminal and run <Command text={`chmod +x ~/Downloads/${filename}`} />
          </li>
          <li>Double-click the file in Finder.</li>
          <li>
            If macOS blocks it, right-click it and choose <b>Open</b> (on macOS 15+, go to System Settings
            → Privacy &amp; Security and click <b>Open Anyway</b>).
          </li>
        </ol>
      )}
      {os === "linux" && (
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
          <li>
            First time only: <Command text={`chmod +x ~/Downloads/${filename}`} />
          </li>
          <li>
            Run it: <Command text={`~/Downloads/${filename}`} /> (or double-click if your file manager allows running scripts).
          </li>
        </ol>
      )}
      <p className="mt-2 text-xs text-muted">
        Changed something? Download again and replace the old file. The browser can&apos;t update files already on your computer.
      </p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-accent/10 px-1 py-0.5 font-mono text-xs text-fg">{children}</code>;
}

/** A terminal command with its own small copy button. */
function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex max-w-full items-center gap-1 align-middle">
      <Code>{text}</Code>
      <button
        type="button"
        className="rounded px-1 text-xs text-accent-2 hover:underline"
        onClick={async () => {
          if (await copyText(text)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        aria-label={`Copy command: ${text}`}
      >
        {copied ? "✓" : "copy"}
      </button>
    </span>
  );
}
