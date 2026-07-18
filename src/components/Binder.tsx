import type { ReactNode } from "react";
import {
  Activity,
  BookCopy,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Cpu,
  Database,
  Feather,
  FileOutput,
  FileSearch,
  GitFork,
  History as HistoryIcon,
  Home,
  Layers3,
  ListTodo,
  MessageSquare,
  Network,
  Rocket,
  Settings,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import type { WorkflowWorkspaceTarget } from "../domain/workflow";

interface Props {
  projectTitle: string;
  onProjectMenu: () => void;
  currentPhaseLabel: string;
  nextActionLabel: string;
  activeWorkspace: WorkflowWorkspaceTarget | "dashboard" | "obsidian";
  onNavigateWorkspace: (workspace: WorkflowWorkspaceTarget | "dashboard" | "obsidian") => void;
  onResumeManuscript: () => void;
}

type NavItem = { id: WorkflowWorkspaceTarget | "dashboard" | "obsidian"; label: string; icon: ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Workflow",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <Home size={15} /> },
      { id: "workflow", label: "Project Workflow", icon: <Target size={15} /> },
    ],
  },
  {
    label: "Story Bible",
    items: [
      { id: "character", label: "Characters", icon: <UserRound size={15} /> },
      { id: "bible", label: "World & Story Bible", icon: <Network size={15} /> },
      { id: "visuals", label: "Timeline & Relationships", icon: <GitFork size={15} /> },
      { id: "series", label: "Series Continuity", icon: <BookOpen size={15} /> },
    ],
  },
  {
    label: "Writing",
    items: [
      { id: "manuscript", label: "Manuscript", icon: <FileOutput size={15} /> },
      { id: "comments", label: "Comments & Notes", icon: <MessageSquare size={15} /> },
      { id: "research", label: "Research", icon: <FileSearch size={15} /> },
      { id: "history", label: "Revision History", icon: <HistoryIcon size={15} /> },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "pipelines", label: "Revision Pipelines", icon: <Layers3 size={15} /> },
      { id: "analysis", label: "Analysis", icon: <Activity size={15} /> },
      { id: "files", label: "Import & Export", icon: <BookCopy size={15} /> },
      { id: "publishing", label: "Publishing", icon: <Rocket size={15} /> },
    ],
  },
  {
    label: "System",
    items: [
      { id: "models", label: "Models", icon: <Cpu size={15} /> },
      { id: "obsidian", label: "Obsidian Vault", icon: <Database size={15} /> },
      { id: "settings", label: "Project Settings", icon: <Settings size={15} /> },
    ],
  },
];

export function Binder({
  projectTitle,
  onProjectMenu,
  currentPhaseLabel,
  nextActionLabel,
  activeWorkspace,
  onNavigateWorkspace,
  onResumeManuscript,
}: Props) {
  return (
    <aside className="binder panel" aria-label="Project navigation">
      <div className="brand">
        <div className="brand-mark"><Feather size={18} /></div>
        <div>
          <strong>Lillith Writing Studio</strong>
          <span>AUTHOR OS</span>
        </div>
      </div>

      <div className="binder-scroll command-nav-scroll">
        <button className="project-switch" onClick={onProjectMenu}>
          <BookOpen size={15} />
          <span>{projectTitle || "Untitled project"}</span>
          <ChevronDown size={14} />
        </button>

        <nav className="command-nav" aria-label="Lillith workspaces">
          {groups.map((group) => (
            <section className="command-nav-group" key={group.label} aria-label={group.label}>
              <div className="binder-heading"><span>{group.label}</span></div>
              {group.items.map((item) => {
                const active = activeWorkspace === item.id;
                return (
                  <button key={`${group.label}-${item.label}`} className={active ? "active" : ""} onClick={() => onNavigateWorkspace(item.id)}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>

        <section className="sidebar-focus" aria-label="Current project focus">
          <span>Current phase</span>
          <strong>{currentPhaseLabel}</strong>
          <small>{nextActionLabel}</small>
          <button onClick={onResumeManuscript}><CalendarDays size={14} /> Resume manuscript</button>
        </section>
      </div>

      <div className="binder-footer">
        <span><Database size={11} /> Local project</span>
        <span><ListTodo size={11} /> Saved</span>
      </div>
    </aside>
  );
}
