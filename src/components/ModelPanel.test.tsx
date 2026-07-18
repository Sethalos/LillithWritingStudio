// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelPanel } from "./ModelPanel";

beforeEach(() => localStorage.clear());

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.endsWith("/models") && (!init || init.method === undefined || init.method === "GET")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: "openrouter/qwen/qwen3.7-plus", display_name: "qwen/qwen3.7-plus" }],
      }),
    } as Response;
  }

  if (url.endsWith("/chat/completions") || url.endsWith("/api/chat")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Live test response from qwen/qwen3.7-plus." } }],
        usage: { prompt_tokens: 12, completion_tokens: 7 },
      }),
    } as Response;
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ error: { message: "Not found" } }),
  } as Response;
});

vi.stubGlobal("fetch", fetchMock);

describe("models workspace", () => {
  it("discovers models, allows manual model-name entry, and tests the selected model", async () => {
    const onEditorModelChange = vi.fn();
    render(<ModelPanel onEditorModelChange={onEditorModelChange} />);

    fireEvent.change(screen.getByLabelText("Provider type"), { target: { value: "openrouter" } });
    fireEvent.change(screen.getByPlaceholderText("Paste API key"), { target: { value: "test-key" } });
    const modelInput = screen.getByPlaceholderText("Paste a model name or choose from the discovered list") as HTMLInputElement;
    fireEvent.change(modelInput, { target: { value: "openrouter/custom-model" } });

    expect(modelInput.value).toBe("openrouter/custom-model");

    fireEvent.click(screen.getByRole("button", { name: /Discover OpenRouter models/i }));

    await waitFor(() => expect(screen.getByText(/Connected successfully\. Found 1 model/i)).toBeVisible());
    expect(screen.getByRole("button", { name: /qwen\/qwen3\.7-plus Remote/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /qwen\/qwen3\.7-plus Remote/i }));
    expect(modelInput.value).toBe("openrouter/qwen/qwen3.7-plus");
    expect(screen.getAllByDisplayValue("openrouter/qwen/qwen3.7-plus").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: /Test selected model/i }));
    await waitFor(() => expect(screen.getByText(/Test completed for OpenRouter/i)).toBeVisible());
    expect(screen.getByText(/Live test response from qwen\/qwen3.7-plus/i)).toBeVisible();
    expect(onEditorModelChange).toHaveBeenCalled();
  });
});
