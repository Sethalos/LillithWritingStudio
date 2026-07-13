import type { ChatMessage, ChatResponse } from "../domain/ai";
import type { DiscoveredModel, ProviderConfiguration } from "../domain/providers";

const secretKey = (providerId: string) => `lillith:provider-secret:v1:${providerId}`;

const storageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const storageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in constrained browser contexts.
  }
};

export function loadBrowserProviderSecret(providerId: string): string | null {
  return storageGet(secretKey(providerId));
}

export function saveBrowserProviderSecret(providerId: string, apiKey?: string): void {
  const trimmed = apiKey?.trim();
  if (trimmed) storageSet(secretKey(providerId), trimmed);
}

export function resolveBrowserProviderKey(configuration: ProviderConfiguration, apiKey?: string): string | null {
  const trimmed = apiKey?.trim();
  if (trimmed) return trimmed;
  return loadBrowserProviderSecret(configuration.id);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function providerHeaders(configuration: ProviderConfiguration, apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { ...configuration.headers };
  const secret = resolveBrowserProviderKey(configuration, apiKey);

  if (secret && configuration.kind !== "gemini") {
    headers.Authorization = `Bearer ${secret}`;
  }

  if (configuration.kind === "anthropic" && secret) {
    headers["x-api-key"] = secret;
    headers["anthropic-version"] = "2023-06-01";
    delete headers.Authorization;
  }

  if (configuration.kind === "gemini" && secret) {
    headers["x-goog-api-key"] = secret;
  }

  if (configuration.kind === "openrouter") {
    headers["HTTP-Referer"] = headers["HTTP-Referer"] ?? window.location.origin;
    headers["X-Title"] = headers["X-Title"] ?? "Lillith Writing Studio";
  }

  return headers;
}

function endpoint(configuration: ProviderConfiguration, path: string): string {
  return `${normalizeBaseUrl(configuration.baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

function shouldUseCompletionTokenField(configuration: ProviderConfiguration, model: string): boolean {
  return configuration.kind === "openai" || /^gpt-5(\.|-|$)/i.test(model);
}

function shouldOmitTemperature(configuration: ProviderConfiguration, model: string): boolean {
  return configuration.kind === "openai" || /^gpt-5(\.|-|$)/i.test(model);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function responseText(payload: unknown, kind: ProviderConfiguration["kind"]): string | null {
  const data = payload as Record<string, unknown>;
  if (kind === "anthropic") {
    const content = data.content;
    if (!Array.isArray(content)) return null;
    return content
      .map((block) => (block && typeof block === "object" && "text" in block ? String((block as { text?: unknown }).text ?? "") : ""))
      .join("")
      .trim() || null;
  }

  if (kind === "gemini") {
    const candidates = data.candidates;
    if (!Array.isArray(candidates) || !candidates.length) return null;
    const parts = (candidates[0] as Record<string, unknown>)?.content && typeof (candidates[0] as Record<string, unknown>).content === "object"
      ? ((candidates[0] as Record<string, unknown>).content as Record<string, unknown>).parts
      : undefined;
    if (!Array.isArray(parts)) return null;
    return parts.map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text ?? "") : "")).join("").trim() || null;
  }

  if (kind === "ollama") {
    const message = data.message as { content?: unknown } | undefined;
    return typeof message?.content === "string" ? message.content.trim() || null : null;
  }

  if (kind === "openai") {
    if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
    const output = Array.isArray(data.output) ? data.output : null;
    if (!output) return null;
    const text = output
      .flatMap((item) => {
        const content = item && typeof item === "object" ? (item as Record<string, unknown>).content : undefined;
        if (!Array.isArray(content)) return [];
        return content.flatMap((part) => {
          if (!part || typeof part !== "object") return [];
          const record = part as Record<string, unknown>;
          const value = typeof record.text === "string" ? record.text : typeof record.output_text === "string" ? record.output_text : "";
          return value.trim() ? [value.trim()] : [];
        });
      })
      .join("")
      .trim();
    return text || null;
  }

  const choices = data.choices;
  if (!Array.isArray(choices) || !choices.length) return null;
  const first = choices[0] as Record<string, unknown>;
  const message = first?.message as { content?: unknown } | undefined;
  if (typeof message?.content === "string") return message.content.trim() || null;
  const text = first?.text;
  return typeof text === "string" ? text.trim() || null : null;
}

function usageCounts(payload: unknown, kind: ProviderConfiguration["kind"]): { inputTokens?: number; outputTokens?: number } {
  const data = payload as Record<string, unknown>;
  const usage = kind === "gemini" ? (data.usageMetadata as Record<string, unknown> | undefined) : (data.usage as Record<string, unknown> | undefined);
  if (!usage) return {};
  const inputTokens = Number(usage.prompt_token_count ?? usage.input_tokens ?? usage.promptTokens ?? usage.inputTokens);
  const outputTokens = Number(usage.completion_token_count ?? usage.output_tokens ?? usage.candidates_token_count ?? usage.outputTokens);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : undefined,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : undefined,
  };
}

async function parseJsonResponse(response: Response, providerLabel: string): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).error && typeof (payload as Record<string, unknown>).error === "object"
        ? String(((payload as Record<string, unknown>).error as Record<string, unknown>).message ?? `HTTP ${response.status}`)
        : String((payload as Record<string, unknown>).message ?? `HTTP ${response.status}`)
      : `HTTP ${response.status}`;
    throw new Error(`${providerLabel} returned ${message}`);
  }
  if (!payload) throw new Error(`${providerLabel} returned an unreadable response`);
  return payload;
}

async function browserDiscover(configuration: ProviderConfiguration, apiKey?: string): Promise<DiscoveredModel[]> {
  const headers = providerHeaders(configuration, apiKey);
  const kind = configuration.kind;
  let url = "";

  if (kind === "ollama") {
    url = endpoint(configuration, "/api/tags");
  } else if (kind === "anthropic") {
    url = endpoint(configuration, "/v1/models");
  } else if (kind === "gemini") {
    url = endpoint(configuration, "/v1beta/models");
  } else {
    url = endpoint(configuration, "/models");
  }

  const response = await fetch(url, { headers });
  const payload = await parseJsonResponse(response, configuration.label);
  const rows =
    kind === "ollama" || kind === "gemini"
      ? (payload as Record<string, unknown>).models
      : (payload as Record<string, unknown>).data;

  if (!Array.isArray(rows)) throw new Error("The provider response did not contain a model list.");

  const models = rows
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id =
        kind === "ollama" || kind === "gemini"
          ? String(data.name ?? "")
          : String(data.id ?? "");
      if (!id) return null;
      const contextWindow = Number(data.context_length ?? data.input_token_limit ?? data.contextWindow);
      return {
        id: id.replace(/^models\//, ""),
        label: String(data.display_name ?? data.name ?? data.id ?? id),
        providerId: configuration.id,
        local: configuration.location === "local",
        ...(Number.isFinite(contextWindow) ? { contextWindow } : {}),
      } satisfies DiscoveredModel;
    })
    .filter((item): item is DiscoveredModel => Boolean(item));

  if (!models.length) throw new Error("The provider returned an empty model list.");
  return models;
}

async function browserChat(
  configuration: ProviderConfiguration,
  model: string,
  system: string,
  messages: Array<{ role: ChatMessage["role"]; content: string }>,
  temperature = 0.15,
  maxOutputTokens = 1200,
  apiKey?: string,
): Promise<ChatResponse> {
  const headers = providerHeaders(configuration, apiKey);
  const kind = configuration.kind;
  let url = "";
  let body: Record<string, unknown> = {};

  if (kind === "anthropic") {
    url = endpoint(configuration, "/v1/messages");
    body = {
      model,
      max_tokens: Math.max(1, maxOutputTokens),
      temperature,
      system,
      messages,
    };
  } else if (kind === "gemini") {
    const cleanModel = model.replace(/^models\//, "");
    url = endpoint(configuration, `/v1beta/models/${cleanModel}:generateContent`);
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { temperature, maxOutputTokens: Math.max(1, maxOutputTokens) },
    };
  } else if (kind === "ollama") {
    url = endpoint(configuration, "/api/chat");
    body = {
      model,
      stream: false,
      options: { temperature, num_predict: Math.max(1, maxOutputTokens) },
      messages: [
        { role: "system", content: system },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
    };
  } else if (kind === "openai") {
    url = endpoint(configuration, "/responses");
    body = {
      model,
      instructions: system,
      input: messages.map((message) => `${message.role}: ${message.content}`).join("\n"),
      max_output_tokens: Math.max(1, maxOutputTokens),
    };
  } else {
    url = endpoint(configuration, "/chat/completions");
    body = {
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
    };
    if (!shouldOmitTemperature(configuration, model)) body.temperature = temperature;
    if (shouldUseCompletionTokenField(configuration, model)) {
      body.max_completion_tokens = Math.max(1, maxOutputTokens);
    } else {
      body.max_tokens = Math.max(1, maxOutputTokens);
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const payload = await parseJsonResponse(response, configuration.label);
  const text = responseText(payload, kind);
  if (!text) throw new Error("Provider returned no chat content.");
  const usage = usageCounts(payload, kind);
  return {
    text,
    inputTokens: usage.inputTokens ?? estimateTokens(system + messages.map((message) => message.content).join("")),
    outputTokens: usage.outputTokens ?? estimateTokens(text),
  };
}

async function browserTest(
  configuration: ProviderConfiguration,
  model: string,
  apiKey?: string,
): Promise<{ message: string; sample?: string; latencyMs: number }> {
  const started = performance.now();
  const response = await browserChat(
    configuration,
    model,
    "You are testing an AI provider connection for Lillith Writing Studio. Reply with one short sentence confirming the model is responding and include the model name.",
    [{ role: "user", content: "Return a short, friendly test response." }],
    0.1,
    120,
    apiKey,
  );
  return {
    message: `Test completed for ${configuration.label} · ${model}`,
    sample: response.text,
    latencyMs: Math.round(performance.now() - started),
  };
}

export const providerBrowserApi = {
  discover: browserDiscover,
  chat: browserChat,
  test: browserTest,
};
