import { invoke } from "@tauri-apps/api/core";
import type { ProviderConfiguration } from "../domain/providers";

export interface AiReviewFinding { id: string; category: string; severity: "error"|"warning"|"note"|"strength"; status:"open"|"planned"|"deferred"|"ignored"; title: string; problem: string; evidence: string[]; relevantContext: string[]; strategies: string[]; documentIds: string[] }
export interface AiReviewRun { id: string; scope: "chapter"|"manuscript"; focus: string; status: "running"|"completed"|"failed"; documentIds: string[]; estimatedInputTokens: number; actualInputTokens?: number; actualOutputTokens?: number; error?: string; createdAt: string; completedAt?: string; model: string; context: Record<string, unknown>; findings: AiReviewFinding[] }
const isTauri = () => "__TAURI_INTERNALS__" in window;
const key = "lillith:ai-reviews:v1";
export async function listAiReviews(): Promise<AiReviewRun[]> { return isTauri() ? invoke("list_ai_reviews") : JSON.parse(localStorage.getItem(key) || "[]"); }
export async function runAiReview(input: { scope: "chapter"|"manuscript"; focus: string; documentIds: string[]; provider: ProviderConfiguration; model: string }): Promise<AiReviewRun> {
  if (!isTauri()) throw new Error("AI review execution is available in the desktop application.");
  return invoke("run_ai_review", { request: input });
}
export async function decideAiReviewFinding(findingId:string,status:AiReviewFinding["status"]):Promise<void>{if(isTauri())return invoke("decide_ai_review_finding",{findingId,status});}
