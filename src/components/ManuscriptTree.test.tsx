// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("collapses a container row instead of selecting some other scene", () => {
    const onSelect = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={onSelect} onCreate={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Chapter One" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByText("Station XII")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chapter One" }));
    expect(screen.getByText("Station XII")).toBeVisible();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reports twisty state with aria-expanded", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} />);
    const twisty = screen.getByRole("button", { name: /collapse Chapter One/i });
    expect(twisty).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(twisty);
    expect(screen.getByRole("button", { name: /expand Chapter One/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("dismisses the row menu on an outside click and on Escape", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Chapter One/i }));
    expect(screen.getByRole("menu")).toBeVisible();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /actions for Chapter One/i }));
    expect(screen.getByRole("menu")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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

  it("shows the book's title and total word count in the header", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByText("Meret Vale")).toBeVisible();
    expect(screen.getByText("530 words")).toBeVisible();
  });

  it("does not render the book node itself as a tree row", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.queryByRole("button", { name: /actions for Meret Vale/i })).not.toBeInTheDocument();
  });

  it("disables New chapter in both the header and the row menu when there is no book node", () => {
    const orphanNodes: ManuscriptNode[] = [node("c9", "chapter", "Stray Chapter", undefined, 0)];
    render(<ManuscriptTree nodes={orphanNodes} activeId="" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByRole("button", { name: "New chapter" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /actions for Stray Chapter/i }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("button", { name: /new chapter/i })).toBeDisabled();
  });

  it("renders a part/act layer between the book and its chapters", () => {
    const nodesWithPart: ManuscriptNode[] = [
      node("book2", "book", "Other Book", undefined, 0),
      node("part1", "part", "Part One", "book2", 0),
      node("c2", "chapter", "Chapter Two", "part1", 0),
      node("s3", "scene", "Scene Three", "c2", 0, 150),
    ];
    render(<ManuscriptTree nodes={nodesWithPart} activeId="s3" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByText("Part One")).toBeVisible();
    expect(screen.getByText("Chapter Two")).toBeVisible();
    expect(screen.getByText("Scene Three")).toBeVisible();
    expect(screen.getByText("Other Book")).toBeVisible();
    expect(screen.getByText("150 words")).toBeVisible();
    expect(screen.queryByRole("button", { name: /actions for Other Book/i })).not.toBeInTheDocument();
  });
});
