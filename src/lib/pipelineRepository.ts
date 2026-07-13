import { invoke } from "@tauri-apps/api/core";
import type { PipelineRun, RevisionPipeline } from "../domain/models";
import type { ProviderConfiguration } from "../domain/providers";
import type { ReviewProposal } from "./aiEditorRepository";

const isTauri = () => "__TAURI_INTERNALS__" in window;
const key = "lillith:pipelines";
const local = (): RevisionPipeline[] => {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
};

export const loadRevisionPipelines = (): Promise<RevisionPipeline[]> =>
  isTauri() ? invoke("list_revision_pipelines") : Promise.resolve(local());

export const saveRevisionPipeline = (revisionPipeline: RevisionPipeline): Promise<RevisionPipeline> => {
  if (isTauri()) return invoke("save_revision_pipeline", { revisionPipeline });
  const all = local();
  localStorage.setItem(key, JSON.stringify([...all.filter((item) => item.id !== revisionPipeline.id), revisionPipeline]));
  return Promise.resolve(revisionPipeline);
};

export const startPipelineRun = (pipelineId: string, documentIds: string[]): Promise<PipelineRun> =>
  isTauri() ? invoke("start_pipeline_run", { pipelineId, documentIds }) : Promise.resolve({
    id: crypto.randomUUID(), pipelineId, status: "queued", totalItems: documentIds.length, completedItems: 0,
    items: documentIds.map((documentId, position) => ({ id: crypto.randomUUID(), passId: "preview", documentId, position, status: "queued" })),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

export interface ProcessedPipelineItem {
  itemId: string;
  runId: string;
  status: string;
  proposal: ReviewProposal;
  remainingQueued: number;
  completedItems: number;
  totalItems: number;
}

export const processPipelineItem = (itemId: string, provider: ProviderConfiguration, model: string): Promise<ProcessedPipelineItem> =>
  invoke("process_pipeline_item", { request: { itemId, provider, model } });
