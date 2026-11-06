import type { WorkspaceDraft } from "@/types/workspace";
import { bashHeader, bashQuote, delaySeconds, itemTitle, itemValue } from "./shared";

/**
 * macOS: `open` handles everything — .app bundles, documents, folders, and URLs
 * (which go to the default browser).
 */
export function generateMacos(draft: WorkspaceDraft, filename: string, now: Date): string {
  const delay = delaySeconds(draft);
  const lines = bashHeader(draft, "macOS", filename, now);

  draft.items.forEach((item, index) => {
    const quoted = bashQuote(itemValue(item), item.type === "path");
    lines.push(`# ${itemTitle(item, index)}`);
    lines.push(`open ${quoted}`);
    if (delay > 0 && index < draft.items.length - 1) lines.push(`sleep ${delay}`);
    lines.push("");
  });

  lines.push("exit 0");
  return lines.join("\n") + "\n";
}
