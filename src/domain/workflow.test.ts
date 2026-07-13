import { describe, expect, it } from "vitest";
import { character as sampleCharacter, nodes as sampleNodes, project as sampleProject } from "../sample";
import { createBlankWorkflowState, inferWorkflowState } from "./workflow";

describe("workflow inference", () => {
  it("starts in idea capture when the project exists but the premise does not", () => {
    const project = { ...sampleProject, title: "The Wake" };
    const state = inferWorkflowState(project, [], [], createBlankWorkflowState(project));

    expect(state.currentPhaseId).toBe("idea_capture");
    expect(state.recommendation.title).toBe("Capture the original premise");
    expect(state.draftingReadiness.status).toBe("more_discovery_recommended");
  });

  it("recognizes drafting readiness when the core story foundations already exist", () => {
    const project = { ...sampleProject, title: "The Wake" };
    const character = {
      ...sampleCharacter,
      identity: { ...sampleCharacter.identity, fullName: "Sethalos" },
      psychology: { ...sampleCharacter.psychology, coreWound: "He was abandoned", consciousDesire: "He wants to belong" },
    };
    const workflow = inferWorkflowState(
      project,
      [
        { id: "book-1", projectId: project.id, kind: "book", title: "The Wake", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
        { id: "chapter-1", projectId: project.id, parentId: "book-1", kind: "chapter", title: "Chapter 1", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
      ],
      [character],
      {
        projectBrief: {
          ...createBlankWorkflowState(project).projectBrief,
          originalPremise: "A ruined heir returns home to confront the cost of a living curse.",
        },
        creativeNorthStar: {
          readerExperience: "The reader should feel eerie momentum and deep emotional pressure.",
          emotionalPromise: "A haunted family story with a dangerous transformation.",
          distinguishingQualities: ["Gothic tension"],
          centralThematicConcern: "Inheritance and selfhood",
          genrePromises: ["Atmospheric horror"],
          conventionsToChallenge: [],
          toneAndAtmosphere: "Cold, intimate, and haunted.",
          whatTheReaderShouldRemember: "The final choice costs something real.",
          explicitCreativeGuardrails: ["No cynical ending"],
        },
        discoveryEntries: [
          {
            id: "discovery-1",
            title: "Opening direction",
            notes: "The story begins with the protagonist arriving home.",
            status: "accepted",
            createdAt: "2026-07-12T00:00:00Z",
            updatedAt: "2026-07-12T00:00:00Z",
          },
        ],
        source: "manual",
      },
    );

    expect(workflow.currentPhaseId).toBe("drafting_readiness");
    expect(workflow.draftingReadiness.status).toBe("ready_to_begin");
    expect(workflow.recommendation.title).toBe("Begin drafting Chapter One");
  });
});
