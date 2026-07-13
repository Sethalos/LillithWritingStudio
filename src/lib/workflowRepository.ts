import { invoke } from "@tauri-apps/api/core";
import type { Character, ManuscriptNode, Project } from "../domain/models";
import { createBlankWorkflowState, inferWorkflowState, type WorkflowState } from "../domain/workflow";

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const workflowKey = (projectId: string) => `lillith:workflow-state:v1:${projectId}`;

function readBrowserState(projectId: string): WorkflowState | null {
  const stored = localStorage.getItem(workflowKey(projectId));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as WorkflowState;
  } catch {
    return null;
  }
}

export async function loadWorkflowState(project: Project, nodes: ManuscriptNode[], characters: Character[]): Promise<WorkflowState> {
  const inferred = inferWorkflowState(project, nodes, characters, createBlankWorkflowState(project));
  if (isTauri()) {
    const stored = await invoke<WorkflowState | null>("load_workflow_state");
    return stored ? inferWorkflowState(project, nodes, characters, stored) : inferred;
  }
  const stored = readBrowserState(project.id);
  return stored ? inferWorkflowState(project, nodes, characters, stored) : inferred;
}

export async function persistWorkflowState(workflow: WorkflowState): Promise<WorkflowState> {
  const saved: WorkflowState = { ...workflow, updatedAt: new Date().toISOString() };
  if (isTauri()) {
    await invoke("save_workflow_state", { workflowState: saved });
  } else {
    localStorage.setItem(workflowKey(saved.projectId), JSON.stringify(saved));
  }
  return saved;
}
