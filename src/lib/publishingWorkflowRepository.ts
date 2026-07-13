import type { PublishingWorkflowState } from "../domain/publishing";
import { blankPublishingWorkflow, normalizePublishingWorkflow } from "../domain/publishing";
import { invoke } from "@tauri-apps/api/core";

const isTauri = () => "__TAURI_INTERNALS__" in window;
const workflowKey = (projectId: string) => `lillith:publishing-workflow:v1:${projectId}`;

export async function loadPublishingWorkflow(projectId: string, projectTitle: string): Promise<PublishingWorkflowState> {
  const blank = blankPublishingWorkflow(projectId, projectTitle);
  if (isTauri()) {
    const stored = await invoke<PublishingWorkflowState | null>("load_publishing_workflow");
    return stored ? normalizePublishingWorkflow(stored, projectTitle) : blank;
  }
  try {
    const stored = localStorage.getItem(workflowKey(projectId));
    if (!stored) return blank;
    return normalizePublishingWorkflow(JSON.parse(stored) as PublishingWorkflowState, projectTitle);
  } catch {
    return blank;
  }
}

export async function persistPublishingWorkflow(workflow: PublishingWorkflowState, projectTitle: string): Promise<PublishingWorkflowState> {
  const saved: PublishingWorkflowState = {
    ...normalizePublishingWorkflow(workflow, projectTitle),
    updatedAt: new Date().toISOString(),
  };
  if (isTauri()) await invoke("save_publishing_workflow", { publishingWorkflow: saved });
  else localStorage.setItem(workflowKey(saved.projectId), JSON.stringify(saved));
  return saved;
}
