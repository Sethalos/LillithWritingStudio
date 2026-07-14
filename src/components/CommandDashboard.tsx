import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, CalendarDays, Check, CircleAlert, Clock3, Database, GitBranch, Plus, Sparkles, Target, Users } from "lucide-react";
import type { Character, ManuscriptNode, Project, BibleEntity, TimelineEvent, ResearchSource, RevisionPipeline } from "../domain/models";
import type { WorkflowState, WorkflowWorkspaceTarget } from "../domain/workflow";
import type { DailyFocus, DashboardTask } from "../domain/dashboard";
import { analyzeManuscript } from "../lib/pacingEngine";
import { loadBibleEntities } from "../lib/storyBibleRepository";
import { loadTimelineEvents } from "../lib/timelineRepository";
import { loadResearchSources } from "../lib/researchRepository";
import { loadRevisionPipelines } from "../lib/pipelineRepository";
import { loadDashboardTasks, loadDailyFocus, saveDashboardTask, saveDailyFocus } from "../lib/dashboardRepository";

interface Props {
  project: Project;
  nodes: ManuscriptNode[];
  characters: Character[];
  workflow: WorkflowState;
  activeDocumentId: string;
  onOpenDocument: (id: string) => void;
  onNavigate: (target: WorkflowWorkspaceTarget) => void;
}

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString([], { month: "short", day: "numeric" }) : "No date";

export function CommandDashboard({ project, nodes, characters, workflow, activeDocumentId, onOpenDocument, onNavigate }: Props) {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [focus, setFocus] = useState<DailyFocus>();
  const [bible, setBible] = useState<BibleEntity[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [research, setResearch] = useState<ResearchSource[]>([]);
  const [pipelines, setPipelines] = useState<RevisionPipeline[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [editingFocus, setEditingFocus] = useState(false);
  const [loadError,setLoadError]=useState("");

  useEffect(() => {
    let cancelled = false;
    setTasks([]);setFocus(undefined);setBible([]);setTimeline([]);setResearch([]);setPipelines([]);setLoadError("");
    Promise.all([loadDashboardTasks(project.id), loadDailyFocus(project.id), loadBibleEntities(), loadTimelineEvents(), loadResearchSources(), loadRevisionPipelines()]).then(([nextTasks, nextFocus, nextBible, nextTimeline, nextResearch, nextPipelines]) => {
      if (cancelled) return;
      setTasks(current=>current.length?current:nextTasks); setFocus(current=>current??nextFocus); setBible(nextBible); setTimeline(nextTimeline); setResearch(nextResearch); setPipelines(nextPipelines);
    }).catch(error=>{if(!cancelled)setLoadError(`Dashboard data could not be loaded: ${String(error)}`)});
    return () => { cancelled = true; };
  }, [project.id]);

  const scenes = useMemo(() => nodes.filter((node) => node.kind === "scene"), [nodes]);
  const chapters = useMemo(() => nodes.filter((node) => node.kind === "chapter"), [nodes]);
  const totalWords = scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
  const targetWords = Number(workflow.projectBrief.approximateTargetLength.match(/[\d,]+(?=\s*[–-])/u)?.[0]?.replace(",", "")) || scenes.reduce((sum, scene) => sum + (scene.wordGoal ?? 0), 0);
  const progress = targetWords ? Math.min(100, Math.round(totalWords / targetWords * 100)) : 0;
  const active = nodes.find((node) => node.id === (focus?.documentId || activeDocumentId)) ?? scenes[0];
  const activeChapter = active?.parentId ? nodes.find((node) => node.id === active.parentId) : undefined;
  const activeText = (active?.content ?? "").toLowerCase();
  const activeCharacters = characters.filter((character) => active?.povCharacterId === character.id || activeText.includes(character.identity.fullName.toLowerCase())).slice(0, 5);
  const pacing = useMemo(() => analyzeManuscript(nodes, characters.map((character) => character.identity.fullName)), [nodes, characters]);
  const findings = pacing.insights.filter((item) => item.kind !== "strength").slice(0, 5);
  const openDecisions = workflow.decisions.filter((decision) => decision.status === "open" || decision.status === "deferred").slice(0, 5);
  const recentScenes = [...scenes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  const addTask = async () => {
    const title = taskTitle.trim(); if (!title) return;
    const now = new Date().toISOString();
    const saved = await saveDashboardTask({ id: crypto.randomUUID(), projectId: project.id, title, status: "open", createdAt: now, updatedAt: now });
    setTasks((all) => [saved, ...all]); setTaskTitle("");
  };
  const toggleTask = async (task: DashboardTask) => {
    const saved = await saveDashboardTask({ ...task, status: task.status === "open" ? "completed" : "open" });
    setTasks((all) => all.map((item) => item.id === saved.id ? saved : item));
  };
  const commitFocus = async (patch: Partial<DailyFocus>) => {
    const saved = await saveDailyFocus({ projectId: project.id, documentId: active?.id, title: focus?.title || `Continue ${active?.title || "the manuscript"}`, note: focus?.note || active?.sceneGoal || workflow.recommendation.reason, wordTarget: focus?.wordTarget || active?.wordGoal, updatedAt: focus?.updatedAt || new Date().toISOString(), ...patch });
    setFocus(saved); setEditingFocus(false);
  };

  return <div className="command-dashboard">{loadError&&<div className="dashboard-load-error" role="alert">{loadError}</div>}
    <section className="dashboard-project-card dashboard-card">
      <div className="project-cover-placeholder">{project.coverImageDataUrl?<img src={project.coverImageDataUrl} alt={`${project.title} project cover`}/>:<><BookOpen size={32}/><span>{project.title.slice(0, 2).toUpperCase()}</span></>}</div>
      <div className="dashboard-project-copy"><small>ACTIVE PROJECT</small><h1>{project.title}</h1><p>{workflow.projectBrief.seriesTitle || workflow.projectBrief.genre || "Novel in progress"}</p>
        <div className="project-facts"><span>{workflow.projectBrief.genre || "Genre not set"}</span><span>{workflow.projectBrief.pov || "POV not set"}</span><span>{workflow.projectBrief.tense || "Tense not set"}</span><span>{chapters.length} chapters</span></div>
        <div className="word-progress"><div><span>Word count</span><strong>{totalWords.toLocaleString()}{targetWords ? ` / ${targetWords.toLocaleString()}` : ""}</strong></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div><b>{targetWords ? `${progress}%` : "Set target"}</b></div>
      </div>
    </section>

    <section className="dashboard-card health-card"><header><span>STORY HEALTH</span><button onClick={()=>onNavigate("analysis")}>View evidence</button></header>
      <div className="health-summary"><CircleAlert size={18}/><div><strong>{findings.length ? `${findings.length} pacing signals need review` : "No deterministic pacing warnings"}</strong><small>{pacing.scenes.length} scenes analyzed locally · deterministic</small></div></div>
      {findings.slice(0,3).map((finding)=><button className="finding-row" key={`${finding.kind}-${finding.title}`} onClick={()=>{const id=finding.sceneIds[0];if(id)onOpenDocument(id);onNavigate("analysis")}}><span>{finding.title}</span><small>{finding.evidence}</small></button>)}
    </section>

    <section className="dashboard-card threads-card"><header><span>UNRESOLVED DECISIONS</span><button onClick={()=>onNavigate("workflow")}>View all</button></header>{openDecisions.length?openDecisions.map((decision)=><div className="thread-row" key={decision.id}><i/><div><strong>{decision.title}</strong><small>{decision.phaseId.replaceAll("_"," ")}</small></div></div>):<p className="dashboard-empty">No open workflow decisions.</p>}</section>

    <section className="dashboard-card focus-card"><header><span>TODAY&apos;S FOCUS</span><button onClick={()=>setEditingFocus(!editingFocus)}>{editingFocus?"Cancel":"Edit"}</button></header>{editingFocus?<div className="focus-editor"><input aria-label="Focus title" value={focus?.title??""} onChange={e=>setFocus({...focus,projectId:project.id,title:e.target.value,note:focus?.note??"",updatedAt:focus?.updatedAt??new Date().toISOString()})}/><textarea aria-label="Focus note" value={focus?.note??""} onChange={e=>setFocus({...focus,projectId:project.id,title:focus?.title??"",note:e.target.value,updatedAt:focus?.updatedAt??new Date().toISOString()})}/><button onClick={()=>void commitFocus({})}>Save focus</button></div>:<><h2>{focus?.title || `Continue ${active?.title || "your manuscript"}`}</h2><p>{focus?.note || active?.sceneGoal || workflow.recommendation.reason}</p><div className="focus-meta"><span>Scene: {active?.title || "Not selected"}</span><span>Target: {focus?.wordTarget || active?.wordGoal || "Not set"}</span></div><button className="gold-action" onClick={()=>{if(active)onOpenDocument(active.id);onNavigate("manuscript")}}>Open {active?.kind || "manuscript"}</button></>}</section>

    <section className="dashboard-card characters-card"><header><span>ACTIVE CHARACTERS {activeChapter?`· ${activeChapter.title}`:""}</span><button onClick={()=>onNavigate("character")}>View all</button></header><div className="character-strip">{activeCharacters.length?activeCharacters.map(character=><button key={character.id} onClick={()=>onNavigate("character")}><span>{character.identity.fullName.split(/\s+/).map(part=>part[0]).join("").slice(0,2)}</span><strong>{character.identity.fullName}</strong><small>{active?.povCharacterId===character.id?"POV character":character.role}</small></button>):<p className="dashboard-empty">Assign a POV or mention saved characters in the active scene.</p>}</div></section>

    <section className="dashboard-card artifacts-card"><header><span>PROJECT MEMORY</span><button onClick={()=>onNavigate("bible")}>View all</button></header><div className="metric-grid"><div><Database/><strong>{bible.length}</strong><small>Story Bible records</small></div><div><CalendarDays/><strong>{timeline.length}</strong><small>Timeline events</small></div><div><BookOpen/><strong>{research.length}</strong><small>Research sources</small></div><div><GitBranch/><strong>{pipelines.length}</strong><small>Revision pipelines</small></div></div></section>

    <section className="dashboard-card activity-card-command"><header><span>RECENT MANUSCRIPT ACTIVITY</span><button onClick={()=>onNavigate("history")}>History</button></header>{recentScenes.map(scene=><button className="activity-row" key={scene.id} onClick={()=>{onOpenDocument(scene.id);onNavigate("manuscript")}}><Activity size={14}/><div><strong>{scene.title}</strong><small>{scene.wordCount.toLocaleString()} words · updated {dateLabel(scene.updatedAt)}</small></div></button>)}</section>

    <section className="dashboard-card timeline-card-command"><header><span>TIMELINE</span><button onClick={()=>onNavigate("visuals")}>Open timeline</button></header>{timeline.slice(0,5).map(event=><div className="timeline-row" key={event.id}><i/><div><strong>{event.storyTimeStart || "Order " + event.orderKey}</strong><span>{event.title}</span></div></div>)}{!timeline.length&&<p className="dashboard-empty">No timeline events recorded.</p>}</section>

    <section className="dashboard-card tasks-card"><header><span>TASKS & DEADLINES</span><span>{tasks.filter(task=>task.status==="open").length} open</span></header>{tasks.slice(0,6).map(task=><button className={`task-row ${task.status}`} key={task.id} onClick={()=>void toggleTask(task)}><i>{task.status==="completed"&&<Check size={11}/>}</i><span>{task.title}</span><small>{task.dueAt?dateLabel(task.dueAt):""}</small></button>)}<div className="task-add"><input aria-label="New task" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void addTask()}} placeholder="Add a new task"/><button aria-label="Add task" onClick={()=>void addTask()}><Plus size={14}/></button></div></section>

    <section className="dashboard-card quick-card"><header><span>QUICK ACTIONS</span></header><div className="quick-grid"><button onClick={()=>onNavigate("manuscript")}><BookOpen/>Manuscript</button><button onClick={()=>onNavigate("ai")}><Sparkles/>AI Editor</button><button onClick={()=>onNavigate("character")}><Users/>Character</button><button onClick={()=>onNavigate("analysis")}><Activity/>Analysis</button><button onClick={()=>onNavigate("workflow")}><Target/>Workflow</button><button onClick={()=>onNavigate("research")}><Clock3/>Research</button></div></section>
  </div>;
}
