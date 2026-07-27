import type { Id } from "./models";

export type AiTask = "primary-editor" | "prose-rewrite" | "brainstorm" | "continuity" | "character-analysis" | "indexing" | "summarization" | "final-polish" | "research";
export type ContextSource = "selection" | "scene" | "chapter" | "nearby-chapter" | "character" | "voice-lock" | "character-state" | "relationship" | "timeline" | "story-bible" | "research" | "world-rule" | "revision-decision" | "writing-preference" | "series-continuity" | "pinned";

export interface ContextItem {
  id: Id;
  source: ContextSource;
  sourceEntityId?: Id;
  sourceVersion?: string;
  title: string;
  content: string;
  relevance: number;
  reason: string;
  tokenEstimate: number;
  pinned: boolean;
  storyPositionId?: Id;
  contentHash: string;
}

export interface ContextPackage {
  version: "1";
  id: Id;
  projectId: Id;
  task: AiTask;
  target: { documentId: Id; from?: number; to?: number; selectedText?: string };
  storyPositionId?: Id;
  items: ContextItem[];
  exclusions: Array<{ source: ContextSource; reason: string }>;
  estimatedInputTokens: number;
  tokenBudget: number;
  estimatedCost?: { currency: "USD"; minimum: number; maximum: number };
  assembledAt: string;
  assemblerVersion: string;
}

export interface ProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  embeddings: boolean;
  toolUse: boolean;
  vision: boolean;
  tokenCounting: "exact" | "estimated";
}

export interface ModelDescriptor { id: string; label: string; contextWindow?: number; capabilities: ProviderCapabilities }
export interface GenerationRequest { model: string; system: string; messages: Array<{ role: "user" | "assistant"; content: string }>; temperature?: number; maxOutputTokens?: number; responseSchema?: object; contextPackageId: Id }
export interface GenerationChunk { text?: string; usage?: { inputTokens: number; outputTokens: number }; finishReason?: string }

export type ChatRole = "user" | "assistant";
export interface ChatAttachment {
  name: string;
  mimeType: string;
  dataUrl?: string;
  text?: string;
  size: number;
}
export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}
export interface ManuscriptProposal {
  action: "append";
  text: string;
}
export interface ChatResponse {
  text: string;
  proposal?: ManuscriptProposal;
  // The reply hit the output cap mid-JSON; only salvaged prose reached the writer.
  truncated?: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiProvider {
  readonly id: string;
  readonly label: string;
  capabilities(): Promise<ProviderCapabilities>;
  listModels(signal?: AbortSignal): Promise<ModelDescriptor[]>;
  estimateTokens(text: string, model: string): Promise<number>;
  generate(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationChunk>;
  stream(request: GenerationRequest, signal?: AbortSignal): AsyncIterable<GenerationChunk>;
  embed?(texts: string[], model: string, signal?: AbortSignal): Promise<number[][]>;
}

export type ProposalDecision = "pending" | "accepted" | "rejected" | "deferred" | "edited";
export type EditingMode = "suggest-only" | "tracked-rewrite" | "direct-apply";
export interface ChangeProposal {
  id: Id;
  runId: Id;
  documentId: Id;
  baseRevision: number;
  baseContentHash: string;
  range: { from: number; to: number };
  before: string;
  after: string;
  issue: string;
  rationale: string;
  evidence: string[];
  strategies: string[];
  contextPackageId: Id;
  decision: ProposalDecision;
  createdAt: string;
  decidedAt?: string;
}
