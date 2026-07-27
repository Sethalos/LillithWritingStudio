import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowRight, ChevronDown, CircleHelp, Search, Settings, ShieldCheck } from "lucide-react";
import { Binder } from "./components/Binder";
import { EditorPane } from "./components/EditorPane";
import { ManuscriptTree } from "./components/ManuscriptTree";
import { AiPanel } from "./components/AiPanel";
import { WorkflowDashboard } from "./components/WorkflowDashboard";
import type { CommentSelection } from "./components/CommentsPanel";
import { LazyBoundary } from "./components/LazyBoundary";
import type { EditingMode, ProposalDecision } from "./domain/ai";
import type { ContextPackage } from "./domain/ai";
import type { Character, WorkspaceData } from "./domain/models";
import { createBlankWorkflowState, workflowPhases, type WorkflowPhaseId, type WorkflowState, type WorkflowWorkspaceTarget } from "./domain/workflow";
import { createBlankWorkspace, createManuscriptNode, deleteManuscriptNode, loadCurrentWorkspace, loadLocalDocument, renameManuscriptNode, reorderManuscriptNodes, saveCurrentWorkspace, saveDocument, updateManuscriptMetadata } from "./lib/repository";
import { blankCharacter, loadCharacters, persistCharacter } from "./lib/characterRepository";
import { acceptTrackedProposal, decideTrackedProposal, executeEditorOperation, type ProposalSegmentDecision, type ReviewProposal } from "./lib/aiEditorRepository";
import { configuredExecution, estimateExecutionCost } from "./lib/providerRepository";
import { loadCharacterArcs, loadCharacterStates, loadRelationships } from "./lib/characterIntelligenceRepository";
import { retrieveBibleContext } from "./lib/storyBibleRepository";
import {retrieveSemanticContext} from "./lib/semanticRepository";
import {retrieveResearchContext} from "./lib/researchRepository";
import { loadWorkflowState, persistWorkflowState } from "./lib/workflowRepository";
import { extractManuscriptMemory, loadMemoryActivities, type MemoryActivity } from "./lib/manuscriptMemoryRepository";
import "./loading.css";

const CharacterPanel=lazy(()=>import("./components/CharacterPanel").then(module=>({default:module.CharacterPanel})));
const CommandDashboard=lazy(()=>import("./components/CommandDashboard").then(module=>({default:module.CommandDashboard})));
const ModelPanel=lazy(()=>import("./components/ModelPanel").then(module=>({default:module.ModelPanel})));
const StoryBiblePanel=lazy(()=>import("./components/StoryBiblePanel").then(module=>({default:module.StoryBiblePanel})));
const ImportExportPanel=lazy(()=>import("./components/ImportExportPanel").then(module=>({default:module.ImportExportPanel})));
const PublishingPanel=lazy(()=>import("./components/PublishingPanel").then(module=>({default:module.PublishingPanel})));
const AnalysisPanel=lazy(()=>import("./components/AnalysisPanel").then(module=>({default:module.AnalysisPanel})));
const HistoryPanel=lazy(()=>import("./components/HistoryPanel").then(module=>({default:module.HistoryPanel})));
const VisualizationsPanel=lazy(()=>import("./components/VisualizationsPanel").then(module=>({default:module.VisualizationsPanel})));
const PipelinePanel=lazy(()=>import("./components/PipelinePanel").then(module=>({default:module.PipelinePanel})));
const SettingsPanel=lazy(()=>import("./components/SettingsPanel").then(module=>({default:module.SettingsPanel})));
const CommentsPanel=lazy(()=>import("./components/CommentsPanel").then(module=>({default:module.CommentsPanel})));
const ResearchPanel=lazy(()=>import("./components/ResearchPanel").then(module=>({default:module.ResearchPanel})));
const SeriesPanel=lazy(()=>import("./components/SeriesPanel").then(module=>({default:module.SeriesPanel})));
const ObsidianPanel=lazy(()=>import("./components/ObsidianPanel").then(module=>({default:module.ObsidianPanel})));
const ProjectLauncher=lazy(()=>import("./components/ProjectLauncher").then(module=>({default:module.ProjectLauncher})));

type Inspector = "dashboard" | "workflow" | "manuscript" | "character" | "ai" | "bible" | "models" | "files" | "analysis" | "history" | "visuals" | "pipelines" | "settings" | "comments" | "research" | "series" | "publishing" | "obsidian";

const primaryNavigation: Array<{ id: Inspector; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workflow", label: "Project Workflow" },
  { id: "manuscript", label: "Manuscript" },
];

export function App() {
  const initialWorkspace = loadCurrentWorkspace() ?? createBlankWorkspace();
  const emptyContext:ContextPackage={version:"1",id:crypto.randomUUID(),projectId:initialWorkspace.project.id,task:"prose-rewrite",target:{documentId:initialWorkspace.nodes.find(node=>node.kind==="scene")?.id??""},items:[],exclusions:[],estimatedInputTokens:0,tokenBudget:12000,assembledAt:new Date().toISOString(),assemblerVersion:"1.0.0"};
  const [project, setProject] = useState(initialWorkspace.project);
  const [nodes, setNodes] = useState(initialWorkspace.nodes);
  const [activeId, setActiveId] = useState(() => initialWorkspace.nodes.find((node) => node.kind === "scene")?.id ?? initialWorkspace.nodes[0]?.id ?? "scene-1");
  const active = useMemo(() => nodes.find((node) => node.id === activeId && node.kind === "scene") ?? nodes.find((node) => node.kind === "scene")!, [activeId, nodes]);
  const [content, setContent] = useState(() => loadLocalDocument(active));
  const [inspector, setInspector] = useState<Inspector>("dashboard");
  const [decision, setDecision] = useState<ProposalDecision>("pending");
  const [saveState, setSaveState] = useState("Saved locally");
  const [editorModel, setEditorModel] = useState("No editor model configured");
  const [showLauncher, setShowLauncher] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [memoryActivities,setMemoryActivities]=useState<MemoryActivity[]>(()=>loadMemoryActivities(initialWorkspace.project.id));
  const [workflow, setWorkflow] = useState<WorkflowState>(() => createBlankWorkflowState(initialWorkspace.project));
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [activeProposal, setActiveProposal] = useState<ReviewProposal>();
  const [activeContext, setActiveContext] = useState<ContextPackage>(emptyContext);
  const [aiRunning, setAiRunning] = useState(false);
  const [requestedEditingMode,setRequestedEditingMode]=useState<EditingMode>("tracked-rewrite");
  const [aiError, setAiError] = useState("");
  // `aiError` only renders inside AiPanel, which is mounted on the "ai" and
  // "manuscript" routes. Project-settings failures happen on the default
  // "dashboard" route, where nothing could show them: a corrupt workflow.json
  // propagated all the way here and then vanished, leaving the writer an empty
  // dashboard whose first edit overwrote their real settings with blanks.
  // This banner sits between the topbar and the workspace body, so it is visible
  // on every route including the dashboard.
  const [workflowError, setWorkflowError] = useState("");
  const [commentSelection,setCommentSelection]=useState<CommentSelection>();
  const [commentAnchorText,setCommentAnchorText]=useState<string>();
  const lastSaved = useRef(content);
  // `content` belongs to `openId.current`, not necessarily to `active`: when the
  // writer switches scenes, the render that brings in the new `active` still
  // carries the outgoing scene's text. These refs let the swap effect below flush
  // that text before it is replaced. `nodes` is read through a ref so the flush
  // always writes against the freshest revision rather than a stale closure.
  const contentRef = useRef(content);
  const nodesRef = useRef(nodes);
  const openId = useRef(active.id);
  contentRef.current = content;
  nodesRef.current = nodes;
  useEffect(() => {
    const previousId = openId.current;
    const pending = contentRef.current;
    // Autosave is debounced by 700ms; switching scenes inside that window used to
    // clear the timer and then overwrite `content`, losing the sentence the writer
    // had just typed. Flush it first — saveDocument is the only thing that persists.
    if (previousId !== active.id && pending !== lastSaved.current) {
      const previous = nodesRef.current.find((node) => node.id === previousId);
      if (previous) {
        setSaveState("Saving…");
        void saveDocument(previous, pending)
          .then((revision) => { setNodes((all) => all.map((node) => node.id === previousId ? { ...node, content: pending, revision } : node)); setSaveState("Saved locally"); })
          .catch((error) => setSaveState(String(error).includes("stale edit") ? "Save conflict — reopen section" : "Save needs attention"));
      }
    }
    const next = loadLocalDocument(active);
    openId.current = active.id;
    contentRef.current = next;
    lastSaved.current = next;
    setContent(next);
  }, [active.id]);
  useEffect(() => { if (content === lastSaved.current) return; const timer = window.setTimeout(async () => { setSaveState("Saving…"); try { const revision = await saveDocument(active, content); lastSaved.current = content; setNodes((all) => all.map((node) => node.id === active.id ? { ...node, content, revision } : node)); setSaveState("Saved locally"); } catch (error) { setSaveState(String(error).includes("stale edit") ? "Save conflict — reopen section" : "Save needs attention"); } }, 700); return () => window.clearTimeout(timer); }, [active, content]);
  useEffect(()=>{const plain=content.replace(/<[^>]+>/g," ").trim();const execution=configuredExecution("indexing")??configuredExecution("character-analysis")??configuredExecution("primary-editor");if(!execution||plain.length<40||content!==lastSaved.current)return;const memoryKey=`lillith:memory-source:v1:${project.id}:${active.id}`;if(localStorage.getItem(memoryKey)===content)return;const timer=window.setTimeout(()=>{setSaveState("Saved · Lillith is updating memory…");void extractManuscriptMemory({projectId:project.id,document:active,content,provider:execution.provider,model:execution.model}).then(result=>{localStorage.setItem(memoryKey,content);setCharacters(result.characters);setMemoryActivities(loadMemoryActivities(project.id));setSaveState(result.activity.details.length?`Saved · memory updated (${result.activity.details.length})`:"Saved · memory checked")}).catch(error=>{setSaveState("Saved locally");setAiError(`Project memory: ${String(error)}`)})},2500);return()=>window.clearTimeout(timer)},[active,content,project.id]);
  useEffect(() => { saveCurrentWorkspace({ project, nodes }); }, [project, nodes]);
  useEffect(() => {
    let cancelled = false;
    void loadWorkflowState(project, nodes, characters).then((next) => {
      if (!cancelled) { setWorkflow(next); setWorkflowError(""); }
    }).catch((error) => {
      // Do NOT fall back to inferred defaults here: leaving the loaded-but-wrong
      // state in place and saying so is what stops the next dashboard edit from
      // persisting blanks over the writer's real settings.
      if (!cancelled) setWorkflowError(`Your project settings could not be loaded, so nothing shown here is authoritative — editing them may overwrite the saved file. ${String(error)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [project, nodes, characters]);
  const useWorkspace = async (workspace: WorkspaceData) => { setProject(workspace.project); setNodes(workspace.nodes); saveCurrentWorkspace(workspace); setMemoryActivities(loadMemoryActivities(workspace.project.id)); const firstScene = workspace.nodes.find((node) => node.kind === "scene"); if (firstScene) setActiveId(firstScene.id); const loaded = await loadCharacters(workspace.project.id); setCharacters(loaded); setSelectedCharacterId(loaded[0]?.id ?? ""); setActiveProposal(undefined); setSelectedText(""); setActiveContext({version:"1",id:crypto.randomUUID(),projectId:workspace.project.id,task:"prose-rewrite",target:{documentId:firstScene?.id??""},items:[],exclusions:[],estimatedInputTokens:0,tokenBudget:12000,assembledAt:new Date().toISOString(),assemblerVersion:"1.0.0"}); setEditorModel("No editor model configured"); setSaveState(`Opened ${workspace.project.title || "current project"}`); setInspector("dashboard"); setShowLauncher(false); };
  const createNode = async (kind: "chapter" | "scene", title: string, explicitParentId?: string) => { const activeChapter = active.kind === "scene" ? active.parentId : active.kind === "chapter" ? active.id : undefined; const parentId = explicitParentId ?? (kind === "chapter" ? nodes.find((node) => node.kind === "book")?.id : activeChapter ?? nodes.find((node) => node.kind === "chapter")?.id); if (!parentId) throw new Error(`Create a ${kind === "scene" ? "chapter" : "book"} first.`); const node = await createManuscriptNode(parentId, kind, title, project.id); setNodes((all) => [...all, node]); setActiveId(node.id); };
  const renameNode = async (id: string, title: string) => { const target = nodes.find((node) => node.id === id); if (!target) return; const updated = await renameManuscriptNode(target, title); setNodes((all) => all.map((node) => (node.id === updated.id ? updated : node))); };
  // Deleting the last scene would leave `active` with nothing to fall back to (its
  // memo does `nodes.find(...scene) ?? nodes.find(...scene)!` — a non-null assertion
  // that throws once no scene remains), so refuse that case outright. Otherwise, when
  // the removed scene is the open one, move `activeId` to a surviving scene *before*
  // dropping the node from `nodes` so the two state updates land in the same render.
  const deleteNode = async (id: string) => { const target = nodes.find((node) => node.id === id); if (!target) return; const isLastScene = target.kind === "scene" && !nodes.some((node) => node.kind === "scene" && node.id !== id); if (isLastScene) throw new Error("Add another scene before deleting the last one."); await deleteManuscriptNode(target); if (id === activeId) { const survivor = nodes.find((node) => node.kind === "scene" && node.id !== id); if (survivor) setActiveId(survivor.id); } setNodes((all) => all.filter((node) => node.id !== id)); };
  const startComment=async(selection:CommentSelection)=>{try{if(content!==lastSaved.current){setSaveState("Saving…");const revision=await saveDocument(active,content);lastSaved.current=content;setNodes(all=>all.map(node=>node.id===active.id?{...node,content,revision}:node));setSaveState("Saved locally")}setCommentSelection(selection);setInspector("comments")}catch(error){setSaveState("Save needs attention");setAiError(String(error))}};
  const saveWorkflow = async (next: WorkflowState) => {
    // Optimistic, but rolled back on failure: showing the new genre while disk
    // holds nothing is how a writer comes to trust a setting that was never saved.
    const previous = workflow;
    setWorkflow(next);
    try {
      const saved = await persistWorkflowState(next);
      setWorkflow(saved);
      setWorkflowError("");
    } catch (error) {
      setWorkflow(previous);
      setWorkflowError(`Your project settings could not be saved, so this change was undone. ${String(error)}`);
    }
  };
  const routeWorkspace = (target: WorkflowWorkspaceTarget) => {
    if (target === "workflow") {
      setInspector("workflow");
      return;
    }
    if (target === "manuscript") {
      resumeManuscript();
      setInspector("manuscript");
      return;
    }
    if (target === "character") {
      setInspector("character");
      return;
    }
    setInspector(target as Inspector);
  };
  const resumeManuscript = () => {
    const target = workflow.activeManuscriptId ?? nodes.find((node) => node.kind === "scene")?.id ?? active.id;
    if (target) setActiveId(target);
    const editor = document.getElementById("manuscript-editor");
    editor?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const currentWorkflowPhase = useMemo(() => workflowPhases.find((phase) => phase.id === workflow.currentPhaseId) ?? workflowPhases[0], [workflow.currentPhaseId]);
  const advanceWorkflowPhase = () => {
    const recommendation = workflow.recommendation;
    if (recommendation.workspaceTarget === "workflow" && recommendation.phaseId !== workflow.currentPhaseId) {
      void saveWorkflow({ ...workflow, currentPhaseId: recommendation.phaseId, source: "inferred" });
    }
    routeWorkspace(recommendation.workspaceTarget);
  };
  const phaseWorkspaceTitle = useMemo(() => {
    if (inspector === "dashboard") return "Dashboard";
    if (inspector === "character") return "Characters";
    if (inspector === "manuscript") return "Drafting workspace";
    if (inspector === "ai") return "AI Editor";
    if (inspector === "bible") return "Story Bible";
    if (inspector === "research") return "Research";
    if (inspector === "analysis") return "Analysis";
    if (inspector === "pipelines") return "Pipelines";
    if (inspector === "publishing") return "Publishing";
    if (inspector === "models") return "Models";
    if (inspector === "files") return "Files";
    if (inspector === "series") return "Series";
    if (inspector === "history") return "History";
    if (inspector === "comments") return "Comments";
    if (inspector === "visuals") return "Visuals";
    if (inspector === "settings") return "Settings";
    if (inspector === "obsidian") return "Obsidian Vault";
    return currentWorkflowPhase.displayName;
  }, [inspector, currentWorkflowPhase.displayName]);
  const runEditor = async (instruction: string) => { setAiError(""); if (!selectedText.trim()) { setAiError("Select manuscript text before running an editing action."); return; } const execution = configuredExecution("prose-rewrite") ?? configuredExecution("primary-editor"); if (!execution) { setAiError("Configure a provider and prose-rewriting model in the Models tab first."); return; } setAiRunning(true); try { if (content !== lastSaved.current) { const revision = await saveDocument(active, content); lastSaved.current = content; setNodes((all) => all.map((node) => node.id === active.id ? { ...node, content, revision } : node)); } const speakingCharacter = characters.find((item) => item.id === (active.povCharacterId ?? selectedCharacterId)); let characterContext: (typeof speakingCharacter & Record<string, unknown>) | undefined; if (speakingCharacter) { const [allStates, relationships, arcs] = await Promise.all([loadCharacterStates(speakingCharacter.id),loadRelationships(),loadCharacterArcs(speakingCharacter.id)]); const orderedStoryNodes=nodes.filter(node=>node.kind==="chapter").sort((a,b)=>a.position-b.position).flatMap(chapter=>[chapter,...nodes.filter(node=>node.parentId===chapter.id&&node.kind==="scene").sort((a,b)=>a.position-b.position)]); const activeIndex=orderedStoryNodes.findIndex(node=>node.id===active.id); const applicable=allStates.filter(state=>{const from=orderedStoryNodes.findIndex(node=>node.id===state.effectiveFromNodeId);const to=state.effectiveToNodeId?orderedStoryNodes.findIndex(node=>node.id===state.effectiveToNodeId):-1;return from>=0&&from<=activeIndex&&(to<0||activeIndex<=to)}); characterContext={...speakingCharacter,dynamicStates:applicable,relationships:relationships.filter(item=>item.fromCharacterId===speakingCharacter.id||item.toCharacterId===speakingCharacter.id),arcs,workflow:{currentPhaseId:workflow.currentPhaseId,projectStatus:workflow.projectStatus,projectBrief:workflow.projectBrief,creativeNorthStar:workflow.creativeNorthStar,unresolvedDecisionIds:workflow.unresolvedDecisionIds,draftingReadiness:workflow.draftingReadiness}}; } const retrievalQuery=`${selectedText} ${speakingCharacter?.identity.fullName??""}`;const [bible,semanticContext,researchContext]=await Promise.all([retrieveBibleContext(retrievalQuery,8),retrieveSemanticContext(retrievalQuery,active.id,6),retrieveResearchContext(retrievalQuery,active.id,6)]); const result = await executeEditorOperation({ document: active, selectedText, instruction, provider: execution.provider, model: execution.model, character: characterContext, storyBible:bible,semanticContext,researchContext }); setActiveProposal(result.proposal); setDecision("pending"); setEditorModel(`${result.providerLabel} · ${result.model}`); setActiveContext({ version:"1", id:result.proposal.contextPackageId, projectId:project.id, task:"prose-rewrite", target:{ documentId:active.id, selectedText }, items:result.contextItems, exclusions:[], estimatedInputTokens:result.actualInputTokens??result.estimatedInputTokens, tokenBudget:12000, estimatedCost:(()=>{const estimate=estimateExecutionCost("prose-rewrite",result.actualInputTokens??result.estimatedInputTokens,result.actualOutputTokens??1200);return estimate?.priced?{currency:"USD" as const,minimum:estimate.minimum,maximum:estimate.maximum}:undefined})(), assembledAt:new Date().toISOString(), assemblerVersion:"1.0.0" }); } catch (error) { setAiError(String(error)); } finally { setAiRunning(false); } };
  const decideProposal = async (next: ProposalDecision, replacement?: string, segments?:ProposalSegmentDecision[]) => { if (!activeProposal) return; if (next === "accepted" || next === "edited") { try { const accepted = await acceptTrackedProposal(activeProposal, content, replacement,segments); lastSaved.current = accepted.content; setContent(accepted.content); setNodes((all) => all.map((node) => node.id === active.id ? { ...node, content: accepted.content, revision: accepted.revision } : node)); setDecision(next); setSaveState("Reviewed AI change saved with a local snapshot"); } catch (error) { setAiError(String(error)); } } else if (next === "rejected" || next === "deferred") { try { await decideTrackedProposal(activeProposal.id, next); setDecision(next); } catch (error) { setAiError(String(error)); } } };
  const keepChatText = (text:string) => {
    const escaped=text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    const addition=escaped.split(/\n{2,}/).map(paragraph=>`<p>${paragraph.replaceAll("\n","<br>")}</p>`).join("");
    const empty=/^\s*<p>\s*<\/p>\s*$/i.test(content);
    setContent(empty?addition:`${content}${addition}`);
    setSaveState("Adding accepted Lillith draft…");
  };

  useEffect(()=>{if(requestedEditingMode!=="direct-apply"||!activeProposal||decision!=="pending")return;void decideProposal("accepted",activeProposal.after).finally(()=>setRequestedEditingMode("tracked-rewrite"));},[activeProposal?.id,requestedEditingMode]);

  return <div className="app-frame"><a className="skip-link" href="#manuscript-editor">Skip to manuscript editor</a>
    <Binder
      projectTitle={project.title}
      onProjectMenu={() => setShowLauncher(true)}
      currentPhaseLabel={currentWorkflowPhase.displayName}
      nextActionLabel={workflow.recommendation.title}
      activeWorkspace={inspector}
      onNavigateWorkspace={(workspace) => {
        if (workspace === "workflow") setInspector("workflow");
        else setInspector(workspace as Inspector);
      }}
      onResumeManuscript={resumeManuscript}
    />
    {inspector === "manuscript" && (
      <ManuscriptTree
        nodes={nodes}
        activeId={active.id}
        onSelect={setActiveId}
        onCreate={(kind, parentId) => { void createNode(kind, kind === "scene" ? "New scene" : "New chapter", parentId).catch((error) => setAiError(String(error))); }}
        onRename={(id, title) => { void renameNode(id, title).catch((error) => setAiError(String(error))); }}
        onDelete={(id) => { void deleteNode(id).catch((error) => setAiError(String(error))); }}
      />
    )}
    <section className="workspace">
      <header className="topbar">
        <button className="topbar-project" onClick={() => setShowLauncher(true)}>
          <strong>{project.title || "Untitled project"}</strong>
          <small>{workflow.projectBrief.seriesTitle || phaseWorkspaceTitle}</small>
          <ChevronDown size={14} />
        </button>
        <nav className="primary-navigation" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <button key={item.id} className={inspector === item.id ? "active" : ""} onClick={() => setInspector(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="guided-next" onClick={advanceWorkflowPhase} title={workflow.recommendation.reason}>
            <span>Next</span><strong>{workflow.recommendation.title}</strong><ArrowRight size={14}/>
          </button>
          <label className="global-search">
            <Search size={14} />
            <input aria-label="Search project" placeholder="Search (Ctrl+K)" />
          </label>
          <button className="icon-button" aria-label="Project settings" onClick={() => setInspector("settings")}><Settings size={17} /></button>
          <button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button>
          <div className="avatar-pill">RL</div>
        </div>
      </header>

      {workflowError && (
        <div className="workspace-alert" role="alert">
          <span>{workflowError}</span>
          <button onClick={() => setWorkflowError("")}>Dismiss</button>
        </div>
      )}

      <div className={`workspace-body ${inspector === "dashboard" ? "dashboard-workspace" : ""}`}>
        <main className="center-pane">
          <LazyBoundary resetKey={inspector}>
            <Suspense fallback={<div className="panel-loading" role="status"><i /><strong>Opening workspace…</strong><small>Loading the current workspace.</small></div>}>
              {inspector === "dashboard" && <CommandDashboard project={project} nodes={nodes} characters={characters} workflow={workflow} memoryActivities={memoryActivities} activeDocumentId={active.id} onOpenDocument={setActiveId} onNavigate={routeWorkspace} onWorkflowChange={(next)=>{void saveWorkflow(next)}}/>}
              {inspector === "workflow" && <WorkflowDashboard project={project} nodes={nodes} characters={characters} workflow={workflow} memoryActivities={memoryActivities} onNavigateWorkspace={(workspace) => setInspector(workspace === "workflow" ? "workflow" : workspace as Inspector)} onAdvancePhase={advanceWorkflowPhase} onWorkflowChange={(next) => { void saveWorkflow(next); }} />}
              {inspector === "character" && <CharacterPanel characters={characters} manuscriptNodes={nodes} selectedId={selectedCharacterId} onSelect={setSelectedCharacterId} onNew={() => { const next = blankCharacter(project.id); setCharacters((all) => [...all, next]); setSelectedCharacterId(next.id); }} onSave={async (draft) => { const saved = await persistCharacter(draft); setCharacters((all) => all.map((item) => item.id === draft.id ? saved : item)); setSelectedCharacterId(saved.id); return saved; }} />}
              {inspector === "ai" && <AiPanel workflow={workflow} context={activeContext} proposal={activeProposal} decision={decision} modelLabel={editorModel} selectedText={selectedText} running={aiRunning} error={aiError} onRun={(instruction,mode)=>{setRequestedEditingMode(mode);void runEditor(`[${mode==="suggest-only"?"Suggest Only":mode==="direct-apply"?"Direct Apply":"Tracked Rewrite"}] ${instruction}`)}} onDecision={decideProposal} />}
              {inspector === "bible" && <StoryBiblePanel projectId={project.id} nodes={nodes} active={active}/>} 
              {inspector === "research" && <ResearchPanel projectId={project.id} nodes={nodes} onOpenScene={(id)=>setActiveId(id)}/>} 
              {inspector === "models" && <ModelPanel onEditorModelChange={setEditorModel} />}
              {inspector === "files" && <ImportExportPanel projectTitle={project.title} onImported={(created) => { setNodes((all) => [...all, ...created]); const firstScene=created.find(node=>node.kind==="scene"); if(firstScene)setActiveId(firstScene.id); }} />}
              {inspector === "analysis" && <AnalysisPanel nodes={nodes} characters={characters} onSelectScene={(id)=>{setActiveId(id);}}/>}
              {inspector === "history" && <HistoryPanel document={active} onRestored={(restoredContent,revision)=>{lastSaved.current=restoredContent;setContent(restoredContent);setNodes(all=>all.map(node=>node.id===active.id?{...node,content:restoredContent,revision}:node));setSaveState("Revision restored locally");}}/>}
              {inspector === "comments" && <CommentsPanel document={active} selection={commentSelection} onSelectionConsumed={()=>setCommentSelection(undefined)} onNavigate={text=>{setCommentAnchorText(undefined);queueMicrotask(()=>setCommentAnchorText(text))}}/>}
              {inspector === "visuals" && <VisualizationsPanel projectId={project.id} nodes={nodes} characters={characters} onOpenScene={setActiveId}/>} 
              {inspector === "pipelines" && <PipelinePanel projectId={project.id} active={active} nodes={nodes} characters={characters} hasSelection={Boolean(selectedText.trim())} onRunPass={(instructions)=>{setInspector("ai");void runEditor(instructions)}} onOpenHistory={()=>setInspector("history")}/>}
              {inspector === "settings" && <SettingsPanel projectId={project.id} projectRoot={project.rootPath} projectTitle={project.title} coverImageDataUrl={project.coverImageDataUrl} onProjectChanged={setProject}/>}
              {inspector === "publishing" && <PublishingPanel projectId={project.id} projectTitle={project.title} nodes={nodes} characters={characters} onNavigateWorkspace={(workspace) => setInspector(workspace as Inspector)} />}
              {inspector === "series" && <SeriesPanel projectId={project.id} projectTitle={project.title}/>} 
              {inspector === "obsidian" && <ObsidianPanel projectId={project.id} projectTitle={project.title}/>}
              {inspector === "manuscript" && <EditorPane document={active} content={content} characters={characters} memoryActivity={memoryActivities.find(item=>item.documentId===active.id)} memoryStatus={saveState} onChange={setContent} commentAnchorText={commentAnchorText} onComment={selection=>{void startComment(selection)}} onMetadata={async patch=>{const updated=await updateManuscriptMetadata(active,patch);setNodes(all=>all.map(node=>node.id===updated.id?updated:node))}} embeddedAi={<AiPanel workflow={workflow} context={activeContext} proposal={activeProposal} decision={decision} modelLabel={editorModel} selectedText={selectedText} running={aiRunning} error={aiError} onRun={(instruction,mode)=>{setRequestedEditingMode(mode);void runEditor(`[${mode==="suggest-only"?"Suggest Only":mode==="direct-apply"?"Direct Apply":"Tracked Rewrite"}] ${instruction}`)}} onDecision={decideProposal} onKeepText={keepChatText} currentManuscript={content}/>} onAi={(text) => { setSelectedText(text); setAiError(text ? "" : "Select text in the manuscript before running an action."); }} />}
            </Suspense>
          </LazyBoundary>
        </main>

      </div>

      <footer className="status-bar">
        <span><ShieldCheck size={12} /> Local Project</span>
        <span className="status-ok">Auto-backup On</span>
        <span>AI Editor: {editorModel}</span>
        <span>Save State: {saveState}</span>
        <button onClick={() => setInspector("models")}>Model Settings</button>
      </footer>
    </section>
    {showLauncher && <LazyBoundary resetKey="launcher"><Suspense fallback={<div className="launcher-loading" role="status">Opening local projects…</div>}><ProjectLauncher onClose={() => setShowLauncher(false)} onWorkspace={useWorkspace} /></Suspense></LazyBoundary>}
  </div>;
}
