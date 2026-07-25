import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ManuscriptNode, Project, WorkspaceData } from "../domain/models";

const isTauri = () => "__TAURI_INTERNALS__" in window;
const workspaceKey = "lillith:workspace:current";
const workspaceIndexKey = "lillith:workspace:index";

export interface SavedWorkspaceSummary {
  projectId: string;
  title: string;
  updatedAt: string;
  coverImageDataUrl?: string;
}

function persistWorkspace(workspace: WorkspaceData) {
  localStorage.setItem(workspaceKey, JSON.stringify(workspace));
  localStorage.setItem(`lillith:workspace:${workspace.project.id}`, JSON.stringify(workspace));
  const existing = loadWorkspaceIndex().filter((entry) => entry.projectId !== workspace.project.id);
  existing.unshift({
    projectId: workspace.project.id,
    title: workspace.project.title || "Untitled project",
    updatedAt: workspace.project.updatedAt,
    coverImageDataUrl: workspace.project.coverImageDataUrl,
  });
  localStorage.setItem(workspaceIndexKey, JSON.stringify(existing));
}

function loadWorkspace(): WorkspaceData | null {
  const saved = localStorage.getItem(workspaceKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as WorkspaceData;
  } catch {
    return null;
  }
}

function loadWorkspaceIndex(): SavedWorkspaceSummary[] {
  const raw = localStorage.getItem(workspaceIndexKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedWorkspaceSummary[];
  } catch {
    return [];
  }
}

function createBlankProject(title = "Untitled project", coverImageDataUrl?: string): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    coverImageDataUrl,
    locale: "en-US",
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankWorkspace(title = "Untitled project", coverImageDataUrl?: string): WorkspaceData {
  const project = createBlankProject(title, coverImageDataUrl);
  const now = new Date().toISOString();
  const bookId = crypto.randomUUID();
  const chapterId = crypto.randomUUID();
  const sceneId = crypto.randomUUID();
  return {
    project,
    nodes: [
      { id: bookId, projectId: project.id, kind: "book", title: "", position: 0, wordCount: 0, revision: 0, updatedAt: now },
      { id: chapterId, projectId: project.id, parentId: bookId, kind: "chapter", title: "", synopsis: "", position: 0, wordCount: 0, revision: 0, updatedAt: now },
      { id: sceneId, projectId: project.id, parentId: chapterId, kind: "scene", title: "", position: 0, wordCount: 0, revision: 0, updatedAt: now, sceneType: "mixed", sceneLocation: "", content: "<p></p>" },
    ],
  };
}

export async function saveDocument(node: ManuscriptNode, content: string): Promise<number> {
  if (isTauri()) return invoke<number>("save_vault_document", { documentId: node.id, content, expectedRevision: node.revision });
  localStorage.setItem(`lillith:document:${node.id}`, content);
  await new Promise((resolve) => setTimeout(resolve, 220));
  return node.revision + 1;
}

export function saveCurrentWorkspace(workspace: WorkspaceData): void {
  if (isTauri()) return;
  persistWorkspace(workspace);
}

export function loadCurrentWorkspace(): WorkspaceData | null {
  return loadWorkspace();
}

export async function loadTauriWorkspace(): Promise<WorkspaceData | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<WorkspaceData>("load_vault_workspace");
  } catch {
    return null;
  }
}

export function listSavedWorkspaces(): WorkspaceData[] {
  return loadWorkspaceIndex().map((entry) => {
    const saved = localStorage.getItem(`lillith:workspace:${entry.projectId}`);
    if (!saved) {
      return {
        project: {
          id: entry.projectId,
          title: entry.title,
          coverImageDataUrl: entry.coverImageDataUrl,
          locale: "en-US",
          createdAt: entry.updatedAt,
          updatedAt: entry.updatedAt,
        },
        nodes: [],
      };
    }
    try {
      return JSON.parse(saved) as WorkspaceData;
    } catch {
      return {
        project: {
          id: entry.projectId,
          title: entry.title,
          coverImageDataUrl: entry.coverImageDataUrl,
          locale: "en-US",
          createdAt: entry.updatedAt,
          updatedAt: entry.updatedAt,
        },
        nodes: [],
      };
    }
  });
}

export async function chooseAndOpenProject(): Promise<WorkspaceData | null> {
  if (!isTauri()) return loadWorkspace();
  const selected = await open({ directory: true, multiple: false, title: "Open a Lillith Writing Studio project" });
  if (!selected) return null;
  return invoke<WorkspaceData>("open_vault_project", { projectPath: selected });
}

export async function chooseAndCreateProject(title: string, coverImageDataUrl?: string): Promise<WorkspaceData | null> {
  if (!isTauri()) {
    const workspace = createBlankWorkspace(title, coverImageDataUrl);
    persistWorkspace(workspace);
    return workspace;
  }
  const selected = await open({ directory: true, multiple: false, title: "Choose where to create your project" });
  if (!selected) return null;
  return invoke<WorkspaceData>("create_vault_project", { parentPath: selected, title });
}

export async function createManuscriptNode(parentId: string, kind: "chapter" | "scene", title: string, projectId: string): Promise<ManuscriptNode> {
  if (isTauri()) return invoke<ManuscriptNode>("create_manuscript_node", { parentId, kind, title });
  return { id: crypto.randomUUID(), projectId, parentId, kind, title, position: Date.now(), wordCount: 0, content: kind === "scene" ? "<p></p>" : undefined, revision: 0, updatedAt: new Date().toISOString() };
}

export async function reorderManuscriptNodes(parentId:string,orderedIds:string[],nodes:ManuscriptNode[]):Promise<ManuscriptNode[]>{
  if(isTauri())return invoke<ManuscriptNode[]>("reorder_manuscript_nodes",{parentId,orderedIds});
  const order=new Map(orderedIds.map((id,index)=>[id,index]));
  return nodes.map((node)=>node.parentId===parentId&&order.has(node.id)?{...node,position:order.get(node.id)!}:node);
}
export async function updateManuscriptMetadata(node:ManuscriptNode,patch:{sceneGoal?:string;wordGoal?:number;tags:string[];povCharacterId?:string;sceneType?:ManuscriptNode["sceneType"];sceneLocation?:string}):Promise<ManuscriptNode>{if(isTauri())return invoke("update_manuscript_metadata",{documentId:node.id,sceneGoal:patch.sceneGoal||null,wordGoal:patch.wordGoal??null,tags:patch.tags,povCharacterId:patch.povCharacterId||null,sceneType:patch.sceneType??null,sceneLocation:patch.sceneLocation||null});return{...node,...patch,updatedAt:new Date().toISOString()}}

export function loadLocalDocument(node: ManuscriptNode): string {
  return localStorage.getItem(`lillith:document:${node.id}`) ?? node.content ?? "<p></p>";
}
