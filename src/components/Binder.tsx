import type { ReactNode } from "react";
import { Activity, ArrowUpRight, BookOpen, BookCopy, Check, ChevronDown, Cpu, Feather, FileOutput, FileSearch, GitFork, History as HistoryIcon, Home, Layers3, Lock, MessageSquare, Network, PanelTop, PencilLine, Rocket, Search, Settings, Sparkles, Star, UserRound } from "lucide-react";
import { workflowPhases, type WorkflowPhaseId, type WorkflowWorkspaceTarget } from "../domain/workflow";

interface Props {
  projectTitle: string;
  onProjectMenu: () => void;
  currentPhaseLabel: string;
  currentPhaseSummary: string;
  nextActionLabel: string;
  nextActionReason: string;
  currentPhaseId: WorkflowPhaseId;
  onOpenWorkflow: () => void;
  onNavigatePhase: (phaseId: WorkflowPhaseId) => void;
  onAdvancePhase: () => void;
  activeWorkspace: WorkflowWorkspaceTarget | "workflow";
  onNavigateWorkspace: (workspace: WorkflowWorkspaceTarget | "workflow") => void;
  onResumeManuscript: () => void;
}

const tools: Array<{ id: WorkflowWorkspaceTarget; label: string; icon: ReactNode }> = [
  { id: "manuscript", label: "Manuscript", icon: <FileOutput size={15} /> },
  { id: "character", label: "Characters", icon: <UserRound size={15} /> },
  { id: "bible", label: "Story Bible", icon: <Network size={15} /> },
  { id: "ai", label: "AI Editor", icon: <Sparkles size={15} /> },
  { id: "pipelines", label: "Pipelines", icon: <Layers3 size={15} /> },
  { id: "research", label: "Research", icon: <FileSearch size={15} /> },
  { id: "analysis", label: "Analysis", icon: <Activity size={15} /> },
  { id: "publishing", label: "Publishing", icon: <Rocket size={15} /> },
  { id: "models", label: "Models", icon: <Cpu size={15} /> },
  { id: "files", label: "Files", icon: <BookCopy size={15} /> },
  { id: "comments", label: "Comments", icon: <MessageSquare size={15} /> },
  { id: "history", label: "History", icon: <HistoryIcon size={15} /> },
  { id: "visuals", label: "Visuals", icon: <GitFork size={15} /> },
  { id: "settings", label: "Settings", icon: <Settings size={15} /> },
  { id: "series", label: "Series", icon: <BookOpen size={15} /> },
];

function phaseIcon(phaseId: WorkflowPhaseId) {
  switch (phaseId) {
    case "project_creation":
      return <PanelTop size={14} />;
    case "idea_capture":
      return <PencilLine size={14} />;
    case "creative_north_star":
      return <Star size={14} />;
    case "discovery":
      return <Search size={14} />;
    case "character_foundations":
      return <UserRound size={14} />;
    case "story_architecture":
      return <Layers3 size={14} />;
    case "drafting_readiness":
      return <FileOutput size={14} />;
    default:
      return <Sparkles size={14} />;
  }
}

export function Binder({ projectTitle, onProjectMenu, currentPhaseLabel, currentPhaseSummary, nextActionLabel, nextActionReason, currentPhaseId, onOpenWorkflow, onNavigatePhase, onAdvancePhase, activeWorkspace, onNavigateWorkspace, onResumeManuscript }: Props) {
  const activePhaseIndex = Math.max(0, workflowPhases.findIndex((phase) => phase.id === currentPhaseId));
  const nextPhase = workflowPhases[activePhaseIndex + 1];

  return (
    <aside className="binder panel" aria-label="Project binder">
      <div className="brand">
        <div className="brand-mark">
          <Feather size={18} />
        </div>
        <div>
          <strong>Rob&apos;s Writing Command Center</strong>
          <span>WORKFLOW</span>
        </div>
      </div>

      <div className="binder-scroll">
        <button className="project-switch" onClick={onProjectMenu}>
          <BookOpen size={15} />
          <span>{projectTitle}</span>
          <ChevronDown size={14} />
        </button>

        <div className="binder-heading">
          <span>WORKFLOW</span>
          <small>{currentPhaseLabel}</small>
        </div>

        <button className="workflow-home-button" onClick={onOpenWorkflow}>
          <HomeIcon />
          <span>Workflow Home</span>
        </button>

        <div className="binder-heading phases-heading">
          <span>PHASES</span>
          <small>{currentPhaseSummary}</small>
        </div>

        <div className="workflow-phase-list">
          {workflowPhases.map((phase, index) => {
            const isComplete = index < activePhaseIndex;
            const isCurrent = index === activePhaseIndex;
            const isLocked = index >= 7;
            const isUpcoming = !isComplete && !isCurrent && !isLocked;
            return (
              <button
                key={phase.id}
                className={[
                  isCurrent ? "current" : "",
                  isComplete ? "complete" : isUpcoming ? "upcoming" : "locked",
                  activeWorkspace === "workflow" && currentPhaseId === phase.id ? "active" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => onNavigatePhase(phase.id)}
              >
                <span className={`phase-icon ${isComplete ? "complete" : isCurrent ? "current" : isLocked ? "locked" : "upcoming"}`}>
                  {isLocked ? <Lock size={11} /> : phaseIcon(phase.id)}
                </span>
                <span className="phase-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="phase-copy">
                  <strong>{phase.displayName}</strong>
                </span>
                <span className={`phase-status ${isComplete ? "complete" : isCurrent ? "current" : isLocked ? "locked" : "upcoming"}`}>
                  {isComplete ? <Check size={13} /> : isCurrent ? <span className="phase-marker" aria-hidden="true" /> : isLocked ? <Lock size={12} /> : <span className="phase-marker hollow" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="workflow-next-action">
          <span className="eyebrow">NEXT</span>
          <strong>{nextActionLabel}</strong>
          <small>{nextActionReason}</small>
          <div className="workflow-next-actions">
            <button className="workflow-next-link" onClick={onOpenWorkflow}>
              Review current phase
            </button>
            {nextPhase && (
              <button className="workflow-next-link primary" onClick={onAdvancePhase}>
                Continue to {nextPhase.displayName}
              </button>
            )}
          </div>
        </div>

        <div className="binder-heading tools-heading">
          <span>TOOLS (ALWAYS AVAILABLE)</span>
        </div>

        <nav className="tool-list" aria-label="Available tools">
          {tools.map((tool) => (
            <button key={tool.id} className={activeWorkspace === tool.id ? "active" : ""} onClick={() => onNavigateWorkspace(tool.id)}>
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </nav>

        <button className="resume-card" onClick={onResumeManuscript}>
          <div>
            <strong>Resume Manuscript</strong>
            <small>Continue from the current draft.</small>
          </div>
          <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="binder-footer">
        <span>Local project</span>
        <span>Auto-backup On</span>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <span className="home-icon" aria-hidden="true">
      <Home size={12} />
    </span>
  );
}
