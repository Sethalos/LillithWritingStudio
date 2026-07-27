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
    // The backend answers null (not an error) when no project is open, so this
    // path must not depend on matching any Rust error wording.
    vi.mocked(invoke).mockResolvedValue(null);
    const project = { ...sampleProject, title: "The Wake" };

    const result = await loadWorkflowState(project, [], []);

    expect(result.currentPhaseId).toBe("idea_capture");
  });

  it("propagates any backend failure rather than guessing at its message", async () => {
    // Previously only messages containing "No project is open" were treated as
    // first-run; anything else — including a reworded version of that very
    // condition — must surface instead of silently becoming inferred defaults.
    vi.mocked(invoke).mockRejectedValue("Vault lock poisoned");
    const project = { ...sampleProject, title: "The Wake" };

    await expect(loadWorkflowState(project, [], [])).rejects.toBeTruthy();
  });

  it("propagates a corrupt workflow.json instead of silently reverting to inferred defaults", async () => {
    vi.mocked(invoke).mockRejectedValue("invalid workflow state");
    const project = { ...sampleProject, title: "The Wake" };

    await expect(loadWorkflowState(project, [], [])).rejects.toBeTruthy();
  });
});
