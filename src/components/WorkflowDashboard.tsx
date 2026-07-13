import { ArrowRight, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import type { Character, ManuscriptNode, Project } from "../domain/models";
import {
  workflowPhases,
  type CreativeNorthStar,
  type WorkflowProjectBrief,
  type WorkflowState,
  type WorkflowWorkspaceTarget,
} from "../domain/workflow";

interface Props {
  project: Project;
  nodes: ManuscriptNode[];
  characters: Character[];
  workflow: WorkflowState;
  onNavigateWorkspace: (workspace: WorkflowWorkspaceTarget) => void;
  onAdvancePhase: () => void;
  onWorkflowChange: (workflow: WorkflowState) => void;
}

function formatTime(value?: string): string {
  if (!value) return "Not yet recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function BulletField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const preview = items.filter(Boolean);
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };
  const addItem = () => onChange([...items, ""]);
  const removeItem = (index: number) => onChange(items.filter((_, itemIndex) => itemIndex !== index));
  return (
    <div className="full-row bullet-field">
      <span>{label}</span>
      <div className="bullet-list-editor" aria-label={label}>
        {(items.length ? items : [""]).map((item, index) => (
          <div key={`${label}-${index}`} className="bullet-list-row">
            <span aria-hidden="true">•</span>
            <textarea
              rows={2}
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={index === 0 ? placeholder : "Add another bullet…"}
            />
            {items.length > 0 && (
              <button type="button" onClick={() => removeItem(index)} aria-label={`Remove ${label} item ${index + 1}`}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="bullet-list-actions">
        <button type="button" className="ghost" onClick={addItem}>
          + Add bullet
        </button>
        <small>Each item stays reviewable on its own. Use this as a brain dump, not a finished outline.</small>
      </div>
      {preview.length > 0 && (
        <ul className="bullet-preview" aria-label={`${label} preview`}>
          {preview.map((item, index) => <li key={`${label}-preview-${index}`}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

export function WorkflowDashboard({ project, nodes, characters, workflow, onNavigateWorkspace, onAdvancePhase, onWorkflowChange }: Props) {
  const activeManuscript = workflow.activeManuscriptId ? nodes.find((node) => node.id === workflow.activeManuscriptId) : nodes.find((node) => node.kind === "scene") ?? nodes.find((node) => node.kind === "chapter");
  const majorCharacters = characters.filter((character) => character.role === "major");
  const openDecisions = workflow.decisions.filter((decision) => decision.status === "open" || decision.status === "deferred");
  const recentArtifacts = [...workflow.artifacts].slice(-6).reverse();
  const phaseIndex = Math.max(0, workflowPhases.findIndex((phase) => phase.id === workflow.currentPhaseId));
  const phase = workflowPhases[phaseIndex] ?? workflowPhases[0];

  const commit = (next: WorkflowState) => {
    onWorkflowChange({
      ...next,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateBrief = (patch: Partial<WorkflowProjectBrief>) => {
    commit({
      ...workflow,
      projectBrief: {
        ...workflow.projectBrief,
        ...patch,
      },
    });
  };

  const updateNorthStar = (patch: Partial<CreativeNorthStar>) => {
    commit({
      ...workflow,
      creativeNorthStar: {
        ...workflow.creativeNorthStar,
        ...patch,
      },
    });
  };

  const phaseWorkspace = (() => {
    if (phase.id === "project_creation") {
      return (
        <section className="card workflow-phase-workspace">
          <header className="card-header">
            <span>PROJECT CREATION</span>
            <small>Fill this in first. It shapes the rest of the workflow.</small>
          </header>
          <div className="workflow-form-grid">
            <label className="full-row">
              <span>Working title</span>
              <input value={workflow.projectBrief.workingTitle} onChange={(event) => updateBrief({ workingTitle: event.target.value })} placeholder="Lillith: Vampire Goddess" />
            </label>
            <label>
              <span>Project type</span>
              <select value={workflow.projectBrief.projectType} onChange={(event) => updateBrief({ projectType: event.target.value as WorkflowProjectBrief["projectType"] })}>
                <option value="standalone">Standalone</option>
                <option value="series_book">Series book</option>
              </select>
            </label>
            <label>
              <span>Series title</span>
              <input value={workflow.projectBrief.seriesTitle} onChange={(event) => updateBrief({ seriesTitle: event.target.value })} placeholder="Series name, if relevant" />
            </label>
            <label>
              <span>Book number</span>
              <input type="number" min="1" value={workflow.projectBrief.bookNumber ?? ""} onChange={(event) => updateBrief({ bookNumber: event.target.value ? Number(event.target.value) : undefined })} placeholder="1" />
            </label>
            <label>
              <span>Genre</span>
              <select value={workflow.projectBrief.genre} onChange={(event) => updateBrief({ genre: event.target.value })}>
                <option value="">Choose genre…</option>
                <option>Fantasy</option>
                <option>Dark Fantasy</option>
                <option>Horror</option>
                <option>Romance</option>
                <option>Science Fiction</option>
                <option>Mystery</option>
                <option>Thriller</option>
                <option>Literary Fiction</option>
                <option>Young Adult</option>
                <option>Other / Custom</option>
              </select>
            </label>
            <label>
              <span>Subgenre</span>
              <input value={workflow.projectBrief.subgenre} onChange={(event) => updateBrief({ subgenre: event.target.value })} placeholder="Vampire gothic, urban fantasy…" />
            </label>
            <label>
              <span>Intended audience</span>
              <input value={workflow.projectBrief.intendedAudience} onChange={(event) => updateBrief({ intendedAudience: event.target.value })} placeholder="Adult, crossover, etc." />
            </label>
            <label>
              <span>Target length</span>
              <select value={workflow.projectBrief.approximateTargetLength} onChange={(event) => updateBrief({ approximateTargetLength: event.target.value })}>
                <option value="">Choose length…</option>
                <option>Short novel · 40,000–60,000 words</option>
                <option>Standard novel · 70,000–95,000 words</option>
                <option>Long novel · 100,000–130,000 words</option>
                <option>Epic / custom</option>
              </select>
            </label>
            <label>
              <span>POV</span>
              <select value={workflow.projectBrief.pov} onChange={(event) => updateBrief({ pov: event.target.value })}>
                <option value="">Choose POV…</option>
                <option>First person</option>
                <option>Close third</option>
                <option>Limited multiple POV</option>
                <option>Omniscient</option>
                <option>Mixed / custom</option>
              </select>
            </label>
            <label>
              <span>Tense</span>
              <select value={workflow.projectBrief.tense} onChange={(event) => updateBrief({ tense: event.target.value })}>
                <option value="">Choose tense…</option>
                <option>Past</option>
                <option>Present</option>
                <option>Mixed / custom</option>
              </select>
            </label>
            <label>
              <span>Project status</span>
              <select value={workflow.projectStatus} onChange={(event) => commit({ ...workflow, projectStatus: event.target.value as WorkflowState["projectStatus"] })}>
                <option value="idea">Idea</option>
                <option value="planning">Planning</option>
                <option value="drafting">Drafting</option>
                <option value="revision">Revision</option>
                <option value="production">Production</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <div className="workflow-phase-note">
            <strong>Why this matters</strong>
            <p>This gives the workflow a stable project identity, so later phases can recommend the right next step without you re-entering the same basics.</p>
          </div>
        </section>
      );
    }

    if (phase.id === "idea_capture") {
      return (
        <section className="card workflow-phase-workspace">
          <header className="card-header">
            <span>IDEA CAPTURE</span>
            <small>Brain dump first. Structure can wait.</small>
          </header>
          <div className="workflow-form-grid stacked">
            <label className="full-row">
              <span>Original premise</span>
              <textarea rows={7} value={workflow.projectBrief.originalPremise} onChange={(event) => updateBrief({ originalPremise: event.target.value })} placeholder="What is this story about?" />
            </label>
            <BulletField
              label="Scenes or images already imagined"
              items={workflow.projectBrief.scenesOrImagesAlreadyImagined}
              onChange={(items) => updateBrief({ scenesOrImagesAlreadyImagined: items })}
              placeholder="Paste or type each imagined scene as a separate bullet."
            />
            <BulletField
              label="Themes"
              items={workflow.projectBrief.themes}
              onChange={(items) => updateBrief({ themes: items })}
              placeholder="One theme per bullet."
            />
            <BulletField
              label="Inspirations"
              items={workflow.projectBrief.inspirations}
              onChange={(items) => updateBrief({ inspirations: items })}
              placeholder="Books, movies, moods, history, anything that feeds the idea."
            />
            <BulletField
              label="Things to avoid"
              items={workflow.projectBrief.thingsToAvoid}
              onChange={(items) => updateBrief({ thingsToAvoid: items })}
              placeholder="Tropes, tones, character types, or content to avoid."
            />
            <label className="full-row">
              <span>Open notes</span>
              <textarea rows={7} value={workflow.projectBrief.openNotes} onChange={(event) => updateBrief({ openNotes: event.target.value })} placeholder="Any extra thoughts, questions, or brain-dump material" />
            </label>
          </div>
        </section>
      );
    }

    if (phase.id === "creative_north_star") {
      return (
        <section className="card workflow-phase-workspace">
          <header className="card-header">
            <span>CREATIVE NORTH STAR</span>
            <small>Define the reader experience and the guardrails.</small>
          </header>
          <div className="workflow-form-grid stacked">
            <label className="full-row">
              <span>Reader experience</span>
              <textarea rows={7} value={workflow.creativeNorthStar.readerExperience} onChange={(event) => updateNorthStar({ readerExperience: event.target.value })} placeholder="What do you want the reader to feel?" />
            </label>
            <label className="full-row">
              <span>Emotional promise</span>
              <textarea rows={7} value={workflow.creativeNorthStar.emotionalPromise} onChange={(event) => updateNorthStar({ emotionalPromise: event.target.value })} placeholder="What emotional payoff are you promising?" />
            </label>
            <BulletField
              label="Distinguishing qualities"
              items={workflow.creativeNorthStar.distinguishingQualities}
              onChange={(items) => updateNorthStar({ distinguishingQualities: items })}
              placeholder="What makes this story feel distinct?"
            />
            <label className="full-row">
              <span>Central thematic concern</span>
              <textarea rows={7} value={workflow.creativeNorthStar.centralThematicConcern} onChange={(event) => updateNorthStar({ centralThematicConcern: event.target.value })} placeholder="What is this book really about?" />
            </label>
            <BulletField
              label="Genre promises"
              items={workflow.creativeNorthStar.genrePromises}
              onChange={(items) => updateNorthStar({ genrePromises: items })}
              placeholder="One promise per bullet."
            />
            <BulletField
              label="Conventions to challenge"
              items={workflow.creativeNorthStar.conventionsToChallenge}
              onChange={(items) => updateNorthStar({ conventionsToChallenge: items })}
              placeholder="What are you deliberately pushing against?"
            />
            <label className="full-row">
              <span>Tone and atmosphere</span>
              <textarea rows={7} value={workflow.creativeNorthStar.toneAndAtmosphere} onChange={(event) => updateNorthStar({ toneAndAtmosphere: event.target.value })} placeholder="Dark, intimate, fast, uncanny…" />
            </label>
            <label className="full-row">
              <span>What the reader should remember</span>
              <textarea rows={7} value={workflow.creativeNorthStar.whatTheReaderShouldRemember} onChange={(event) => updateNorthStar({ whatTheReaderShouldRemember: event.target.value })} placeholder="The lasting impression" />
            </label>
            <BulletField
              label="Creative guardrails"
              items={workflow.creativeNorthStar.explicitCreativeGuardrails}
              onChange={(items) => updateNorthStar({ explicitCreativeGuardrails: items })}
              placeholder="Rules or limits to keep the book aligned."
            />
          </div>
        </section>
      );
    }

    return (
      <section className="card workflow-phase-workspace workflow-placeholder">
        <header className="card-header">
          <span>{phase.displayName.toUpperCase()}</span>
          <small>Tools for this phase will be wired next.</small>
        </header>
        <p>{phase.shortExplanation}</p>
      </section>
    );
  })();

  return (
    <div className="dashboard-shell">
      {phaseIndex < workflowPhases.length - 1 && (
        <section className="card workflow-next-banner">
          <div>
            <span>NEXT STEP</span>
            <strong>Continue to {workflowPhases[phaseIndex + 1].displayName}</strong>
            <p>{workflow.recommendation.reason}</p>
          </div>
          <button className="emerald" onClick={onAdvancePhase}>
            Next <ArrowRight size={15} />
          </button>
        </section>
      )}

      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <div className="greeting-row">
            <Sparkles size={32} />
            <div>
              <h1>Good to see you.</h1>
              <p>Let’s move the story forward one clear step at a time.</p>
            </div>
          </div>
          <div className="project-summary">
            <div className="cover-placeholder" aria-hidden="true">
              <span>{project.title ? project.title.slice(0, 3).toUpperCase() : "LIL"}</span>
            </div>
            <div className="project-copy">
              <h2>{project.title || "Untitled project"}</h2>
              <p>{workflow.projectBrief.projectType === "series_book" && workflow.projectBrief.seriesTitle ? `${workflow.projectBrief.seriesTitle} · Book ${workflow.projectBrief.bookNumber ?? "?"}` : "Standalone project"}</p>
              <div className="meta-pills">
                <span>Genre: {workflow.projectBrief.genre || "Unset"}</span>
                <span>POV: {workflow.projectBrief.pov || "Unset"}</span>
                <span>Tense: {workflow.projectBrief.tense || "Unset"}</span>
                <span>Target: {workflow.projectBrief.approximateTargetLength || "Unset"}</span>
                <span>Status: {workflow.projectStatus.replaceAll("_", " ")}</span>
              </div>
            </div>
          </div>
          <div className="project-status-strip">
            <div>
              <span>Active manuscript</span>
              <strong>{activeManuscript?.title ?? "No active manuscript yet"}</strong>
            </div>
            <div>
              <span>Last written</span>
              <strong>{formatTime(activeManuscript?.updatedAt)}</strong>
            </div>
            <div>
              <span>Word count</span>
              <strong>{nodes.filter((node) => node.kind === "scene").reduce((sum, node) => sum + node.wordCount, 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Phase progress</span>
              <strong>{Math.round(((phaseIndex + 1) / workflowPhases.length) * 100)}%</strong>
            </div>
          </div>
        </div>
      </section>

      {phaseWorkspace}

      <section className="dashboard-main-grid">
        <article className="card recommended-card">
          <header className="card-header">
            <span>RECOMMENDED NEXT ACTION</span>
          </header>
          <div className="recommended-body">
            <div className="recommended-icon">
              <CheckCircle2 size={40} />
            </div>
            <div className="recommended-copy">
              <h3>{workflow.recommendation.title}</h3>
              <p>{workflow.recommendation.reason}</p>
              <div className="recommended-actions">
                <button className="primary" onClick={() => onNavigateWorkspace(workflow.recommendation.workspaceTarget)}>
                  {workflow.recommendation.workspaceTarget === "workflow" ? "Open Workflow Home" : `Open ${workflow.recommendation.workspaceTarget}`}
                  <ArrowRight size={15} />
                </button>
                {workflow.recommendation.secondaryActions.map((action) => (
                  <button key={action.label} onClick={() => onNavigateWorkspace(action.workspaceTarget)}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <aside className="why-box">
              <h4>WHY THIS MATTERS</h4>
              <ul>
                <li>Anchors the current decision.</li>
                <li>Prevents drifting into the wrong phase.</li>
                <li>Moves you toward a usable next artifact.</li>
                <li>Kept soft: you can still work elsewhere.</li>
              </ul>
            </aside>
          </div>
        </article>

        <div className="dashboard-row">
          <article className="card activity-card">
            <header className="card-header">
              <span>RECENT ACTIVITY</span>
              <button onClick={() => onNavigateWorkspace("files")}>View all</button>
            </header>
            <div className="activity-list">
              {(workflow.milestones.length ? workflow.milestones.slice(-3).reverse() : []).map((milestone) => (
                <div key={milestone.id} className="activity-item">
                  <Clock3 size={16} />
                  <div>
                    <strong>{milestone.title}</strong>
                    <small>{milestone.description}</small>
                  </div>
                </div>
              ))}
              {recentArtifacts.slice(0, 3).map((artifact) => (
                <div key={artifact.id} className="activity-item">
                  <Sparkles size={16} />
                  <div>
                    <strong>{artifact.title}</strong>
                    <small>{artifact.description}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card progress-card">
            <header className="card-header">
              <span>PHASE PROGRESS</span>
            </header>
            <div className="phase-progress-list">
              {workflowPhases.map((phase, index) => {
                const done = index < phaseIndex;
                const current = index === phaseIndex;
                return (
                  <div key={phase.id} className={`phase-progress-item ${current ? "current" : done ? "done" : "upcoming"}`}>
                    <div className="phase-progress-head">
                      <span>{String(index + 1).padStart(2, "0")}.</span>
                      <strong>{phase.displayName}</strong>
                    </div>
                    <div className="phase-progress-bar">
                      <i style={{ width: done ? "100%" : current ? "65%" : "10%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="phase-legend">
              <span><i className="done" /> Completed</span>
              <span><i className="current" /> In progress</span>
              <span><i className="upcoming" /> Not started</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
