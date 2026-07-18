import { invoke } from "@tauri-apps/api/core";
import type { ChatMessage, ChatResponse } from "../domain/ai";
import type { ProviderConfiguration } from "../domain/providers";
import { loadBrowserProviderSecret, providerBrowserApi } from "./providerBrowserApi";

const isTauri = () => "__TAURI_INTERNALS__" in window;

export async function runAiChat(input: {
  provider: ProviderConfiguration;
  model: string;
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<ChatResponse> {
  if (isTauri()) {
    return invoke<ChatResponse>("run_ai_chat", {
      request: {
        provider: input.provider,
        model: input.model,
        system: input.system,
        messages: input.messages,
        temperature: input.temperature ?? null,
        maxOutputTokens: input.maxOutputTokens ?? null,
      },
    });
  }

  const secret = loadBrowserProviderSecret(input.provider.id);
  if (input.provider.location === "remote" && !secret) {
    throw new Error(`Save an API key for ${input.provider.label} in Models before using AI chat.`);
  }

  return providerBrowserApi.chat(
    input.provider,
    input.model,
    input.system,
    input.messages,
    input.temperature ?? 0.15,
    input.maxOutputTokens ?? 1200,
    secret ?? undefined,
  );
}
