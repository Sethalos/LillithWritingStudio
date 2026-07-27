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

  it("handles self-parenting nodes (cycle of length 1) by attaching at root", () => {
    const selfParent = node("cyclic", "chapter", "Self Parent", "cyclic", 0, 100);
    const tree = buildTree([...fixture, selfParent]);
    // Self-parenting node should appear at root, not vanish
    expect(tree.map((item) => item.node.id)).toContain("cyclic");
    // The node should not have infinite children
    const cyclicNode = tree.find((item) => item.node.id === "cyclic");
    expect(cyclicNode?.children).toHaveLength(0);
  });

  it("handles two-node cycles by attaching both at root", () => {
    const a = node("a", "chapter", "Chapter A", "b", 0);
    const b = node("b", "chapter", "Chapter B", "a", 1);
    const tree = buildTree([...fixture, a, b]);
    const ids = tree.map((item) => item.node.id);
    // Both nodes in the cycle should appear in output at root
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    // They should be siblings at root (not nested)
    const aNode = tree.find((item) => item.node.id === "a");
    const bNode = tree.find((item) => item.node.id === "b");
    expect(aNode?.children).toHaveLength(0);
    expect(bNode?.children).toHaveLength(0);
  });

  it("handles cycles with children by rendering the cycle and its descendants", () => {
    // Create a cycle: cycA -> cycB -> cycA, with cycB having a child
    const cycA = node("cycA", "chapter", "Cycle A", "cycB", 0, 50);
    const cycB = node("cycB", "chapter", "Cycle B", "cycA", 1, 60);
    const childOfCycB = node("sceneCyc", "scene", "Scene in Cycle B", "cycB", 0, 150);
    const tree = buildTree([...fixture, cycA, cycB, childOfCycB]);
    const ids = tree.map((item) => item.node.id);
    // All nodes in the cycle should appear (not be silently dropped)
    expect(ids).toContain("cycA");
    expect(ids).toContain("cycB");
    // Children of cyclic nodes should also appear
    expect(ids).toContain("sceneCyc");
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
