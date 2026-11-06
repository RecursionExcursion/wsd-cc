import { clampDelay } from "@/lib/validation";
import { DELAY_MAX, DELAY_MIN, type OS } from "@/types/workspace";

export default function DelayControl({
  enabled,
  seconds,
  os,
  onEnabledChange,
  onSecondsChange,
}: {
  enabled: boolean;
  seconds: number;
  os: OS;
  onEnabledChange: (enabled: boolean) => void;
  onSecondsChange: (seconds: number) => void;
}) {
  // Windows' `timeout` only takes whole seconds, so fractions round up.
  const windowsRounded = os === "windows" && enabled && seconds > 0 && !Number.isInteger(seconds);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`relative h-6 w-11 shrink-0 rounded-full border border-panel-border transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-2 ${
              enabled ? "bg-gradient-to-r from-accent to-accent-2" : "bg-[var(--field-bg)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : ""
              }`}
            />
          </span>
          Pause between launches
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="number"
            min={DELAY_MIN}
            max={DELAY_MAX}
            step={0.5}
            value={seconds}
            disabled={!enabled}
            onChange={(e) =>
              onSecondsChange(clampDelay(e.target.value === "" ? 0 : Number(e.target.value)))
            }
            className="field !w-20 text-center"
            aria-label="Delay in seconds"
          />
          <span className="text-muted">seconds (0–2)</span>
        </label>
      </div>
      {windowsRounded && (
        <p className="mt-2 text-xs text-muted">
          Windows waits in whole seconds, so {seconds}s becomes {Math.ceil(seconds)}s.
        </p>
      )}
    </div>
  );
}
