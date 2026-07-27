// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { createBlankWorkflowState, inferWorkflowState } from "../domain/workflow";
import { loadWorkflowState, persistWorkflowState } from "../lib/workflowRepository";

vi.mock("../lib/workflowRepository", () => ({
  loadWorkflowState: vi.fn(),
  persistWorkflowState: vi.fn(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});
beforeEach(() => {
  vi.mocked(loadWorkflowState).mockReset();
  vi.mocked(persistWorkflowState).mockReset();
  vi.mocked(loadWorkflowState).mockImplementation(async (project, nodes, characters) =>
    inferWorkflowState(project, nodes, characters, createBlankWorkflowState(project)),
  );
  vi.mocked(persistWorkflowState).mockImplementation(async (workflow) => workflow);
});

describe("project settings failures on the dashboard route", () => {
  it("shows a failed settings load on the dashboard instead of an empty one", async () => {
    // A corrupt workflow.json reaches the UI here. Before, it only ever reached
    // AiPanel, which the dashboard route never mounts, so the writer saw blank
    // genre/POV fields and their first edit persisted the blanks.
    vi.mocked(loadWorkflowState).mockRejectedValue(new Error("invalid workflow state"));

    render(<App />);

    expect(await screen.findByText(/settings could not be loaded/i)).toBeVisible();
    expect(screen.getByText(/invalid workflow state/i)).toBeVisible();
  });

  it("undoes an unsaved settings change and says so rather than showing it as saved", async () => {
    vi.mocked(persistWorkflowState).mockRejectedValue(new Error("Open a project before saving"));

    render(<App />);
    const genre = await screen.findByLabelText("Genre");
    fireEvent.change(genre, { target: { value: "Horror" } });

    expect(await screen.findByText(/settings could not be saved/i)).toBeVisible();
    // The optimistic value must not survive: disk holds nothing.
    await waitFor(() => expect(genre).toHaveValue(""));
  });

  it("clears the banner once settings save successfully", async () => {
    vi.mocked(persistWorkflowState).mockRejectedValueOnce(new Error("disk full"));

    render(<App />);
    const genre = await screen.findByLabelText("Genre");
    fireEvent.change(genre, { target: { value: "Horror" } });
    expect(await screen.findByText(/settings could not be saved/i)).toBeVisible();

    fireEvent.change(genre, { target: { value: "Horror" } });

    await waitFor(() => expect(screen.queryByText(/settings could not be saved/i)).not.toBeInTheDocument());
    await waitFor(() => expect(genre).toHaveValue("Horror"));
  });
});
