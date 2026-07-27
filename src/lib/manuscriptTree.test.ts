import { describe, expect, it } from "vitest";
import { buildTree, describePath } from "./manuscriptTree";
import type { ManuscriptNode } from "../domain/models";

const node = (id: string, kind: ManuscriptNode["kind"], title: string, parentId: string | undefined, position: number, wordCount = 0): ManuscriptNode =>
  ({ id, projectId: "p1", parentId, kind, title, position, wordCount, revision: 0, updatedAt: "2026-07-27T00:00:00Z" });

const fixture: ManuscriptNode[] = [
  node("book", "book", "Meret Vale", undefined, 0),
  node("c2", "chapter", "Chapter Two", "book", 1),
  node("c1", "chapter", "Chapter One", "book", 0),
  node("s2", "scene", "The Sluice Crew", "c1", 1, 220),
  node("s1", "scene", "Station XII", "c1", 0, 310),
];

describe("buildTree", () => {
  it("nests scenes under chapters under the book", () => {
    const tree = buildTree(fixture);
    expect(tree).toHaveLength(1);
    expect(tree[0].node.id).toBe("book");
    expect(tree[0].children.map((child) => child.node.id)).toEqual(["c1", "c2"]);
    expect(tree[0].children[0].children.map((child) => child.node.id)).toEqual(["s1", "s2"]);
  });

  it("orders siblings by position, not array order", () => {
    expect(buildTree(fixture)[0].children[0].node.title).toBe("Chapter One");
  });

  it("rolls word counts up into containers", () => {
    const tree = buildTree(fixture);
    expect(tree[0].children[0].words).toBe(530);
    expect(tree[0].words).toBe(530);
  });

  it("attaches orphans at the root instead of dropping them", () => {
    const orphan = node("lost", "scene", "Lost Scene", "missing-chapter", 0, 40);
    const tree = buildTree([...fixture, orphan]);
    expect(tree.map((item) => item.node.id)).toContain("lost");
  });

  it("returns an empty array for no nodes", () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe("describePath", () => {
  it("names the chain from chapter to scene", () => {
    expect(describePath(fixture, "s2")).toBe("Chapter One › The Sluice Crew");
  });

  it("returns the title alone for a top-level node", () => {
    expect(describePath(fixture, "c1")).toBe("Chapter One");
  });

  it("returns an empty string for an unknown id", () => {
    expect(describePath(fixture, "nope")).toBe("");
  });
});
