// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Binder } from "./Binder";

describe("binder accessibility", () => {
  it("exposes workflow and tool navigation with usable labels", () => {
    const onNavigateWorkspace = vi.fn();
    render(
      <Binder
        projectTitle="Novel"
        onProjectMenu={vi.fn()}
        currentPhaseLabel="Drafting Readiness"
        nextActionLabel="Begin drafting"
        activeWorkspace="workflow"
        onNavigateWorkspace={onNavigateWorkspace}
        onResumeManuscript={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Project Workflow" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Manuscript" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Project Workflow" }));
    expect(onNavigateWorkspace).toHaveBeenCalledWith("workflow");
    fireEvent.click(screen.getByRole("button", { name: "Manuscript" }));
    expect(onNavigateWorkspace).toHaveBeenCalledWith("manuscript");
  });
});
