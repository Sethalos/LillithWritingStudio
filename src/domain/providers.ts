import type { AiTask, ProviderCapabilities } from "./ai";
import type { Id } from "./models";

export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "lm-studio" | "vllm" | "openai-compatible";
export type ProviderLocation = "remote" | "local";

export interface ProviderConfiguration {
  id: Id;
  kind: ProviderKind;
  location: ProviderLocation;
  label: string;
  baseUrl: string;
  credentialRef?: string;
  hasCredential: boolean;
  enabled: boolean;
  defaultModel?: string;
  headers: Record<string, string>;
  capabilities?: ProviderCapabilities;
  lastConnection?: { status: "success" | "failure"; checkedAt: string; message: string; latencyMs?: number };
}

export interface DiscoveredModel {
  id: string;
  label: string;
  providerId: Id;
  contextWindow?: number;
  local: boolean;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
}

export interface TaskRoute {
  task: AiTask;
  label: string;
  description: string;
  providerId?: Id;
  modelId?: string;
}

export const providerDefaults: Record<ProviderKind, { label: string; baseUrl: string; location: ProviderLocation; requiresKey: boolean }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", location: "remote", requiresKey: true },
  anthropic: { label: "Anthropic", baseUrl: "https://api.anthropic.com", location: "remote", requiresKey: true },
  gemini: { label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com", location: "remote", requiresKey: true },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", location: "remote", requiresKey: true },
  ollama: { label: "Ollama", baseUrl: "http://127.0.0.1:11434", location: "local", requiresKey: false },
  "lm-studio": { label: "LM Studio", baseUrl: "http://127.0.0.1:1234/v1", location: "local", requiresKey: false },
  vllm: { label: "vLLM", baseUrl: "http://127.0.0.1:8000/v1", location: "local", requiresKey: false },
  "openai-compatible": { label: "OpenAI-compatible", baseUrl: "http://127.0.0.1:8080/v1", location: "local", requiresKey: false }
};

export const defaultTaskRoutes: TaskRoute[] = [
  { task: "primary-editor", label: "Primary editor", description: "General manuscript editing and recommendations" },
  { task: "prose-rewrite", label: "Prose rewriting", description: "Selection and scene-level revisions" },
  { task: "character-analysis", label: "Character analysis", description: "Voice, psychology, and arc checks" },
  { task: "continuity", label: "Continuity checking", description: "Timeline, knowledge, and world-rule review" },
  { task: "brainstorm", label: "Brainstorming", description: "Alternatives and story development" },
  { task: "summarization", label: "Summarization", description: "Chapter memory and context compression" },
  { task: "indexing", label: "Background indexing", description: "Extraction and local retrieval support" },
  { task: "final-polish", label: "Final polish", description: "Line and copy editing" }
];
