import { BookCopy, FileText, Plus, Sparkles } from "lucide-react";
import type { ManuscriptNode } from "../domain/models";
import type { WorkflowState, WorkflowWorkspaceTarget } from "../domain/workflow";

interface Props {
  workflow: WorkflowState;
  nodes: ManuscriptNode[];
  onNavigateWorkspace: (workspace: WorkflowWorkspaceTarget) => void;
  onAddScene?: () => void;
  onAddDiscoveryNote?: () => void;
  onAddDecision?: () => void;
  onAddResearchNote?: () => void;
}

export function ContextRail({ workflow, nodes, onNavigateWorkspace, onAddScene, onAddDiscoveryNote, onAddDecision, onAddResearchNote }: Props) {
  const openDecisions = workflow.decisions.filter((decision) => decision.status === "open" || decision.status === "deferred");
  const artifacts = [...workflow.artifacts].slice(-6).reverse();
  const activeManuscript = workflow.activeManuscriptId ? nodes.find((node) => node.id === workflow.activeManuscriptId) : nodes.find((node) => node.kind === "scene");

  return (
    <aside className="context-rail" aria-label="Project context">
      <section className="context-card">
        <div className="context-card-head">
          <span>UNRESOLVED DECISIONS</span>
          <button onClick={() => onNavigateWorkspace("workflow")}>View all</button>
        </div>
        <div className="context-list">
          {openDecisions.length === 0 && <p className="context-empty">No unresolved decisions at the moment.</p>}
          {openDecisions.slice(0, 4).map((decision) => (
            <article key={decision.id} className="context-item decision">
              <i />
              <div>
                <strong>{decision.title}</strong>
                <small>{decision.phaseId.replaceAll("_", " ")}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="context-card">
        <div className="context-card-head">
          <span>KEY ARTIFACTS</span>
          <button onClick={() => onNavigateWorkspace("workflow")}>View all</button>
        </div>
        <div className="context-list">
          <article className="context-item artifact">
            <FileText size={15} />
            <div>
              <strong>Project Brief</strong>
              <small>{workflow.projectBrief.originalPremise ? "Premise captured" : "Needs a premise"}</small>
            </div>
          </article>
          <article className="context-item artifact">
            <Sparkles size={15} />
            <div>
              <strong>Creative North Star</strong>
              <small>{workflow.creativeNorthStar.readerExperience ? "Defined" : "Needs definition"}</small>
            </div>
          </article>
          <article className="context-item artifact">
            <BookCopy size={15} />
            <div>
              <strong>Active Manuscript</strong>
              <small>{activeManuscript?.title ?? "No active manuscript yet"}</small>
            </div>
          </article>
          {artifacts.slice(0, 3).map((artifact) => (
            <article key={artifact.id} className="context-item artifact">
              <Sparkles size={15} />
              <div>
                <strong>{artifact.title}</strong>
                <small>{artifact.description}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="context-card">
        <div className="context-card-head">
          <span>QUICK ACTIONS</span>
        </div>
        <div className="quick-actions-grid">
          <button onClick={() => onNavigateWorkspace("manuscript")}><BookCopy size={15} /> Open Manuscript</button>
          <button onClick={() => onNavigateWorkspace("ai")}><Sparkles size={15} /> Open AI Editor</button>
          <button onClick={onAddDiscoveryNote ?? (() => onNavigateWorkspace("ai"))}><Plus size={15} /> Add Discovery Note</button>
          <button onClick={onAddDecision ?? (() => onNavigateWorkspace("workflow"))}><Plus size={15} /> Add Unresolved Decision</button>
          <button onClick={onAddResearchNote ?? (() => onNavigateWorkspace("research"))}><Plus size={15} /> Add Research Note</button>
          <button onClick={onAddScene ?? (() => onNavigateWorkspace("manuscript"))}><Plus size={15} /> New Scene</button>
        </div>
      </section>
    </aside>
  );
}
