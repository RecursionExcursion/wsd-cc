import type { WorkspaceDraft } from "@/types/workspace";
import { bashHeader, bashQuote, delaySeconds, itemTitle, itemValue } from "./shared";

/**
 * Linux: run executables in the background with nohup (so they keep running after
 * the script ends and don't block the next item); open URLs with xdg-open.
 */
export function generateLinux(draft: WorkspaceDraft, filename: string, now: Date): string {
  const delay = delaySeconds(draft);
  const lines = bashHeader(draft, "Linux", filename, now);

  draft.items.forEach((item, index) => {
    lines.push(`# ${itemTitle(item, index)}`);
    if (item.type === "url") {
      lines.push(`xdg-open ${bashQuote(itemValue(item))} >/dev/null 2>&1 &`);
    } else {
      lines.push(`nohup ${bashQuote(itemValue(item), true)} >/dev/null 2>&1 &`);
    }
    if (delay > 0 && index < draft.items.length - 1) lines.push(`sleep ${delay}`);
    lines.push("");
  });

  lines.push("exit 0");
  return lines.join("\n") + "\n";
}
