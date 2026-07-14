import { describe, expect, it } from "vitest";
import { buildChangeHunks, composeTrackedText } from "./trackedChanges";

describe("tracked changes", () => {
  it("preserves whitespace and composes individual decisions", () => {
    const hunks = buildChangeHunks("The old bell rang.", "The black bell sounded.");
    const changes = hunks.filter((hunk) => hunk.changed);
    expect(composeTrackedText(hunks, new Set(changes.map((hunk) => hunk.id)))).toBe("The black bell sounded.");
    expect(composeTrackedText(hunks, new Set())).toBe("The old bell rang.");
  });

  it("returns unchanged text as a stable hunk", () => {
    expect(buildChangeHunks("Still water", "Still water")).toEqual([{ id: "change-0", before: "Still water", after: "Still water", changed: false }]);
  });
});
