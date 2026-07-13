import { describe, expect, it } from "vitest";
import { analyzeContinuity } from "./continuityEngine";
import { character } from "../sample";
import type { BibleEntity, DynamicCharacterState, ManuscriptNode } from "../domain/models";

const nodes: ManuscriptNode[] = [
  { id: "book-1", projectId: "project-1", kind: "book", title: "Book One", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
  { id: "ch-1", projectId: "project-1", parentId: "book-1", kind: "chapter", title: "Chapter One", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
  { id: "scene-1", projectId: "project-1", parentId: "ch-1", kind: "scene", title: "Scene One", content: "<p>Scene one.</p>", position: 0, wordCount: 500, revision: 0, updatedAt: "2026-07-12T00:00:00Z", sceneType: "mixed", sceneLocation: "Harbour" },
  { id: "scene-2", projectId: "project-1", parentId: "ch-1", kind: "scene", title: "Scene Two", content: "<p>Scene two.</p>", position: 1, wordCount: 600, revision: 0, updatedAt: "2026-07-12T00:00:00Z", sceneType: "mixed", sceneLocation: "Greyhaven causeway" },
];

describe("continuity engine", () => {
  it("detects broken-before-made promises and unexplained disappearing injuries", () => {
    const state = (id: string, node: string): DynamicCharacterState => ({
      id,
      characterId: character.id,
      effectiveFromNodeId: node,
      injuries: [],
      illness: [],
      clothing: [],
      equipment: [],
      objectsCarried: [],
      emotionalState: [],
      recentEvents: [],
      currentKnowledge: [],
      incorrectBeliefs: [],
      secretsKnown: [],
      secretsWithheld: [],
      promisesMade: [],
      promisesBroken: [],
      relationshipChanges: [],
      trustChanges: [],
      moralCompromises: [],
      recentLosses: [],
      recentVictories: [],
      immediatePriorities: [],
      source: "manual",
    });

    const first = { ...state("a", "scene-1"), injuries: ["cut palm"] };
    const second = { ...state("b", "scene-2"), promisesBroken: ["return the key"] };
    const result = analyzeContinuity({ nodes, characters: [character], states: [first, second], arcs: [], bible: [] });

    expect(result.findings.some((item) => item.category === "promise" && item.severity === "error")).toBe(true);
    expect(result.findings.some((item) => item.title.includes("injury"))).toBe(true);
  });

  it("detects location mismatches against canonical story memory", () => {
    const now = new Date().toISOString();
    const sceneNodes = nodes.map((node) => node.id === "scene-1" ? ({ ...node, sceneLocation: "Greyhaven causeway" } as ManuscriptNode) : node);
    const bible: BibleEntity = { id: "loc-1", projectId: "p", entityType: "location", name: "Greyhaven Observatory", canonStatus: "canon", createdAt: now, updatedAt: now, facts: [] };
    const state: DynamicCharacterState = {
      id: "state-location",
      characterId: character.id,
      effectiveFromNodeId: "scene-1",
      physicalLocationId: "loc-1",
      injuries: [],
      illness: [],
      clothing: [],
      equipment: [],
      objectsCarried: [],
      emotionalState: [],
      recentEvents: [],
      currentKnowledge: [],
      incorrectBeliefs: [],
      secretsKnown: [],
      secretsWithheld: [],
      promisesMade: [],
      promisesBroken: [],
      relationshipChanges: [],
      trustChanges: [],
      moralCompromises: [],
      recentLosses: [],
      recentVictories: [],
      immediatePriorities: [],
      source: "manual",
    };

    const result = analyzeContinuity({ nodes: sceneNodes, characters: [character], states: [state], arcs: [], bible: [bible] });

    expect(result.findings.some((item) => item.category === "location" && item.severity === "warning")).toBe(true);
  });

  it("detects conflicting canonical facts", () => {
    const now = new Date().toISOString();
    const bible: BibleEntity = {
      id: "b",
      projectId: "p",
      entityType: "rule",
      name: "Gate",
      canonStatus: "canon",
      createdAt: now,
      updatedAt: now,
      facts: [
        { id: "1", fieldName: "Height", value: "3m", canonStatus: "canon", createdAt: now },
        { id: "2", fieldName: "Height", value: "4m", canonStatus: "canon", createdAt: now },
      ],
    };
    const result = analyzeContinuity({ nodes, characters: [], states: [], arcs: [], bible: [bible] });
    expect(result.counts.errors).toBe(1);
  });
});
