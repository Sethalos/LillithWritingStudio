// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Binder } from "./Binder";

describe("binder accessibility", () => {
  it("exposes workflow and tool navigation with usable labels", () => {
    const onNavigateWorkspace = vi.fn();
    const onAdvancePhase = vi.fn();
    render(
      <Binder
        projectTitle="Novel"
        onProjectMenu={vi.fn()}
        currentPhaseLabel="Drafting Readiness"
        currentPhaseSummary="Ready to begin"
        nextActionLabel="Begin drafting"
        nextActionReason="The project foundations are in place."
        currentPhaseId="drafting_readiness"
        onOpenWorkflow={vi.fn()}
        onNavigatePhase={vi.fn()}
        onAdvancePhase={onAdvancePhase}
        activeWorkspace="workflow"
        onNavigateWorkspace={onNavigateWorkspace}
        onResumeManuscript={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Workflow Home" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Manuscript" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Continue to Drafting/i }));
    expect(onAdvancePhase).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "AI Editor" }));
    expect(onNavigateWorkspace).toHaveBeenCalledWith("ai");
  });
});
