import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowRight, ChevronDown, CircleHelp, Search, Settings, ShieldCheck } from "lucide-react";
import { Binder } from "./components/Binder";
import { EditorPane } from "./components/EditorPane";
import { AiPanel } from "./components/AiPanel";
import { WorkflowDashboard } from "./components/WorkflowDashboard";
import { ContextRail } from "./components/ContextRail";
import type { CommentSelection } from "./components/CommentsPanel";
import { LazyBoundary } from "./components/LazyBoundary";
import type { EditingMode, ProposalDecision } from "./domain/ai";
import type { ContextPackage } from "./domain/ai";
import type { Character, WorkspaceData } from "./domain/models";
import { createBlankWorkflowState, workflowPhases, type WorkflowPhaseId, type WorkflowState, type WorkflowWorkspaceTarget } from "./domain/workflow";
import { createBlankWorkspace, createManuscriptNode, loadCurrentWorkspace, loadLocalDocument, reorderManuscriptNodes, saveCurrentWorkspace, saveDocument, updateManuscriptMetadata } from "./lib/repository";
import { blankCharacter, loadCharacters, persistCharacter } from "./lib/characterRepository";
import { acceptTrackedProposal, decideTrackedProposal, executeEditorOperation, type ReviewProposal } from "./lib/aiEditorRepository";
import { configuredExecution, estimateExecutionCost } from "./lib/providerRepository";
import { loadCharacterArcs, loadCharacterStates, loadRelationships } from "./lib/characterIntelligenceRepository";
import { retrieveBibleContext } from "./lib/storyBibleRepository";
import {retrieveSemanticContext} from "./lib/semanticRepository";
import {retrieveResearchContext} from "./lib/researchRepository";
import { loadWorkflowState, persistWorkflowState } from "./lib/workflowRepository";
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
  { id: "manuscript", label: "Manuscript" },
  { id: "character", label: "Characters" },
  { id: "bible", label: "World" },
  { id: "visuals", label: "Timeline" },
  { id: "ai", label: "AI Editor" },
  { id: "analysis", label: "Analytics" },
  { id: "publishing", label: "Publishing" },
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
  const [workflow, setWorkflow] = useState<WorkflowState>(() => createBlankWorkflowState(initialWorkspace.project));
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [activeProposal, setActiveProposal] = useState<ReviewProposal>();
  const [activeContext, setActiveContext] = useState<ContextPackage>(emptyContext);
  const [aiRunning, setAiRunning] = useState(false);
  const [requestedEditingMode,setRequestedEditingMode]=useState<EditingMode>("tracked-rewrite");
  const [aiError, setAiError] = useState("");
  const [commentSelection,setCommentSelection]=useState<CommentSelection>();
  const [commentAnchorText,setCommentAnchorText]=useState<string>();
  const lastSaved = useRef(content);
  useEffect(() => { const next = loadLocalDocument(active); setContent(next); lastSaved.current = next; }, [active.id]);
  useEffect(() => { if (content === lastSaved.current) return; const timer = window.setTimeout(async () => { setSaveState("Saving…"); try { const revision = await saveDocument(active, content); lastSaved.current = content; setNodes((all) => all.map((node) => node.id === active.id ? { ...node, content, revision } : node)); setSaveState("Saved locally"); } catch (error) { setSaveState(String(error).includes("stale edit") ? "Save conflict — reopen section" : "Save needs attention"); } }, 700); return () => window.clearTimeout(timer); }, [active, content]);
  useEffect(() => { saveCurrentWorkspace({ project, nodes }); }, [project, nodes]);
  useEffect(() => {
    let cancelled = false;
    void loadWorkflowState(project, nodes, characters).then((next) => {
      if (!cancelled) setWorkflow(next);
    });
    return () => {
      cancelled = true;
    };
  }, [project, nodes, characters]);
  const useWorkspace = async (workspace: WorkspaceData) => { setProject(workspace.project); setNodes(workspace.nodes); saveCurrentWorkspace(workspace); const firstScene = workspace.nodes.find((node) => node.kind === "scene"); if (firstScene) setActiveId(firstScene.id); const loaded = await loadCharacters(workspace.project.id); setCharacters(loaded); setSelectedCharacterId(loaded[0]?.id ?? ""); setActiveProposal(undefined); setSelectedText(""); setActiveContext({version:"1",id:crypto.randomUUID(),projectId:workspace.project.id,task:"prose-rewrite",target:{documentId:firstScene?.id??""},items:[],exclusions:[],estimatedInputTokens:0,tokenBudget:12000,assembledAt:new Date().toISOString(),assemblerVersion:"1.0.0"}); setEditorModel("No editor model configured"); setSaveState(`Opened ${workspace.project.title || "current project"}`); setInspector("dashboard"); setShowLauncher(false); };
  const createNode = async (kind: "chapter" | "scene", title: string) => { const activeChapter = active.kind === "scene" ? active.parentId : active.kind === "chapter" ? active.id : undefined; const parentId = kind === "chapter" ? nodes.find((node) => node.kind === "book")?.id : activeChapter ?? nodes.find((node) => node.kind === "chapter")?.id; if (!parentId) throw new Error(`Create a ${kind === "scene" ? "chapter" : "book"} first.`); const node = await createManuscriptNode(parentId, kind, title, project.id); setNodes((all) => [...all, node]); if (kind === "scene") setActiveId(node.id); };
  const startComment=async(selection:CommentSelection)=>{try{if(content!==lastSaved.current){setSaveState("Saving…");const revision=await saveDocument(active,content);lastSaved.current=content;setNodes(all=>all.map(node=>node.id===active.id?{...node,content,revision}:node));setSaveState("Saved locally")}setCommentSelection(selection);setInspector("comments")}catch(error){setSaveState("Save needs attention");setAiError(String(error))}};
  const saveWorkflow = async (next: WorkflowState) => {
    setWorkflow(next);
    try {
      const saved = await persistWorkflowState(next);
      setWorkflow(saved);
    } catch (error) {
      setAiError(String(error));
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
    const currentIndex = workflowPhases.findIndex((phase) => phase.id === workflow.currentPhaseId);
    const nextPhase = workflowPhases[currentIndex + 1];
    if (!nextPhase) return;
    void saveWorkflow({ ...workflow, currentPhaseId: nextPhase.id, source: "manual" });
    setInspector("workflow");
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
  const decideProposal = async (next: ProposalDecision, replacement?: string) => { if (!activeProposal) return; if (next === "accepted" || next === "edited") { try { const accepted = await acceptTrackedProposal(activeProposal, content, replacement); lastSaved.current = accepted.content; setContent(accepted.content); setNodes((all) => all.map((node) => node.id === active.id ? { ...node, content: accepted.content, revision: accepted.revision } : node)); setDecision(next); setSaveState("Reviewed AI change saved with a local snapshot"); } catch (error) { setAiError(String(error)); } } else if (next === "rejected" || next === "deferred") { try { await decideTrackedProposal(activeProposal.id, next); setDecision(next); } catch (error) { setAiError(String(error)); } } };

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
          <button className="guided-next" onClick={() => routeWorkspace(workflow.recommendation.workspaceTarget)} title={workflow.recommendation.reason}>
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

      <div className={`workspace-body ${inspector === "dashboard" ? "dashboard-workspace" : ""}`}>
        <main className="center-pane">
          <LazyBoundary resetKey={inspector}>
            <Suspense fallback={<div className="panel-loading" role="status"><i /><strong>Opening workspace…</strong><small>Loading the current workspace.</small></div>}>
              {inspector === "dashboard" && <CommandDashboard project={project} nodes={nodes} characters={characters} workflow={workflow} activeDocumentId={active.id} onOpenDocument={setActiveId} onNavigate={(workspace)=>setInspector(workspace as Inspector)}/>}
              {inspector === "workflow" && <WorkflowDashboard project={project} nodes={nodes} characters={characters} workflow={workflow} onNavigateWorkspace={(workspace) => setInspector(workspace === "workflow" ? "workflow" : workspace as Inspector)} onAdvancePhase={advanceWorkflowPhase} onWorkflowChange={(next) => { void saveWorkflow(next); }} />}
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
              {inspector === "settings" && <SettingsPanel projectId={project.id} projectRoot={project.rootPath}/>} 
              {inspector === "publishing" && <PublishingPanel projectId={project.id} projectTitle={project.title} nodes={nodes} characters={characters} onNavigateWorkspace={(workspace) => setInspector(workspace as Inspector)} />}
              {inspector === "series" && <SeriesPanel projectId={project.id} projectTitle={project.title}/>} 
              {inspector === "obsidian" && <ObsidianPanel projectId={project.id} projectTitle={project.title}/>}
              {inspector === "manuscript" && <EditorPane document={active} content={content} characters={characters} onChange={setContent} commentAnchorText={commentAnchorText} onComment={selection=>{void startComment(selection)}} onMetadata={async patch=>{const updated=await updateManuscriptMetadata(active,patch);setNodes(all=>all.map(node=>node.id===updated.id?updated:node))}} embeddedAi={<AiPanel workflow={workflow} context={activeContext} proposal={activeProposal} decision={decision} modelLabel={editorModel} selectedText={selectedText} running={aiRunning} error={aiError} onRun={(instruction,mode)=>{setRequestedEditingMode(mode);void runEditor(`[${mode==="suggest-only"?"Suggest Only":mode==="direct-apply"?"Direct Apply":"Tracked Rewrite"}] ${instruction}`)}} onDecision={decideProposal} />} onAi={(text) => { setSelectedText(text); setAiError(text ? "" : "Select text in the manuscript before running an action."); }} />}
            </Suspense>
          </LazyBoundary>
        </main>

        {inspector !== "dashboard" && <ContextRail
          workflow={workflow}
          nodes={nodes}
          onNavigateWorkspace={(workspace) => setInspector(workspace === "workflow" ? "workflow" : workspace as Inspector)}
          onAddScene={() => setInspector("manuscript")}
          onAddDiscoveryNote={() => setInspector("workflow")}
          onAddDecision={() => setInspector("workflow")}
          onAddResearchNote={() => setInspector("research")}
        />}
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
