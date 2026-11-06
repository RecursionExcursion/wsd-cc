import { OS_EXTENSIONS, OS_LABELS, type OS } from "@/types/workspace";

const OPTIONS: OS[] = ["windows", "macos", "linux"];

export default function OsSelector({
  value,
  onChange,
}: {
  value: OS;
  onChange: (os: OS) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Target system</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((os) => (
          <label
            key={os}
            className="cursor-pointer rounded-xl border border-panel-border px-3 py-2 text-center transition hover:border-accent has-checked:border-accent has-checked:bg-accent/10 has-checked:shadow-[0_0_16px_-4px_var(--glow)] has-focus-visible:outline-2 has-focus-visible:outline-accent-2"
          >
            <input
              type="radio"
              name="os"
              value={os}
              checked={value === os}
              onChange={() => onChange(os)}
              className="sr-only"
            />
            <span className="block text-sm font-semibold">{OS_LABELS[os]}</span>
            <span className="block font-mono text-xs text-muted">{OS_EXTENSIONS[os]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
