// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowDashboard } from "./WorkflowDashboard";
import { createBlankWorkflowState } from "../domain/workflow";
import type { Project } from "../domain/models";

afterEach(() => {
  cleanup();
});

const project: Project = {
  id: "project-1",
  title: "Lillith: Vampire Goddess",
  locale: "en",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("workflow dashboard phase editors", () => {
  it("shows editable project-creation controls", () => {
    const workflow = createBlankWorkflowState(project);
    const onWorkflowChange = vi.fn();

    render(
      <WorkflowDashboard
        project={project}
        nodes={[]}
        characters={[]}
        workflow={workflow}
        onNavigateWorkspace={vi.fn()}
        onAdvancePhase={vi.fn()}
        onWorkflowChange={onWorkflowChange}
      />,
    );

    expect(screen.getByRole("combobox", { name: /project type/i })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /genre/i })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: /genre/i }), { target: { value: "Horror" } });
    expect(onWorkflowChange).toHaveBeenCalled();
  });

  it("shows a brainstorming-friendly idea-capture textarea", () => {
    const workflow = { ...createBlankWorkflowState(project), currentPhaseId: "idea_capture" as const };
    const onWorkflowChange = vi.fn();
    render(
      <WorkflowDashboard
        project={project}
        nodes={[]}
        characters={[]}
        workflow={workflow}
        onNavigateWorkspace={vi.fn()}
        onAdvancePhase={vi.fn()}
        onWorkflowChange={onWorkflowChange}
      />,
    );

    expect(screen.getByPlaceholderText("What is this story about?")).toBeVisible();
    expect(screen.getByPlaceholderText("Paste or type each imagined scene as a separate bullet.")).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText("Paste or type each imagined scene as a separate bullet."), { target: { value: "Burpy finds the crown" } });
    expect(onWorkflowChange).toHaveBeenCalled();
  });

  it("shows a north-star editor for the next phase", () => {
    const workflow = { ...createBlankWorkflowState(project), currentPhaseId: "creative_north_star" as const };
    render(
      <WorkflowDashboard
        project={project}
        nodes={[]}
        characters={[]}
        workflow={workflow}
        onNavigateWorkspace={vi.fn()}
        onAdvancePhase={vi.fn()}
        onWorkflowChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("What do you want the reader to feel?")).toBeVisible();
    expect(screen.getByPlaceholderText("Rules or limits to keep the book aligned.")).toBeVisible();
  });
});
