// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManuscriptTree } from "./ManuscriptTree";
import type { ManuscriptNode } from "../domain/models";

afterEach(() => {
  cleanup();
});

const node = (id: string, kind: ManuscriptNode["kind"], title: string, parentId: string | undefined, position: number, wordCount = 0): ManuscriptNode =>
  ({ id, projectId: "p1", parentId, kind, title, position, wordCount, revision: 0, updatedAt: "2026-07-27T00:00:00Z" });

const nodes: ManuscriptNode[] = [
  node("book", "book", "Meret Vale", undefined, 0),
  node("c1", "chapter", "Chapter One", "book", 0),
  node("s1", "scene", "Station XII", "c1", 0, 310),
  node("s2", "scene", "The Sluice Crew", "c1", 1, 220),
];

describe("ManuscriptTree", () => {
  it("lists chapters and scenes with word counts", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByText("Chapter One")).toBeVisible();
    expect(screen.getByText("Station XII")).toBeVisible();
    expect(screen.getByText("530")).toBeVisible();
    expect(screen.getByText("310")).toBeVisible();
  });

  it("marks the active scene as current", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s2" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByRole("button", { name: /The Sluice Crew/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Station XII/ })).not.toHaveAttribute("aria-current", "true");
  });

  it("selects a scene when its row is clicked", () => {
    const onSelect = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={onSelect} onCreate={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /The Sluice Crew/ }));
    expect(onSelect).toHaveBeenCalledWith("s2");
  });

  it("adds a scene to the chapter that owns the row menu", () => {
    const onCreate = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Chapter One/i }));
    fireEvent.click(screen.getByRole("button", { name: /new scene/i }));
    expect(onCreate).toHaveBeenCalledWith("scene", "c1");
  });

  it("invites the writer to start when the manuscript is empty", () => {
    render(<ManuscriptTree nodes={[]} activeId="" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByText(/no chapters yet/i)).toBeVisible();
  });
});
