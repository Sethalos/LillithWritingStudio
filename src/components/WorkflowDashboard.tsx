import { useMemo } from "react";
import { BookOpen, Check, Circle, FileOutput, Lightbulb, Megaphone, PenLine, Rocket, Sparkles } from "lucide-react";
import type { Character, ManuscriptNode, Project } from "../domain/models";
import type { WorkflowState, WorkflowWorkspaceTarget } from "../domain/workflow";
import type { MemoryActivity } from "../lib/manuscriptMemoryRepository";

interface Props {
  project: Project;
  nodes: ManuscriptNode[];
  characters: Character[];
  workflow: WorkflowState;
  memoryActivities?: MemoryActivity[];
  onNavigateWorkspace: (workspace: WorkflowWorkspaceTarget) => void;
  onAdvancePhase: () => void;
  onWorkflowChange: (workflow: WorkflowState) => void;
}

type StageId = "idea" | "story" | "manuscript" | "revisions" | "production" | "publishing" | "marketing";
type StageState = "complete" | "active" | "upcoming";

const stages: Array<{id:StageId;title:string;description:string;target:WorkflowWorkspaceTarget;icon:typeof Lightbulb}> = [
  {id:"idea",title:"Idea",description:"The image, premise, and promise that started the novel.",target:"workflow",icon:Lightbulb},
  {id:"story",title:"Story Development",description:"Characters, world, structure, arcs, and the direction we are shaping together.",target:"manuscript",icon:Sparkles},
  {id:"manuscript",title:"Manuscript",description:"Write the novel with Lillith and decide what becomes part of the story.",target:"manuscript",icon:PenLine},
  {id:"revisions",title:"Revisions",description:"A separate, reviewable workflow for improving the completed draft.",target:"pipelines",icon:BookOpen},
  {id:"production",title:"Production",description:"Prepare interiors, illustrations, covers, and final book files.",target:"files",icon:FileOutput},
  {id:"publishing",title:"Publishing",description:"Validate editions, metadata, previews, and release readiness.",target:"publishing",icon:Rocket},
  {id:"marketing",title:"Marketing",description:"Plan launch material and reader outreach. This workspace comes later.",target:"publishing",icon:Megaphone},
];

export function WorkflowDashboard({project,nodes,characters,workflow,memoryActivities=[],onNavigateWorkspace}:Props){
  const scenes=nodes.filter(node=>node.kind==="scene");
  const words=scenes.reduce((sum,node)=>sum+node.wordCount,0);
  const hasIdea=Boolean(workflow.projectBrief.originalPremise.trim());
  const hasStory=characters.length>0||workflow.artifacts.length>0||workflow.creativeNorthStar.readerExperience.trim().length>0;
  const activeId:StageId=words>0?"manuscript":hasStory?"story":"idea";
  const activeIndex=stages.findIndex(stage=>stage.id===activeId);
  const activeStage=stages[activeIndex];
  const latestMemory=memoryActivities[0];
  const openDecisions=workflow.decisions.filter(decision=>decision.status==="open"||decision.status==="deferred");
  const stateFor=(index:number):StageState=>index<activeIndex?"complete":index===activeIndex?"active":"upcoming";
  const statusCopy=useMemo(()=>({
    idea:hasIdea?"Premise captured":"Add the central idea or blurb",
    story:hasStory?`${characters.length} characters · ${openDecisions.length} open decisions`:"Develop the story with Lillith",
    manuscript:words?`${words.toLocaleString()} words across ${scenes.length} scenes`:"Ready when the story direction is clear",
    revisions:words?"Waiting for a draft milestone":"Begins after drafting",
    production:"Not started",
    publishing:"Not started",
    marketing:"Planned for later",
  }),[hasIdea,hasStory,characters.length,openDecisions.length,words,scenes.length]);

  return <div className="visual-workflow">
    <header className="visual-workflow-header">
      <div><span>PROJECT WORKFLOW</span><h1>See where the novel is—and work from there.</h1><p>The orange stage is where the project is currently active. Choose any stage to inspect it, then open its workspace.</p></div>
      <div className="workflow-project-thumb">{project.coverImageDataUrl?<img src={project.coverImageDataUrl} alt=""/>:<Lightbulb size={28}/>}<strong>{project.title}</strong></div>
    </header>
    <section className="workflow-path" aria-label="Novel workflow">
      {stages.map((stage,index)=>{const Icon=stage.icon;const state=stateFor(index);return <div className="workflow-stage-wrap" key={stage.id}>
        <button className={`workflow-stage ${state}`} onClick={()=>onNavigateWorkspace(stage.target)} aria-current={state==="active"?"step":undefined}>
          <span className="workflow-stage-icon">{state==="complete"?<Check size={20}/>:<Icon size={20}/>}</span>
          <span><strong>{stage.title}</strong><small>{statusCopy[stage.id]}</small></span>
        </button>
        {index<stages.length-1&&<i className={`workflow-connector ${index<activeIndex?"complete":""}`}/>}
      </div>})}
    </section>
    <section className="workflow-stage-detail current-stage-summary">
      <div className="stage-detail-copy"><span>CURRENT WORK</span><h2>{activeStage.title}</h2><p>{latestMemory?.summary||activeStage.description}</p>
        <div className="stage-detail-meta"><span><Circle size={8}/> {statusCopy[activeStage.id]}</span>{latestMemory?.details.slice(0,2).map(detail=><span key={detail}><Sparkles size={10}/> {detail}</span>)}</div>
      </div>
      <div className="current-stage-note">{latestMemory?.contradictions.length?`${latestMemory.contradictions.length} possible continuity conflict${latestMemory.contradictions.length===1?"":"s"} should be reviewed.`:"Click Story Development or Manuscript to continue working with Lillith."}</div>
    </section>
  </div>;
}
