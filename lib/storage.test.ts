import { describe, expect, it } from "vitest";
import type { Workspace, WorkspaceDraft } from "@/types/workspace";
import {
  draftOf,
  duplicateWorkspace,
  mergeImported,
  parseImport,
  parseWorkspaces,
  serializeExport,
  removeWorkspace,
  sameDraft,
  upsertWorkspace,
} from "./storage";

const T1 = "2026-11-05T10:00:00.000Z";
const T2 = "2026-11-06T10:00:00.000Z";

const draft: WorkspaceDraft = {
  name: "Dev Morning",
  os: "macos",
  items: [{ id: "i1", type: "url", value: "https://github.com", label: "GitHub" }],
  delayEnabled: true,
  delaySeconds: 1,
};

describe("parseWorkspaces", () => {
  it("returns an empty list for missing or broken data", () => {
    expect(parseWorkspaces(null)).toEqual([]);
    expect(parseWorkspaces("not json")).toEqual([]);
    expect(parseWorkspaces('{"not":"an array"}')).toEqual([]);
  });

  it("skips malformed entries and repairs missing fields", () => {
    const raw = JSON.stringify([
      { id: "a", name: "Good", os: "linux", items: [{ id: "x", type: "url", value: "https://a.com", label: "" }], delayEnabled: false, delaySeconds: 2, createdAt: T1, updatedAt: T1 },
      { name: "no id" },
      "junk",
      { id: "b", name: "Repaired", os: "beos", items: [{ value: "/bin/x" }, { nope: 1 }], delaySeconds: 99 },
    ]);
    const list = parseWorkspaces(raw);
    expect(list.map((w) => w.name)).toEqual(["Good", "Repaired"]);
    const repaired = list[1];
    expect(repaired.os).toBe("windows");
    expect(repaired.items).toHaveLength(1);
    expect(repaired.items[0]).toMatchObject({ type: "path", value: "/bin/x", label: "" });
    expect(repaired.items[0].id).toBeTruthy();
    expect(repaired.delaySeconds).toBe(2);
    expect(repaired.delayEnabled).toBe(true);
  });

  it("round-trips what upsert produces", () => {
    const { list } = upsertWorkspace([], draft, null, T1);
    expect(parseWorkspaces(JSON.stringify(list))).toEqual(list);
  });
});

describe("upsertWorkspace", () => {
  it("adds a new workspace at the top with timestamps and an id", () => {
    const existing = upsertWorkspace([], { ...draft, name: "Old" }, null, T1).list;
    const { list, saved } = upsertWorkspace(existing, draft, null, T2);
    expect(list).toHaveLength(2);
    expect(list[0]).toBe(saved);
    expect(saved).toMatchObject({ name: "Dev Morning", createdAt: T2, updatedAt: T2 });
    expect(saved.id).toBeTruthy();
  });

  it("updates an existing workspace in place, keeping createdAt", () => {
    const first = upsertWorkspace([], draft, null, T1);
    const { list, saved } = upsertWorkspace(first.list, { ...draft, name: "Renamed" }, first.saved.id, T2);
    expect(list).toHaveLength(1);
    expect(saved).toMatchObject({ id: first.saved.id, name: "Renamed", createdAt: T1, updatedAt: T2 });
  });

  it("does not share item objects with the editor draft", () => {
    const { saved } = upsertWorkspace([], draft, null, T1);
    expect(saved.items[0]).not.toBe(draft.items[0]);
  });
});

describe("duplicateWorkspace", () => {
  const base: Workspace[] = [
    upsertWorkspace([], { ...draft, name: "B" }, null, T1).saved,
    upsertWorkspace([], draft, null, T1).saved,
  ];

  it("inserts a renamed copy right after the original with fresh ids", () => {
    const original = base[0];
    const { list, copy } = duplicateWorkspace(base, original.id, T2);
    expect(list.map((w) => w.name)).toEqual(["B", "B (copy)", "Dev Morning"]);
    expect(copy!.id).not.toBe(original.id);
    expect(copy!.items[0].id).not.toBe(original.items[0].id);
    expect(copy!.items[0].value).toBe(original.items[0].value);
    expect(copy).toMatchObject({ createdAt: T2, updatedAt: T2 });
  });

  it("does nothing for an unknown id", () => {
    expect(duplicateWorkspace(base, "nope", T2)).toEqual({ list: base, copy: null });
  });
});

describe("removeWorkspace and sameDraft", () => {
  it("removes by id", () => {
    const { list, saved } = upsertWorkspace([], draft, null, T1);
    expect(removeWorkspace(list, saved.id)).toEqual([]);
  });

  it("detects changes in content but ignores ids/timestamps of the workspace", () => {
    const { saved } = upsertWorkspace([], draft, null, T1);
    expect(sameDraft(saved, draft)).toBe(true);
    expect(sameDraft(saved, { ...draft, delaySeconds: 2 })).toBe(false);
    expect(sameDraft(draftOf(saved), { ...draft, items: [] })).toBe(false);
  });
});

describe("export / import", () => {
  const a = upsertWorkspace([], { ...draft, name: "A" }, null, T1).saved;
  const b = upsertWorkspace([], { ...draft, name: "B" }, null, T1).saved;

  it("round-trips through an export file", () => {
    const text = serializeExport([a, b], T2);
    expect(JSON.parse(text)).toMatchObject({ app: "cosmic-workspace-deployer", version: 1, exportedAt: T2 });
    expect(parseImport(text)).toEqual([a, b]);
  });

  it("also accepts a bare array", () => {
    expect(parseImport(JSON.stringify([a]))).toEqual([a]);
  });

  it("rejects files it doesn't understand", () => {
    expect(parseImport("not json")).toBeNull();
    expect(parseImport('{"hello":"world"}')).toBeNull();
    expect(parseImport("42")).toBeNull();
  });

  it("adds new workspaces, updates older copies, and skips same-or-newer ones", () => {
    const newerA = { ...a, name: "A (edited elsewhere)", updatedAt: T2 };
    const olderB = { ...b, name: "B (old)", updatedAt: "2020-01-01T00:00:00.000Z" };
    const c = upsertWorkspace([], { ...draft, name: "C" }, null, T2).saved;

    const result = mergeImported([a, b], [newerA, olderB, c]);
    expect(result).toMatchObject({ added: 1, updated: 1, skipped: 1 });
    expect(result.list.map((w) => w.name)).toEqual(["C", "A (edited elsewhere)", "B"]);
  });

  it("importing the same file twice changes nothing the second time", () => {
    const first = mergeImported([], [a, b]);
    const second = mergeImported(first.list, [a, b]);
    expect(second).toMatchObject({ added: 0, updated: 0, skipped: 2 });
    expect(second.list).toEqual(first.list);
  });
});
