import { ArrowRight, BookCopy, Check, MapPin, Plus, Sparkles, UserRound } from "lucide-react";
import type { Character, ManuscriptNode, Project } from "../domain/models";
import {
  createBlankNorthStar,
  createBlankProjectBrief,
  createBlankStoryArchitecture,
  workflowPhaseOrder,
  workflowPhases,
  type CreativeNorthStar,
  type StoryArchitecture,
  type WorkflowDecision,
  type WorkflowDiscoveryEntry,
  type WorkflowPhaseId,
  type WorkflowState,
} from "../domain/workflow";

type WorkspaceJump = "workflow" | "manuscript" | "character" | "ai" | "research" | "bible" | "analysis" | "series" | "files" | "publishing" | "settings" | "models" | "pipelines" | "comments" | "history" | "visuals";

interface Props {
  project: Project;
  nodes: ManuscriptNode[];
  characters: Character[];
  workflow: WorkflowState;
  focusPhaseId: WorkflowPhaseId;
  onSave: (next: WorkflowState) => Promise<void> | void;
  onNavigateWorkspace: (workspace: WorkspaceJump) => void;
  onResumeManuscript: () => void;
}

function splitLines(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

function parseLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function fieldStatus(value: WorkflowState["projectBrief"]["fieldStatus"][string] | undefined): string {
  return value ?? "unresolved";
}

function savePatch(workflow: WorkflowState, patch: Partial<WorkflowState>, onSave: Props["onSave"]) {
  void onSave({ ...workflow, ...patch, source: "manual" });
}

export function WorkflowPanel({ project, nodes, characters, workflow, focusPhaseId, onSave, onNavigateWorkspace, onResumeManuscript }: Props) {
  const activeManuscript = workflow.activeManuscriptId
    ? nodes.find((node) => node.id === workflow.activeManuscriptId)
    : nodes.find((node) => node.kind === "scene") ?? nodes.find((node) => node.kind === "chapter");
  const currentPhase = workflowPhases.find((phase) => phase.id === workflow.currentPhaseId) ?? workflowPhases[0];
  const focusPhase = workflowPhases.find((phase) => phase.id === focusPhaseId) ?? currentPhase;
  const phaseIndex = Math.max(0, workflowPhaseOrder.indexOf(workflow.currentPhaseId));
  const progress = Math.round(((phaseIndex + 1) / workflowPhaseOrder.length) * 100);
  const majorCharacters = characters.filter((character) => character.role === "major");

  const updateBrief = (patch: Partial<typeof workflow.projectBrief>) =>
    savePatch(workflow, {
      projectBrief: { ...workflow.projectBrief, ...patch, fieldStatus: { ...workflow.projectBrief.fieldStatus, ...patch.fieldStatus } },
    }, onSave);

  const updateNorthStar = (patch: Partial<CreativeNorthStar>) =>
    savePatch(workflow, { creativeNorthStar: { ...workflow.creativeNorthStar, ...patch } }, onSave);

  const updateArchitecture = (patch: Partial<StoryArchitecture>) =>
    savePatch(workflow, { storyArchitecture: { ...workflow.storyArchitecture, ...patch } }, onSave);

  const addDiscoveryEntry = () => {
    const entry: WorkflowDiscoveryEntry = {
      id: crypto.randomUUID(),
      title: "New discovery note",
      notes: "",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePatch(workflow, { discoveryEntries: [entry, ...workflow.discoveryEntries] }, onSave);
  };

  const updateDiscoveryEntry = (entryId: string, patch: Partial<WorkflowDiscoveryEntry>) => {
    savePatch(workflow, {
      discoveryEntries: workflow.discoveryEntries.map((entry) => (entry.id === entryId ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry)),
    }, onSave);
  };

  const addDecision = () => {
    const decision: WorkflowDecision = {
      id: crypto.randomUUID(),
      title: "New decision",
      description: "",
      phaseId: workflow.currentPhaseId,
      status: "open",
      optionsConsidered: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePatch(workflow, { decisions: [decision, ...workflow.decisions], unresolvedDecisionIds: [decision.id, ...workflow.unresolvedDecisionIds] }, onSave);
  };

  const updateDecision = (decisionId: string, patch: Partial<WorkflowDecision>) => {
    const now = new Date().toISOString();
    const nextDecisions = workflow.decisions.map((decision) => {
      if (decision.id !== decisionId) return decision;
      const nextStatus = patch.status ?? decision.status;
      return {
        ...decision,
        ...patch,
        updatedAt: now,
        resolvedAt: nextStatus === "resolved" ? now : nextStatus === "open" ? undefined : decision.resolvedAt,
      };
    });
    savePatch(workflow, {
      decisions: nextDecisions,
      unresolvedDecisionIds: nextDecisions.filter((decision) => decision.status === "open" || decision.status === "deferred").map((decision) => decision.id),
    }, onSave);
  };

  const artifactCards = workflow.artifacts.length ? workflow.artifacts : [];
  const unresolvedDecisions = workflow.decisions.filter((decision) => decision.status === "open" || decision.status === "deferred");

  return (
    <div className="workflow-panel">
      <header className="workflow-hero">
        <div>
          <span className="eyebrow">WORKFLOW HOME</span>
          <h2>{project.title || "Untitled project"}</h2>
          <p>{workflow.projectBrief.projectType === "series_book" && workflow.projectBrief.seriesTitle ? `${workflow.projectBrief.seriesTitle} · Book ${workflow.projectBrief.bookNumber ?? "?"}` : "Standalone project"}</p>
        </div>
        <div className="workflow-hero-actions">
          {workflow.activeManuscriptId && <button className="primary" onClick={onResumeManuscript}><BookCopy size={15} /> Resume manuscript</button>}
          <button onClick={() => onNavigateWorkspace("workflow")}><Sparkles size={14} /> Stay on workflow</button>
        </div>
      </header>

      <section className="workflow-position">
        <div>
          <span className="eyebrow">CURRENT POSITION</span>
          <strong>{currentPhase.displayName}</strong>
          <small>{currentPhase.shortExplanation}</small>
        </div>
        <div className="workflow-position-controls">
          <label>
            <span>Current phase</span>
            <select
              value={workflow.currentPhaseId}
              onChange={(event) => savePatch(workflow, { currentPhaseId: event.target.value as WorkflowPhaseId, source: "manual" }, onSave)}
            >
              {workflowPhases.map((phase) => <option key={phase.id} value={phase.id}>{phase.displayName}</option>)}
            </select>
          </label>
          <div className="workflow-status">
            <span>{workflow.projectStatus}</span>
            <strong>{progress}%</strong>
          </div>
        </div>
      </section>

      <section className="workflow-summary-grid">
        <article>
          <span className="eyebrow">ACTIVE MANUSCRIPT</span>
          <strong>{activeManuscript?.title ?? "No active manuscript yet"}</strong>
          <small>{workflow.activeManuscriptId ? "Continue writing from the existing draft." : "Create or select a manuscript when you are ready."}</small>
        </article>
        <article>
          <span className="eyebrow">LATEST MILESTONE</span>
          <strong>{workflow.milestones.at(-1)?.title ?? "None recorded"}</strong>
          <small>{workflow.milestones.at(-1)?.description ?? "Early work is still being assembled."}</small>
        </article>
        <article>
          <span className="eyebrow">RECOMMENDATION</span>
          <strong>{workflow.recommendation.title}</strong>
          <small>{workflow.recommendation.reason}</small>
        </article>
        <article>
          <span className="eyebrow">DRAFTING READINESS</span>
          <strong>{workflow.draftingReadiness.status.replaceAll("_", " ")}</strong>
          <small>{workflow.draftingReadiness.summary}</small>
        </article>
      </section>

      <section className="workflow-callout">
        <div>
          <span className="eyebrow">RECOMMENDED NEXT MOVE</span>
          <strong>{workflow.recommendation.title}</strong>
          <p>{workflow.recommendation.reason}</p>
        </div>
        <div className="workflow-callout-actions">
          <button className="primary" onClick={() => onNavigateWorkspace(workflow.recommendation.workspaceTarget)}>
            Open {workflow.recommendation.workspaceTarget === "workflow" ? "workflow home" : workflow.recommendation.workspaceTarget}
            <ArrowRight size={14} />
          </button>
          {workflow.recommendation.secondaryActions.map((action) => (
            <button key={action.label} onClick={() => onNavigateWorkspace(action.workspaceTarget)}>
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="workflow-card workflow-focus">
        <header>
          <div>
            <span className="eyebrow">{focusPhase.displayName.toUpperCase()}</span>
            <strong>{focusPhase.purpose}</strong>
          </div>
          <button onClick={() => onNavigateWorkspace(focusPhase.relevantWorkspaces[0] ?? "workflow")}>{focusPhase.relevantWorkspaces.length ? `Open ${focusPhase.relevantWorkspaces[0]}` : "Open workspace"}</button>
        </header>
        <div className="workflow-summary-text">
          <p>{focusPhase.shortExplanation}</p>
          <p>{focusPhase.expectedArtifacts.length ? `Expected artifacts: ${focusPhase.expectedArtifacts.join(" · ")}` : "No specific artifacts are required yet."}</p>
        </div>
      </section>

      {focusPhaseId === "project_creation" || focusPhaseId === "idea_capture" ? (
        <section className="workflow-card">
          <header>
            <div>
              <span className="eyebrow">PROJECT BRIEF</span>
              <strong>Idea capture and framing</strong>
            </div>
            <button onClick={() => updateBrief(createBlankProjectBrief(project.title))}>Reset brief</button>
          </header>
          <div className="workflow-grid">
            <label><span>Working title <small>{fieldStatus(workflow.projectBrief.fieldStatus.workingTitle)}</small></span><input value={workflow.projectBrief.workingTitle} onChange={(event) => updateBrief({ workingTitle: event.target.value })} /></label>
            <label><span>Project type <small>{fieldStatus(workflow.projectBrief.fieldStatus.projectType)}</small></span><select value={workflow.projectBrief.projectType} onChange={(event) => updateBrief({ projectType: event.target.value as WorkflowState["projectBrief"]["projectType"] })}><option value="standalone">Standalone</option><option value="series_book">Series book</option></select></label>
            <label><span>Series title</span><input value={workflow.projectBrief.seriesTitle} onChange={(event) => updateBrief({ seriesTitle: event.target.value })} /></label>
            <label><span>Book number</span><input type="number" min="1" step="1" value={workflow.projectBrief.bookNumber ?? ""} onChange={(event) => updateBrief({ bookNumber: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label><span>Genre</span><input value={workflow.projectBrief.genre} onChange={(event) => updateBrief({ genre: event.target.value })} /></label>
            <label><span>Subgenre</span><input value={workflow.projectBrief.subgenre} onChange={(event) => updateBrief({ subgenre: event.target.value })} /></label>
            <label><span>Audience</span><input value={workflow.projectBrief.intendedAudience} onChange={(event) => updateBrief({ intendedAudience: event.target.value })} /></label>
            <label><span>Approximate length</span><input value={workflow.projectBrief.approximateTargetLength} onChange={(event) => updateBrief({ approximateTargetLength: event.target.value })} /></label>
            <label><span>POV</span><input value={workflow.projectBrief.pov} onChange={(event) => updateBrief({ pov: event.target.value })} /></label>
            <label><span>Tense</span><input value={workflow.projectBrief.tense} onChange={(event) => updateBrief({ tense: event.target.value })} /></label>
            <label className="span-2"><span>Original premise <small>{fieldStatus(workflow.projectBrief.fieldStatus.originalPremise)}</small></span><textarea rows={4} value={workflow.projectBrief.originalPremise} onChange={(event) => updateBrief({ originalPremise: event.target.value })} /></label>
            <label className="span-2"><span>Scenes or images already imagined</span><textarea rows={3} value={splitLines(workflow.projectBrief.scenesOrImagesAlreadyImagined)} onChange={(event) => updateBrief({ scenesOrImagesAlreadyImagined: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Themes</span><textarea rows={3} value={splitLines(workflow.projectBrief.themes)} onChange={(event) => updateBrief({ themes: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Inspirations</span><textarea rows={3} value={splitLines(workflow.projectBrief.inspirations)} onChange={(event) => updateBrief({ inspirations: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Things to avoid</span><textarea rows={3} value={splitLines(workflow.projectBrief.thingsToAvoid)} onChange={(event) => updateBrief({ thingsToAvoid: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Open notes</span><textarea rows={4} value={workflow.projectBrief.openNotes} onChange={(event) => updateBrief({ openNotes: event.target.value })} /></label>
          </div>
        </section>
      ) : null}

      {focusPhaseId === "creative_north_star" ? (
        <section className="workflow-card">
          <header>
            <div>
              <span className="eyebrow">CREATIVE NORTH STAR</span>
              <strong>Intended reader experience</strong>
            </div>
            <button onClick={() => updateNorthStar(createBlankNorthStar())}>Reset North Star</button>
          </header>
          <div className="workflow-grid">
            <label className="span-2"><span>Reader experience</span><textarea rows={3} value={workflow.creativeNorthStar.readerExperience} onChange={(event) => updateNorthStar({ readerExperience: event.target.value })} /></label>
            <label className="span-2"><span>Emotional promise</span><textarea rows={3} value={workflow.creativeNorthStar.emotionalPromise} onChange={(event) => updateNorthStar({ emotionalPromise: event.target.value })} /></label>
            <label className="span-2"><span>Distinguishing qualities</span><textarea rows={3} value={splitLines(workflow.creativeNorthStar.distinguishingQualities)} onChange={(event) => updateNorthStar({ distinguishingQualities: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Central thematic concern</span><textarea rows={3} value={workflow.creativeNorthStar.centralThematicConcern} onChange={(event) => updateNorthStar({ centralThematicConcern: event.target.value })} /></label>
            <label className="span-2"><span>Genre promises</span><textarea rows={3} value={splitLines(workflow.creativeNorthStar.genrePromises)} onChange={(event) => updateNorthStar({ genrePromises: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Conventions to challenge</span><textarea rows={3} value={splitLines(workflow.creativeNorthStar.conventionsToChallenge)} onChange={(event) => updateNorthStar({ conventionsToChallenge: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Tone and atmosphere</span><textarea rows={3} value={workflow.creativeNorthStar.toneAndAtmosphere} onChange={(event) => updateNorthStar({ toneAndAtmosphere: event.target.value })} /></label>
            <label className="span-2"><span>What the reader should remember</span><textarea rows={3} value={workflow.creativeNorthStar.whatTheReaderShouldRemember} onChange={(event) => updateNorthStar({ whatTheReaderShouldRemember: event.target.value })} /></label>
            <label className="span-2"><span>Creative guardrails</span><textarea rows={3} value={splitLines(workflow.creativeNorthStar.explicitCreativeGuardrails)} onChange={(event) => updateNorthStar({ explicitCreativeGuardrails: parseLines(event.target.value) })} /></label>
          </div>
        </section>
      ) : null}

      {focusPhaseId === "discovery" ? (
        <section className="workflow-card">
          <header>
            <div>
              <span className="eyebrow">DISCOVERY</span>
              <strong>Premise exploration and open questions</strong>
            </div>
            <button onClick={addDiscoveryEntry}><Plus size={13} /> Add note</button>
          </header>
          <div className="workflow-list-grid">
            {workflow.discoveryEntries.length === 0 && <p className="workflow-empty">No discovery entries yet. Start with a question, a possible direction, or a rejected cliché.</p>}
            {workflow.discoveryEntries.map((entry) => (
              <article key={entry.id} className="workflow-entry">
                <div className="workflow-entry-head">
                  <input value={entry.title} onChange={(event) => updateDiscoveryEntry(entry.id, { title: event.target.value })} />
                  <select value={entry.status} onChange={(event) => updateDiscoveryEntry(entry.id, { status: event.target.value as WorkflowDiscoveryEntry["status"] })}>
                    <option value="open">Open</option>
                    <option value="tentative">Tentative</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </div>
                <textarea rows={3} value={entry.notes} onChange={(event) => updateDiscoveryEntry(entry.id, { notes: event.target.value })} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {focusPhaseId === "character_foundations" ? (
        <section className="workflow-card">
          <header>
            <div>
              <span className="eyebrow">CHARACTER FOUNDATIONS</span>
              <strong>{majorCharacters.length ? `${majorCharacters.length} major character${majorCharacters.length === 1 ? "" : "s"} present` : "No major characters yet"}</strong>
            </div>
            <button onClick={() => onNavigateWorkspace("character")}><UserRound size={13} /> Open Character panel</button>
          </header>
          <div className="workflow-summary-text">
            <p>{majorCharacters.length ? "The existing character system is available here and remains the source of truth for identity, psychology, voice, and relationships." : "Add the protagonist first. The workflow will then surface voice readiness, wound, desire, and relationship gaps."}</p>
            <p>{unresolvedDecisions.some((decision) => decision.phaseId === "character_foundations") ? "Some character decisions remain open and can stay reviewable while you work." : "Character work can stay flexible until you decide to lock it in."}</p>
          </div>
        </section>
      ) : null}

      {focusPhaseId === "story_architecture" ? (
        <section className="workflow-card">
          <header>
            <div>
              <span className="eyebrow">STORY ARCHITECTURE</span>
              <strong>Beginning, conflict, and turning points</strong>
            </div>
            <button onClick={() => onNavigateWorkspace("analysis")}><MapPin size={13} /> Open analysis</button>
          </header>
          <div className="workflow-grid">
            <label className="span-2"><span>Story engine</span><textarea rows={3} value={workflow.storyArchitecture.storyEngine} onChange={(event) => updateArchitecture({ storyEngine: event.target.value })} /></label>
            <label className="span-2"><span>Central conflict</span><textarea rows={3} value={workflow.storyArchitecture.centralConflict} onChange={(event) => updateArchitecture({ centralConflict: event.target.value })} /></label>
            <label className="span-2"><span>Thematic conflict</span><textarea rows={3} value={workflow.storyArchitecture.thematicConflict} onChange={(event) => updateArchitecture({ thematicConflict: event.target.value })} /></label>
            <label className="span-2"><span>Protagonist transformation</span><textarea rows={3} value={workflow.storyArchitecture.protagonistTransformation} onChange={(event) => updateArchitecture({ protagonistTransformation: event.target.value })} /></label>
            <label className="span-2"><span>Series arc</span><textarea rows={3} value={workflow.storyArchitecture.seriesArc} onChange={(event) => updateArchitecture({ seriesArc: event.target.value })} /></label>
            <label className="span-2"><span>Beginning state</span><textarea rows={3} value={workflow.storyArchitecture.beginningState} onChange={(event) => updateArchitecture({ beginningState: event.target.value })} /></label>
            <label className="span-2"><span>Ending state</span><textarea rows={3} value={workflow.storyArchitecture.endingState} onChange={(event) => updateArchitecture({ endingState: event.target.value })} /></label>
            <label className="span-2"><span>Major turning points</span><textarea rows={3} value={splitLines(workflow.storyArchitecture.majorTurningPoints)} onChange={(event) => updateArchitecture({ majorTurningPoints: parseLines(event.target.value) })} /></label>
            <label className="span-2"><span>Act structure</span><textarea rows={3} value={workflow.storyArchitecture.actStructure} onChange={(event) => updateArchitecture({ actStructure: event.target.value })} /></label>
            <label className="span-2"><span>Chapter map status</span><textarea rows={3} value={workflow.storyArchitecture.chapterMapStatus} onChange={(event) => updateArchitecture({ chapterMapStatus: event.target.value })} /></label>
          </div>
        </section>
      ) : null}

      {focusPhaseId === "drafting_readiness" ? (
        <section className="workflow-card">
          <header>
            <div>
              <span className="eyebrow">DRAFTING READINESS</span>
              <strong>{workflow.draftingReadiness.summary}</strong>
            </div>
            <button onClick={() => onNavigateWorkspace("manuscript")}><BookCopy size={13} /> Resume manuscript</button>
          </header>
          <div className="workflow-readiness">
            <div>
              <span>Active manuscript</span>
              <ul>
                <li>{activeManuscript?.title ?? "No active manuscript yet"}</li>
                <li>{workflow.activeManuscriptId ? "This section can be resumed immediately." : "Create or select a manuscript when you are ready."}</li>
              </ul>
            </div>
            <div>
              <span>Signals present</span>
              <ul>{workflow.draftingReadiness.signals.length ? workflow.draftingReadiness.signals.map((signal) => <li key={signal}>{signal}</li>) : <li>None yet</li>}</ul>
            </div>
            <div>
              <span>Missing or uncertain</span>
              <ul>{workflow.draftingReadiness.missing.length ? workflow.draftingReadiness.missing.map((item) => <li key={item}>{item}</li>) : <li>Nothing essential is missing.</li>}</ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="workflow-card">
        <header>
          <div>
            <span className="eyebrow">UNRESOLVED DECISIONS</span>
            <strong>Questions that remain open</strong>
          </div>
          <button onClick={addDecision}><Plus size={13} /> Add decision</button>
        </header>
        <div className="workflow-list-grid">
          {workflow.decisions.length === 0 && <p className="workflow-empty">No decisions recorded yet.</p>}
          {workflow.decisions.map((decision) => (
            <article key={decision.id} className="workflow-entry">
              <div className="workflow-entry-head">
                <input value={decision.title} onChange={(event) => updateDecision(decision.id, { title: event.target.value })} />
                <select value={decision.status} onChange={(event) => updateDecision(decision.id, { status: event.target.value as WorkflowDecision["status"] })}>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="deferred">Deferred</option>
                  <option value="intentionally_skipped">Skipped</option>
                </select>
              </div>
              <textarea rows={2} value={decision.description} onChange={(event) => updateDecision(decision.id, { description: event.target.value })} />
              <div className="workflow-inline-grid">
                <label><span>Phase</span><select value={decision.phaseId} onChange={(event) => updateDecision(decision.id, { phaseId: event.target.value as WorkflowPhaseId })}>{workflowPhases.map((phase) => <option key={phase.id} value={phase.id}>{phase.displayName}</option>)}</select></label>
                <label><span>Selected answer</span><input value={decision.selectedDecision ?? ""} onChange={(event) => updateDecision(decision.id, { selectedDecision: event.target.value })} /></label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-card">
        <header>
          <div>
            <span className="eyebrow">ARTIFACT TRAIL</span>
            <strong>What the project knows so far</strong>
          </div>
          <button onClick={() => savePatch(workflow, { currentPhaseId: workflow.currentPhaseId, source: "manual" }, onSave)}><Check size={13} /> Mark phase as current</button>
        </header>
        <div className="workflow-chip-row">
          {artifactCards.length === 0 && <p className="workflow-empty">No derived artifacts yet. The project brief and North Star will appear here once they contain real content.</p>}
          {artifactCards.map((artifact) => (
            <button key={artifact.id} onClick={() => onNavigateWorkspace(artifact.workspaceTarget)} className="workflow-chip">
              <strong>{artifact.title}</strong>
              <small>{artifact.description}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
