// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandDashboard } from "./CommandDashboard";
import { createBlankWorkflowState } from "../domain/workflow";
import type { ManuscriptNode, Project } from "../domain/models";

const project: Project = { id: "project-1", title: "The Listening Dark", locale: "en-CA", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-07-14T10:00:00Z" };
const nodes: ManuscriptNode[] = [
  { id: "book-1", projectId: project.id, kind: "book", title: project.title, position: 0, wordCount: 0, revision: 0, updatedAt: project.updatedAt },
  { id: "chapter-1", projectId: project.id, parentId: "book-1", kind: "chapter", title: "Chapter One", position: 0, wordCount: 0, revision: 0, updatedAt: project.updatedAt },
  { id: "scene-1", projectId: project.id, parentId: "chapter-1", kind: "scene", title: "The Signal", position: 0, wordCount: 840, wordGoal: 1200, content: "<p>Mara heard the signal and waited.</p>", revision: 1, updatedAt: project.updatedAt },
];

describe("command dashboard", () => {
  beforeEach(() => localStorage.clear());

  it("renders real project metrics and persists task interaction", async () => {
    render(<CommandDashboard project={project} nodes={nodes} characters={[]} workflow={createBlankWorkflowState(project)} activeDocumentId="scene-1" onOpenDocument={vi.fn()} onNavigate={vi.fn()}/>);
    expect(screen.getByRole("heading", { name: project.title })).toBeVisible();
    expect(screen.getByText(/840 \/ 1,200/)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "New task" }), { target: { value: "Review the signal scene" } });
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Review the signal scene/ })).toBeVisible());
    expect(JSON.parse(localStorage.getItem(`lillith:dashboard-tasks:v1:${project.id}`) || "[]")).toHaveLength(1);
  });
});
