// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { project as sampleProject } from "../sample";
import { createBlankWorkflowState, inferWorkflowState } from "../domain/workflow";
import { loadWorkflowState, persistWorkflowState } from "./workflowRepository";

beforeEach(() => localStorage.clear());

describe("workflow repository", () => {
  it("persists and reloads workflow state locally", async () => {
    const project = { ...sampleProject, title: "The Wake" };
    const workflow = inferWorkflowState(project, [], [], createBlankWorkflowState(project));
    await persistWorkflowState(workflow);

    const reloaded = await loadWorkflowState(project, [], []);

    expect(reloaded.currentPhaseId).toBe("idea_capture");
    expect(reloaded.recommendation.title).toBe("Capture the original premise");
  });

  it("keeps a manually selected current phase when reloading", async () => {
    const project = { ...sampleProject, title: "The Wake" };
    const workflow = {
      ...inferWorkflowState(project, [], [], createBlankWorkflowState(project)),
      currentPhaseId: "creative_north_star" as const,
      source: "manual" as const,
    };
    await persistWorkflowState(workflow);

    const reloaded = await loadWorkflowState(project, [], []);

    expect(reloaded.currentPhaseId).toBe("creative_north_star");
    expect(reloaded.source).toBe("manual");
  });
});
