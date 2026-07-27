// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { project as sampleProject } from "../sample";
import { createBlankWorkflowState, inferWorkflowState } from "../domain/workflow";
import { loadWorkflowState, persistWorkflowState } from "./workflowRepository";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

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

describe("workflow repository on a vault project (Tauri)", () => {
  beforeEach(() => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockReset();
  });
  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("falls back to inferred state when no vault project is open yet, without throwing", async () => {
    vi.mocked(invoke).mockRejectedValue("No project is open");
    const project = { ...sampleProject, title: "The Wake" };

    const result = await loadWorkflowState(project, [], []);

    expect(result.currentPhaseId).toBe("idea_capture");
  });

  it("propagates a corrupt workflow.json instead of silently reverting to inferred defaults", async () => {
    vi.mocked(invoke).mockRejectedValue("invalid workflow state");
    const project = { ...sampleProject, title: "The Wake" };

    await expect(loadWorkflowState(project, [], [])).rejects.toBeTruthy();
  });
});
