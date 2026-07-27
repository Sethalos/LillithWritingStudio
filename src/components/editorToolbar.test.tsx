// @vitest-environment jsdom
/// <reference types="vite/client" />
import "@testing-library/jest-dom/vitest";
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorPane } from "./EditorPane";
import type { ManuscriptNode } from "../domain/models";
import stylesCss from "../styles.css?raw";

const document: ManuscriptNode = { id: "s1", projectId: "p1", kind: "scene", title: "Station XII", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-27T00:00:00Z", content: "<p>The door opened.</p>" };

const renderPane = () =>
  render(<EditorPane document={document} content="<p>The door opened.</p>" characters={[]} onChange={() => undefined} onAi={() => undefined} onComment={() => undefined} onMetadata={async () => undefined} embeddedAi={<div>chat</div>} />);

describe("editor toolbar with the AI dock mounted", () => {
  it("puts Underline in the toolbar row rather than floating it over the prose", () => {
    const { container } = renderPane();
    const toolbar = container.querySelector(".toolbar");
    expect(toolbar).not.toBeNull();
    expect(within(toolbar as HTMLElement).getByRole("button", { name: /^underline$/i })).toBeInTheDocument();
    expect(container.querySelector(".manuscript-column > .underline-tool")).toBeNull();
  });

  it("keeps the formatting tools in the toolbar", () => {
    const { container } = renderPane();
    const toolbar = within(container.querySelector(".toolbar") as HTMLElement);
    expect(toolbar.getByRole("button", { name: /^bold$/i })).toBeInTheDocument();
    expect(toolbar.getByRole("button", { name: /^italic$/i })).toBeInTheDocument();
    expect(toolbar.getByRole("button", { name: /find and replace/i })).toBeInTheDocument();
  });

  it("no longer hides the toolbar when the AI dock is mounted", () => {
    expect(stylesCss).not.toMatch(/with-ai-dock\s+\.toolbar\s*,/);
    expect(stylesCss).not.toMatch(/with-ai-dock\s+\.toolbar\s*\{[^}]*display\s*:\s*none/);
  });
});
