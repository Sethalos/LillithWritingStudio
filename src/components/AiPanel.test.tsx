// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPanel } from "./AiPanel";
import { createBlankWorkflowState } from "../domain/workflow";
import type { ContextPackage } from "../domain/ai";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: "A live brainstorming reply." } }],
      usage: { prompt_tokens: 18, completion_tokens: 9 },
    }),
  } as Response)),
);

const workflow = createBlankWorkflowState({
  id: "project",
  title: "Burpy the Gnome King",
  locale: "en",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const context: ContextPackage = {
  version: "1",
  id: "context-1",
  projectId: "project",
  task: "brainstorm",
  target: { documentId: "scene-1" },
  items: [],
  exclusions: [],
  estimatedInputTokens: 1400,
  tokenBudget: 4000,
  assembledAt: new Date().toISOString(),
  assemblerVersion: "test",
};

describe("ai workspace", () => {
  it("renders a live chat composer by default", () => {
    localStorage.setItem(
      "lillith:model-config:v1",
      JSON.stringify({
        providers: [
          { id: "p1", kind: "openai-compatible", location: "local", label: "Local", baseUrl: "http://127.0.0.1:8080/v1", hasCredential: false, enabled: true, headers: {} },
        ],
        routes: [
          { task: "brainstorm", label: "Brainstorming", description: "Ideas", providerId: "p1", modelId: "demo-model" },
        ],
      }),
    );

    render(<AiPanel workflow={workflow} context={context} decision="pending" modelLabel="Local · demo-model" onDecision={() => undefined} onRun={() => undefined} running={false} selectedText="" />);

    expect(screen.getByRole("tab", { name: /chat/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByPlaceholderText(/ask for ideas/i)).toBeVisible();
  });

  it("sends a chat prompt and shows the assistant reply", async () => {
    localStorage.setItem(
      "lillith:model-config:v1",
      JSON.stringify({
        providers: [
          { id: "p1", kind: "openai-compatible", location: "local", label: "Local", baseUrl: "http://127.0.0.1:8080/v1", hasCredential: false, enabled: true, headers: {} },
        ],
        routes: [
          { task: "brainstorm", label: "Brainstorming", description: "Ideas", providerId: "p1", modelId: "demo-model" },
        ],
      }),
    );

    render(<AiPanel workflow={workflow} context={context} decision="pending" modelLabel="Local · demo-model" onDecision={() => undefined} onRun={() => undefined} running={false} selectedText="" />);

    fireEvent.change(screen.getByPlaceholderText(/ask for ideas/i), { target: { value: "Brainstorm a gnome king premise" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/A live brainstorming reply\./i)).toBeVisible());
  });

  it("requires an explicit per-operation acknowledgement for Direct Apply", () => {
    const onRun=vi.fn();
    render(<AiPanel workflow={workflow} context={context} decision="pending" modelLabel="Local · demo-model" onDecision={() => undefined} onRun={onRun} running={false} selectedText="The bell rang." />);
    fireEvent.click(screen.getByRole("tab",{name:/review/i}));
    fireEvent.click(screen.getByRole("button",{name:"Direct Apply"}));
    const run=screen.getByRole("button",{name:/generate reviewed change/i});
    expect(run).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox",{name:/skips proposal review/i}));
    expect(run).toBeEnabled();
    fireEvent.click(run);
    expect(onRun).toHaveBeenCalledWith("Strengthen character voice","direct-apply");
  });

  it("shows an append proposal card in the building chat and applies it on approve", async () => {
    localStorage.setItem(
      "lillith:model-config:v1",
      JSON.stringify({
        providers: [
          { id: "p1", kind: "openai-compatible", location: "local", label: "Local", baseUrl: "http://127.0.0.1:8080/v1", hasCredential: false, enabled: true, headers: {} },
        ],
        routes: [
          { task: "brainstorm", label: "Brainstorming", description: "Ideas", providerId: "p1", modelId: "demo-model" },
        ],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ text: "I drafted the opening for you.", proposal: { action: "append", text: "The rain came sideways that night." } }) } }],
          usage: { prompt_tokens: 8, completion_tokens: 20 },
        }),
      } as Response)),
    );

    const onKeepText = vi.fn();
    render(<AiPanel workflow={workflow} context={context} decision="pending" modelLabel="Local · demo-model" onDecision={() => undefined} onRun={() => undefined} running={false} selectedText="" onKeepText={onKeepText} currentManuscript="" />);

    fireEvent.change(screen.getByPlaceholderText(/message lillith/i), { target: { value: "Draft the opening paragraph" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(screen.getByText(/wants to add this to your manuscript/i)).toBeVisible());
    expect(screen.getByText(/The rain came sideways that night\./)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(onKeepText).toHaveBeenCalledWith("The rain came sideways that night.");
    await waitFor(() => expect(screen.queryByText(/wants to add this to your manuscript/i)).not.toBeInTheDocument());
  });
});
