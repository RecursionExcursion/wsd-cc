"use client";

import { useEffect, useRef } from "react";
import type { ItemCheck } from "@/lib/validation";
import type { ItemType, OS, WorkspaceItem } from "@/types/workspace";

const PATH_PLACEHOLDER: Record<OS, string> = {
  windows: "C:\\Program Files\\App\\app.exe",
  macos: "/Applications/Safari.app",
  linux: "/usr/bin/firefox",
};

const TYPES: { value: ItemType; label: string }[] = [
  { value: "path", label: "App / Path" },
  { value: "url", label: "URL" },
];

export default function ItemRow({
  item,
  index,
  total,
  os,
  check,
  showError,
  focusOnMount,
  onChange,
  onBlurValue,
  onMove,
  onRemove,
}: {
  item: WorkspaceItem;
  index: number;
  total: number;
  os: OS;
  check: ItemCheck;
  /** Errors appear only after the user leaves the field or tries to launch. */
  showError: boolean;
  focusOnMount: boolean;
  onChange: (patch: Partial<WorkspaceItem>) => void;
  onBlurValue: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const valueRef = useRef<HTMLInputElement>(null);
  const valueId = `item-${item.id}-value`;
  const messageId = `item-${item.id}-msg`;
  const error = showError ? check.error : undefined;
  // Warnings show as soon as there's something to warn about.
  const warning = check.warning;

  useEffect(() => {
    if (focusOnMount) valueRef.current?.focus();
  }, [focusOnMount]);

  const name = item.label.trim() || `Item ${index + 1}`;

  return (
    <li className="rounded-xl border border-panel-border bg-[var(--field-bg)]/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xs font-semibold text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div role="group" aria-label={`Type of ${name}`} className="flex rounded-lg border border-panel-border p-0.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={item.type === t.value}
              onClick={() => onChange({ type: t.value })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                item.type === t.value
                  ? "bg-gradient-to-r from-accent to-accent-2 text-white shadow-[0_0_10px_-2px_var(--glow)]"
                  : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1">
          <button type="button" className="btn-ghost !px-2" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${name} up`} title="Move up">
            <Arrow up />
          </button>
          <button type="button" className="btn-ghost !px-2" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move ${name} down`} title="Move down">
            <Arrow />
          </button>
          <button type="button" className="btn-ghost !px-2 hover:!border-danger hover:text-danger" onClick={onRemove} aria-label={`Remove ${name}`} title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_12rem]">
        <div>
          <label htmlFor={valueId} className="sr-only">
            {item.type === "url" ? "URL" : "Path"} for {name}
          </label>
          <input
            ref={valueRef}
            id={valueId}
            type="text"
            inputMode={item.type === "url" ? "url" : "text"}
            spellCheck={false}
            autoComplete="off"
            value={item.value}
            placeholder={item.type === "url" ? "https://example.com" : PATH_PLACEHOLDER[os]}
            onChange={(e) => onChange({ value: e.target.value })}
            onBlur={onBlurValue}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || warning ? messageId : undefined}
            className="field font-mono text-sm"
          />
        </div>
        <input
          type="text"
          value={item.label}
          placeholder="Label (optional)"
          onChange={(e) => onChange({ label: e.target.value })}
          aria-label={`Label for item ${index + 1} (optional)`}
          className="field text-sm"
        />
      </div>

      {(error || warning) && (
        <div id={messageId} className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={error ? "text-danger" : "text-warn"}>
            {error ? "✕ " : "⚠ "}
            {error ?? warning}
          </span>
          {error && check.fix && (
            <button
              type="button"
              className="btn-ghost !py-0.5 !text-xs"
              onClick={() => onChange({ value: check.fix!.value })}
            >
              {check.fix.label}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={up ? "" : "rotate-180"}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
