// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisPanel } from "./AnalysisPanel";
import type { ManuscriptNode } from "../domain/models";

const nodes: ManuscriptNode[] = [
  { id: "book-1", projectId: "project-1", kind: "book", title: "Book One", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
  { id: "chapter-1", projectId: "project-1", parentId: "book-1", kind: "chapter", title: "Chapter One", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
  { id: "scene-1", projectId: "project-1", parentId: "chapter-1", kind: "scene", title: "Scene One", content: "<p>Opening scene.</p>", position: 0, wordCount: 900, revision: 0, updatedAt: "2026-07-12T00:00:00Z", sceneType: "mixed", sceneLocation: "Harbour" },
  { id: "scene-2", projectId: "project-1", parentId: "chapter-1", kind: "scene", title: "Scene Two", content: "<p>Follow-up scene.</p>", position: 1, wordCount: 800, revision: 0, updatedAt: "2026-07-12T00:00:00Z", sceneType: "mixed", sceneLocation: "Harbour" },
  { id: "chapter-2", projectId: "project-1", parentId: "book-1", kind: "chapter", title: "Chapter Two", position: 1, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
  { id: "scene-3", projectId: "project-1", parentId: "chapter-2", kind: "scene", title: "Scene Three", content: "<p>Manuscript scope.</p>", position: 0, wordCount: 700, revision: 0, updatedAt: "2026-07-12T00:00:00Z", sceneType: "mixed", sceneLocation: "Market" },
];

beforeEach(() => localStorage.clear()); afterEach(cleanup);
describe("AI developmental review", () => {
  it("preflights chapter and manuscript scope without mutating text", () => {
    render(<AnalysisPanel nodes={nodes} characters={[]} onSelectScene={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "AI Review" }));
    expect(screen.getByText("Evidence-backed reports · no automatic rewriting")).toBeVisible();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "2 scenes")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Review scope"), { target: { value: "manuscript" } });
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "3 scenes")).toBeVisible();
    expect(screen.getByText(/bounded beginning\/end excerpts/)).toBeVisible();
  });
});
