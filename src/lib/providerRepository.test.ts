import { beforeEach, describe, expect, it } from "vitest";
import { defaultTaskRoutes, type DiscoveredModel, type ProviderConfiguration } from "../domain/providers";
import { estimateExecutionCost, routePresetForLocation } from "./providerRepository";
import { loadBrowserProviderSecret, saveBrowserProviderSecret } from "./providerBrowserApi";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  },
});

describe("provider cost estimates", () => {
  beforeEach(() => values.clear());

  it("uses user-configured per-million token prices", () => {
    localStorage.setItem("lillith:model-config:v1", JSON.stringify({ providers: [{ id: "p", location: "remote" }], models: [{ id: "m", providerId: "p", local: false, inputCostPerMillion: 2, outputCostPerMillion: 8 }], routes: [{ task: "prose-rewrite", providerId: "p", modelId: "m" }] }));
    expect(estimateExecutionCost("prose-rewrite", 100_000, 10_000)).toMatchObject({ minimum: 0.2, maximum: 0.28, priced: true, local: false });
  });

  it("reports local execution as zero API cost", () => {
    localStorage.setItem("lillith:model-config:v1", JSON.stringify({ providers: [{ id: "p", location: "local" }], models: [{ id: "m", providerId: "p", local: true }], routes: [{ task: "prose-rewrite", providerId: "p", modelId: "m" }] }));
    expect(estimateExecutionCost("prose-rewrite", 50_000, 2_000)).toMatchObject({ minimum: 0, maximum: 0, priced: true, local: true });
  });

  it("never invents prices for an unpriced remote model", () => {
    localStorage.setItem("lillith:model-config:v1", JSON.stringify({ providers: [{ id: "p", location: "remote" }], models: [{ id: "m", providerId: "p", local: false }], routes: [{ task: "prose-rewrite", providerId: "p", modelId: "m" }] }));
    expect(estimateExecutionCost("prose-rewrite", 1000)).toMatchObject({ priced: false });
  });

  it("applies local and remote routing presets across every task", () => {
    const providers: ProviderConfiguration[] = [
      { id: "local", kind: "ollama", location: "local", label: "Ollama", baseUrl: "http://127.0.0.1:11434", hasCredential: false, enabled: true, headers: {} },
      { id: "remote", kind: "openai", location: "remote", label: "OpenAI", baseUrl: "https://api.openai.com/v1", hasCredential: false, enabled: true, headers: {} },
    ];
    const models: DiscoveredModel[] = [
      { id: "llama3.3:70b", providerId: "local", label: "llama3.3:70b", local: true },
      { id: "gpt-5", providerId: "remote", label: "gpt-5", local: false },
    ];

    expect(routePresetForLocation("local", providers, models, defaultTaskRoutes)?.every((route) => route.providerId === "local" && route.modelId === "llama3.3:70b")).toBe(true);
    expect(routePresetForLocation("remote", providers, models, defaultTaskRoutes)?.every((route) => route.providerId === "remote" && route.modelId === "gpt-5")).toBe(true);
  });

  it("stores and loads browser provider secrets locally", () => {
    saveBrowserProviderSecret("provider-1", "secret-key");
    expect(loadBrowserProviderSecret("provider-1")).toBe("secret-key");
  });
});
