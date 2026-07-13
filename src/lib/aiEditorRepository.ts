import { invoke } from "@tauri-apps/api/core";
import type { ContextItem, ProposalDecision } from "../domain/ai";
import type { Character, ManuscriptNode } from "../domain/models";
import type { ProviderConfiguration } from "../domain/providers";
import type { BibleEntity } from "../domain/models";
import type {SemanticResult} from "./semanticRepository";
import type{ResearchContextItem}from"./researchRepository";

export interface ReviewProposal { id: string; runId: string; documentId: string; baseRevision: number; baseContentHash: string; before: string; after: string; issue: string; rationale: string; evidence: string[]; strategies: string[]; contextPackageId: string; decision: ProposalDecision; createdAt: string }
export interface EditorRunResult { proposal: ReviewProposal; contextItems: ContextItem[]; estimatedInputTokens: number; actualInputTokens?:number;actualOutputTokens?:number;providerLabel: string; model: string }
export interface AcceptedProposal { content: string; revision: number; proposalId: string }
const isTauri = () => "__TAURI_INTERNALS__" in window;

export async function executeEditorOperation(input: { document: ManuscriptNode; selectedText: string; instruction: string; provider: ProviderConfiguration; model: string; character?: Character & Record<string, unknown>; storyBible?: BibleEntity[];semanticContext?:SemanticResult[];researchContext?:ResearchContextItem[] }): Promise<EditorRunResult> {
  if (isTauri()) return invoke<EditorRunResult>("run_editor_operation", { request: { documentId: input.document.id, selectedText: input.selectedText, instruction: input.instruction, provider: input.provider, model: input.model, character: input.character, storyBible: input.storyBible,semanticContext:input.semanticContext,researchContext:input.researchContext } });
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { proposal: { id: crypto.randomUUID(), runId: crypto.randomUUID(), documentId: input.document.id, baseRevision: input.document.revision, baseContentHash: "browser-demo", before: input.selectedText, after: input.selectedText, issue: "Browser preview cannot call a configured desktop provider.", rationale: "Run the Tauri desktop application for local credentials and model execution.", evidence: ["The selected text was captured."], strategies: ["Open the desktop build"], contextPackageId: crypto.randomUUID(), decision: "pending", createdAt: new Date().toISOString() }, contextItems: [], estimatedInputTokens: 0, providerLabel: input.provider.label, model: input.model };
}

export async function acceptTrackedProposal(proposal: ReviewProposal, currentContent: string): Promise<AcceptedProposal> {
  if (isTauri()) return invoke<AcceptedProposal>("accept_editor_proposal", { proposalId: proposal.id });
  return { content: currentContent.replace(proposal.before, proposal.after), revision: proposal.baseRevision + 1, proposalId: proposal.id };
}

export async function decideTrackedProposal(proposalId: string, decision: "rejected" | "deferred"): Promise<void> {
  if (isTauri()) await invoke("decide_editor_proposal", { proposalId, decision });
}
