import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check, Crown, LoaderCircle, Rocket, Save, Settings2, ShieldAlert } from "lucide-react";
import type {
  PublishingChecklistItem,
  PublishingChecklistStatus,
  PublishingChecklistWorkspaceTarget,
  PublishingMetadata,
  PublishingPublicationEvent,
  PublishingStage,
  PublishingStageId,
  PublishingStageStatus,
  PublishingWorkflowState,
  PublishingChecklistState,
} from "../domain/publishing";
import {
  blankPublishingWorkflow,
  buildPublishingChecklistState,
  publicationGateSummary,
  publishingTargetProfiles,
  stageTemplateById,
} from "../domain/publishing";
import { chooseAndExportPublication } from "../lib/documentRepository";
import { loadPublishingWorkflow, persistPublishingWorkflow } from "../lib/publishingWorkflowRepository";
import type { Character, ManuscriptNode } from "../domain/models";
import "../publishing.css";

const stageStates: PublishingStageStatus[] = ["not-started", "active", "complete", "blocked", "deferred"];
const stageLabel: Record<PublishingStageStatus, string> = {
  "not-started": "Not started",
  active: "Active",
  complete: "Complete",
  blocked: "Blocked",
  deferred: "Deferred",
};

const isDesktop = () => "__TAURI_INTERNALS__" in window;
const toLineItems = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean).join(", ");

const checklistStatusLabel: Record<PublishingChecklistStatus, string> = {
  not_started: "Needs attention",
  in_progress: "In progress",
  complete: "Ready",
  skipped: "Skipped intentionally",
  not_applicable: "Not applicable",
};

export function PublishingPanel({ projectId, projectTitle, nodes, characters, onNavigateWorkspace }: { projectId: string; projectTitle: string; nodes: ManuscriptNode[]; characters: Character[]; onNavigateWorkspace?: (workspace: PublishingChecklistWorkspaceTarget) => void }) {
  const [workflow, setWorkflow] = useState<PublishingWorkflowState>(() => blankPublishingWorkflow(projectId, projectTitle));
  const [selectedStageId, setSelectedStageId] = useState<PublishingStageId>("project-creation");
  const [busy, setBusy] = useState<"publish" | "export-kindle" | "export-paperback" | "export-hardcover" | "save" | "load" | "archive" | "reset" | "validate" | "metadata">();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [reopenNote, setReopenNote] = useState("");

  useEffect(() => {
    let mounted = true;
    setBusy("load");
    loadPublishingWorkflow(projectId, projectTitle)
      .then((loaded) => {
        if (!mounted) return;
        setWorkflow(loaded);
        setSelectedStageId(loaded.publicationState !== "draft" ? "publication" : loaded.stages.find((stage) => stage.status !== "complete")?.id ?? loaded.stages[0].id);
      })
      .catch((cause) => mounted && setError(String(cause)))
      .finally(() => mounted && setBusy(undefined));
    return () => { mounted = false; };
  }, [projectId, projectTitle]);

  useEffect(() => {
    if (workflow.stages.some((stage) => stage.id === selectedStageId)) return;
    setSelectedStageId(workflow.publicationState !== "draft" ? "publication" : workflow.stages.find((stage) => stage.status !== "complete")?.id ?? workflow.stages[0].id);
  }, [workflow, selectedStageId]);

  const snapshot = useMemo(() => ({ projectTitle, nodes, characters }), [projectTitle, nodes, characters]);
  const checklist = useMemo<PublishingChecklistState>(() => buildPublishingChecklistState(workflow, snapshot, workflow.checklistItems), [workflow, snapshot]);
  const readiness = useMemo(() => publicationGateSummary(workflow, checklist), [workflow, checklist]);
  const selectedStage = useMemo(() => workflow.stages.find((stage) => stage.id === selectedStageId) ?? workflow.stages[0], [workflow, selectedStageId]);
  const selectedTemplate = useMemo(() => stageTemplateById(selectedStage.id), [selectedStage.id]);
  const selectedItems = checklist.items.filter((item) => item.phaseId === selectedStage.id);
  const showDashboard = selectedStage.id === "publication";
  const published = Boolean(workflow.lastPublishedAt);
  const reopened = workflow.publicationState === "reopened";
  const locked = workflow.archiveLocked;
  const stageLookup = useMemo(() => new Map<string, PublishingStage>(workflow.stages.map((stage) => [stage.id, stage])), [workflow.stages]);
  const phaseLookup = useMemo(() => new Map<string, PublishingChecklistState["phases"][number]>(checklist.phases.map((phase) => [phase.phaseId, phase])), [checklist.phases]);
  const dashboardRows = useMemo(() => {
    const phaseComplete = (phaseId: string) => {
      const stage = stageLookup.get(phaseId);
      if (stage) return stage.status === "complete";
      const phase = phaseLookup.get(phaseId);
      return Boolean(phase && phase.requiredIncomplete === 0);
    };
    return [
      { label: "Story Complete", ready: phaseComplete("draft"), detail: "Draft complete and the story has a finish line." },
      { label: "Development Complete", ready: phaseComplete("development-pass"), detail: "Development pass is finished." },
      { label: "Character Pass Complete", ready: phaseComplete("character-voice"), detail: "Voice and character consistency are locked." },
      { label: "Narrative Pass Complete", ready: phaseComplete("narrative-weight"), detail: "Narrative weight and texture review are complete." },
      { label: "Continuity Complete", ready: phaseComplete("continuity-pass"), detail: "Continuity issues are resolved or intentionally overridden." },
      { label: "Proof Complete", ready: phaseComplete("proof-integrity"), detail: "Integrity and proof checks are clean." },
      { label: "Kindle Ready", ready: readiness.formats.kindle.ready, detail: readiness.formats.kindle.selected ? "Kindle export and preview QA are complete." : "Kindle is not selected for this project." },
      { label: "Paperback Ready", ready: readiness.formats.paperback.ready, detail: readiness.formats.paperback.selected ? "Paperback export and preview QA are complete." : "Paperback is not selected for this project." },
      { label: "Cover Complete", ready: phaseComplete("cover-production"), detail: "Cover work is approved or intentionally deferred." },
      { label: "Metadata Complete", ready: phaseComplete("metadata") && readiness.missingMetadata.length === 0, detail: readiness.missingMetadata.length ? `Missing: ${readiness.missingMetadata.join(", ")}` : "Publication metadata is complete." },
      { label: "Ready for Publication", ready: readiness.publishable, detail: readiness.recommendation },
    ];
  }, [phaseLookup, readiness, stageLookup]);

  const commit = (next: PublishingWorkflowState, noticeText?: string) => {
    const saved = { ...next, updatedAt: new Date().toISOString() };
    setWorkflow(saved);
    if (noticeText) setNotice(noticeText);
    void persistPublishingWorkflow(saved, projectTitle).catch((cause) => setError(String(cause)));
  };

  const patchWorkflow = (patch: Partial<PublishingWorkflowState>) => commit({ ...workflow, ...patch });
  const patchMetadata = <K extends keyof PublishingMetadata>(key: K, value: PublishingMetadata[K]) => commit({ ...workflow, metadata: { ...workflow.metadata, [key]: value } });
  const patchStage = <K extends keyof PublishingStage>(stageId: PublishingStageId, key: K, value: PublishingStage[K]) => commit({ ...workflow, stages: workflow.stages.map((stage) => stage.id === stageId ? { ...stage, [key]: value } : stage) });
  const patchChecklist = (itemId: string, patch: Partial<PublishingChecklistItem>, noticeText?: string) => {
    const base = checklist.items.find((item) => item.id === itemId) ?? workflow.checklistItems.find((item) => item.id === itemId);
    if (!base) return;
    const nextItem = { ...base, ...patch, updatedAt: new Date().toISOString() };
    const nextItems = [...workflow.checklistItems.filter((item) => item.id !== itemId), nextItem];
    commit({ ...workflow, checklistItems: nextItems }, noticeText);
  };
  const reopenChecklist = (item: PublishingChecklistItem) => patchChecklist(item.id, { status: "in_progress", completionSource: "manual", completedAt: undefined, overrideNote: item.overrideNote ?? "" }, "Checklist item reopened locally.");
  const setChecklistStatus = (item: PublishingChecklistItem, status: PublishingChecklistStatus) => patchChecklist(item.id, {
    status,
    completionSource: "manual",
    completedAt: status === "complete" ? new Date().toISOString() : undefined,
    overrideNote: status === "skipped" || status === "not_applicable" ? item.overrideNote ?? "Intentionally overridden by the author." : item.overrideNote,
  }, `Marked “${item.title}” as ${checklistStatusLabel[status].toLowerCase()}.`);

  const markStage = (stageId: PublishingStageId, status: PublishingStageStatus) => patchStage(stageId, "status", status);
  const finishCurrent = () => markStage(selectedStage.id, "complete");
  const archiveProject = () => patchWorkflow({ archiveLocked: true });
  const publishNow = async () => {
    if (!readiness.ready || busy) return;
    setBusy("publish");
    try {
      const timestamp = new Date().toISOString();
      const event: PublishingPublicationEvent = { id: crypto.randomUUID(), type: "published", at: timestamp, note: "Published from the dashboard." };
      const next = {
        ...workflow,
        stages: workflow.stages.map((stage): PublishingStage => stage.id === "publication" ? { ...stage, status: "complete" as PublishingStageStatus } : stage),
        publicationState: "published" as const,
        lastPublishedAt: timestamp,
        lastReopenedAt: workflow.lastReopenedAt,
        archiveLocked: true,
        checklistItems: workflow.checklistItems,
        publicationHistory: [...workflow.publicationHistory, event],
      };
      commit(next, "Publication gate recorded locally.");
      setSelectedStageId("publication");
      setConfirmPublishOpen(false);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(undefined);
    }
  };

  const reopenForRevision = async () => {
    if (!published || !reopenNote.trim() || busy) return;
    setBusy("publish");
    try {
      const timestamp = new Date().toISOString();
      const event: PublishingPublicationEvent = { id: crypto.randomUUID(), type: "reopened", at: timestamp, note: reopenNote.trim() };
      const next = {
        ...workflow,
        publicationState: "reopened" as const,
        lastReopenedAt: timestamp,
        archiveLocked: false,
        publicationHistory: [...workflow.publicationHistory, event],
      };
      commit(next, "Publication reopened for revision locally.");
      setReopenNote("");
      setConfirmPublishOpen(false);
      setSelectedStageId("publication");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(undefined);
    }
  };

  const exportTarget = async (target: "kindle" | "paperback" | "hardcover") => {
    if (!isDesktop()) {
      setError("Publication exports are available in the desktop app.");
      return;
    }
    setBusy(`export-${target}` as typeof busy);
    setError("");
    try {
      const result = await chooseAndExportPublication(workflow.metadata.title || projectTitle, target);
      if (result) {
        const checklistId = target === "kindle" ? "kindle-export" : target === "paperback" ? "paperback-export" : "hardcover-export";
        const nextItems = workflow.checklistItems.some((item) => item.id === checklistId)
          ? workflow.checklistItems.map((item) => item.id === checklistId ? { ...item, status: "complete" as PublishingChecklistStatus, completionSource: "manual" as const, evidenceReference: result.outputPath, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item)
          : [...workflow.checklistItems, { id: checklistId, phaseId: "production-pass" as PublishingStageId, title: `${target[0].toUpperCase()}${target.slice(1)} export generated`, description: `The ${target} production file was exported successfully.`, rationale: "A generated production file is the direct evidence for the production phase.", requirementLevel: "required" as const, status: "complete" as const, completionSource: "manual" as const, evidenceType: "export" as const, evidenceReference: result.outputPath, blockingForPublication: true, applicableFormats: [target], applicableProjectTypes: ["both" as const], notes: "", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), workspaceTarget: "files" as const }];
        commit({ ...workflow, checklistItems: nextItems }, `Exported ${target} edition to ${result.outputPath}`);
      }
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(undefined);
    }
  };

  const selectedIndex = workflow.stages.findIndex((stage) => stage.id === selectedStage.id);

  return <div className="publishing-panel">
    <header>
      <Rocket size={18}/>
      <div>
        <strong>Publishing Workflow</strong>
        <small>Soft guidance · Universal workflow · Local-first publication readiness</small>
      </div>
      <button className="save-workflow" onClick={() => commit(workflow, "Publishing workflow saved locally.")} disabled={!!busy}>
        {busy === "save" ? <LoaderCircle className="spin" size={12}/> : <Save size={12}/>} Save
      </button>
    </header>

    <section className="publishing-banner">
      <div className={readiness.publishable ? "gate ready" : "gate waiting"}>
        <span>{readiness.publishable ? "Publication gate is green" : "Publication gate needs attention"}</span>
        <strong>{readiness.publishable ? "Ready to publish" : `${readiness.completedStages} / ${Math.max(readiness.totalStages - 1, 1)} pre-publication stages complete`}</strong>
        <small>{readiness.recommendation}</small>
      </div>
      <div className="target-strip">
        {publishingTargetProfiles.map((target) => <article key={target.target}>
          <b>{target.label}</b>
          <span>{target.description}</span>
          <em>{readiness.formats[target.target].selected ? (readiness.formats[target.target].ready ? "Ready" : `${readiness.formats[target.target].requiredIncomplete} blocker(s)`) : "Not selected"}</em>
          <button disabled={!!busy || !isDesktop()} onClick={() => void exportTarget(target.target)}>
            {busy === `export-${target.target}` ? <LoaderCircle className="spin" size={12}/> : <BookMarked size={12}/>}
            Export
          </button>
        </article>)}
      </div>
    </section>

    {notice && <div className="publishing-notice"><Check size={12}/>{notice}</div>}
    {error && <div className="publishing-error" role="alert"><ShieldAlert size={12}/>{error}</div>}

    <div className="publishing-layout">
      <aside className="stage-list">
        <div className="list-heading">
          <span>Workflow stages</span>
          <small>{selectedIndex + 1} of {workflow.stages.length}</small>
        </div>
        {workflow.stages.map((stage) => <button key={stage.id} className={`${stage.id === selectedStage.id ? "active" : ""} ${stage.status}`} onClick={() => setSelectedStageId(stage.id)}>
          <b>{workflow.stages.findIndex((item) => item.id === stage.id) + 1}</b>
          <span>
            <strong>{stage.title}</strong>
            <small>{stageLabel[stage.status]} · {checklist.phases.find((entry) => entry.phaseId === stage.id)?.completionPercent ?? 0}%</small>
          </span>
        </button>)}
      </aside>

      <main className="stage-detail">
        {showDashboard ? <section className="dashboard-shell">
          <div className="dashboard-header">
            <div>
              <span>Publishing Dashboard</span>
              <strong>Project Status</strong>
              <small>{readiness.recommendation}</small>
            </div>
            <div className="dashboard-actions">
              {published ? <div className={`dashboard-published-state ${reopened ? "reopened" : "published"}`}>
                <strong>{reopened ? "Published version superseded" : "Published and locked"}</strong>
                <small>{workflow.lastPublishedAt ? `Published locally on ${new Date(workflow.lastPublishedAt).toLocaleString()}.` : "Published locally."}</small>
                {workflow.lastReopenedAt && <small>{`Reopened for revision on ${new Date(workflow.lastReopenedAt).toLocaleString()}.`}</small>}
              </div> : <button className="dashboard-publish-button" onClick={() => setConfirmPublishOpen(true)} disabled={!readiness.publishable || !!busy}>
                {busy === "publish" ? <LoaderCircle className="spin" size={16}/> : <Crown size={16}/>}
                PUBLISH
              </button>}
              {published && <button className="dashboard-reopen-button" onClick={() => setConfirmPublishOpen(true)} disabled={!!busy}>Reopen for revision</button>}
            </div>
          </div>
          <div className="dashboard-status-grid">
            {dashboardRows.map((row) => <article key={row.label} className={`dashboard-status-item ${row.ready ? "ready" : "waiting"}`}>
              <div className="dashboard-status-line">
                <span className={`dashboard-status-dot ${row.ready ? "ready" : "waiting"}`}/>
                <strong>{row.label}</strong>
              </div>
              <small>{row.detail}</small>
            </article>)}
          </div>
          <div className="dashboard-footer">
            <span>{readiness.formats.kindle.selected ? `Kindle ${readiness.formats.kindle.ready ? "ready" : "needs attention"}` : "Kindle not selected"}</span>
            <span>{readiness.formats.paperback.selected ? `Paperback ${readiness.formats.paperback.ready ? "ready" : "needs attention"}` : "Paperback not selected"}</span>
            <span>{readiness.formats.hardcover.selected ? `Hardcover ${readiness.formats.hardcover.ready ? "ready" : "needs attention"}` : "Hardcover not selected"}</span>
            <span>{locked ? "Publishing locked" : "Publishing editable"}</span>
            <span>{reopened ? "Published version superseded" : published ? "Published version active" : "Not yet published"}</span>
          </div>
          {workflow.publicationHistory.length > 0 && <section className="dashboard-history">
            <strong>Publishing history</strong>
            <div>
              {workflow.publicationHistory.slice().reverse().map((event) => <article key={event.id} className={`dashboard-history-item ${event.type}`}>
                <span>{event.type === "published" ? "Published" : "Reopened"}</span>
                <small>{new Date(event.at).toLocaleString()}</small>
                <p>{event.note}</p>
              </article>)}
            </div>
          </section>}
        </section> : <>
          <section className="stage-card">
            <div className="stage-header">
              <div>
                <span>{selectedTemplate.purpose}</span>
                <strong>{selectedStage.title}</strong>
              </div>
              <select value={selectedStage.status} onChange={(event) => markStage(selectedStage.id, event.target.value as PublishingStageStatus)}>
                {stageStates.map((state) => <option key={state} value={state}>{stageLabel[state]}</option>)}
              </select>
            </div>
            <p>{selectedTemplate.qualityGate}</p>
            <div className="deliverables">
              {selectedTemplate.deliverables.map((item) => <span key={item}>{item}</span>)}
            </div>
            <label>
              <span>Stage notes</span>
              <textarea rows={4} value={selectedStage.notes} onChange={(event) => patchStage(selectedStage.id, "notes", event.target.value)} placeholder="What is complete, what is blocked, and what needs to happen next?"/>
            </label>
            <div className="stage-actions">
              <button onClick={finishCurrent} disabled={!!busy}><Check size={12}/> Mark complete</button>
              <button onClick={() => markStage(selectedStage.id, "blocked")} disabled={!!busy}>Mark blocked</button>
              <button onClick={() => markStage(selectedStage.id, "deferred")} disabled={!!busy}>Defer</button>
            </div>
          </section>

          <section className="checklist-card">
            <div className="card-title"><Check size={13}/><strong>Operational checklist</strong></div>
            <div className="phase-summary">
              <span><b>{checklist.phases.find((phase) => phase.phaseId === selectedStage.id)?.completionPercent ?? 0}%</b> complete</span>
              <span><b>{checklist.phases.find((phase) => phase.phaseId === selectedStage.id)?.requiredIncomplete ?? 0}</b> required unresolved</span>
              <span><b>{checklist.phases.find((phase) => phase.phaseId === selectedStage.id)?.warnings ?? 0}</b> warnings</span>
              <span><b>{checklist.phases.find((phase) => phase.phaseId === selectedStage.id)?.skipped ?? 0}</b> skipped</span>
              <span><b>{checklist.phases.find((phase) => phase.phaseId === selectedStage.id)?.notApplicable ?? 0}</b> not applicable</span>
            </div>
            <p className="checklist-next">{checklist.phases.find((phase) => phase.phaseId === selectedStage.id)?.nextRecommendedAction}</p>
            <div className="checklist-list">
              {selectedItems.map((item) => <article key={item.id} className={`checklist-item ${item.status}`}>
                <header>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </div>
                  <span>{checklistStatusLabel[item.status]}</span>
                </header>
                <p>{item.rationale}</p>
                <div className="checklist-meta">
                  <span>{item.requirementLevel}</span>
                  <span>{item.evidenceType}</span>
                  {item.evidenceReference && <span title={item.evidenceReference}>{item.evidenceReference}</span>}
                  {item.overrideNote && <span title={item.overrideNote}>override noted</span>}
                </div>
                <label><span>Notes</span><textarea rows={2} value={item.notes} onChange={(event) => patchChecklist(item.id, { notes: event.target.value, completionSource: "manual" })} placeholder="Why this matters, what satisfies it, or what was intentionally skipped."/></label>
                <div className="checklist-actions">
                  <select value={item.status} onChange={(event) => setChecklistStatus(item, event.target.value as PublishingChecklistStatus)}>
                    {Object.keys(checklistStatusLabel).map((status) => <option key={status} value={status}>{checklistStatusLabel[status as PublishingChecklistStatus]}</option>)}
                  </select>
                  {item.workspaceTarget && <button onClick={() => onNavigateWorkspace?.(item.workspaceTarget!)}>Open {item.workspaceTarget}</button>}
                  <button onClick={() => reopenChecklist(item)}>Reopen</button>
                </div>
              </article>)}
              {!selectedItems.length && <div className="empty-checklist">No checklist items are defined for this phase yet.</div>}
            </div>
          </section>

          <section className="metadata-card">
            <div className="card-title"><Settings2 size={13}/><strong>Publication metadata workspace</strong></div>
            <div className="metadata-grid">
              <label><span>Title</span><input value={workflow.metadata.title} onChange={(event) => patchMetadata("title", event.target.value)} placeholder={projectTitle}/></label>
              <label><span>Subtitle</span><input value={workflow.metadata.subtitle} onChange={(event) => patchMetadata("subtitle", event.target.value)} placeholder="Optional subtitle"/></label>
              <label><span>Pen name</span><input value={workflow.metadata.penName} onChange={(event) => patchMetadata("penName", event.target.value)} placeholder="Author name used in publication"/></label>
              <label><span>Genre</span><input value={workflow.metadata.genre} onChange={(event) => patchMetadata("genre", event.target.value)} placeholder="Dark fantasy, thriller, romance…"/></label>
              <label><span>POV style</span><input value={workflow.metadata.povStyle} onChange={(event) => patchMetadata("povStyle", event.target.value)} placeholder="Close third, first person, rotating limited…"/></label>
              <label><span>Tense</span><input value={workflow.metadata.tense} onChange={(event) => patchMetadata("tense", event.target.value)} placeholder="Past tense"/></label>
              <label><span>Timeline</span><input value={workflow.metadata.timeline} onChange={(event) => patchMetadata("timeline", event.target.value)} placeholder="Linear, dual timeline, framed…"/></label>
              <label><span>Research folder</span><input value={workflow.metadata.researchFolder} onChange={(event) => patchMetadata("researchFolder", event.target.value)} placeholder="Local path or project label"/></label>
              <label><span>World Bible</span><input value={workflow.metadata.worldBible} onChange={(event) => patchMetadata("worldBible", event.target.value)} placeholder="Worldbuilding source"/></label>
              <label><span>Character Bible</span><input value={workflow.metadata.characterBible} onChange={(event) => patchMetadata("characterBible", event.target.value)} placeholder="Character intelligence source"/></label>
              <label><span>Location Bible</span><input value={workflow.metadata.locationBible} onChange={(event) => patchMetadata("locationBible", event.target.value)} placeholder="Locations source"/></label>
              <label><span>Glossary</span><input value={workflow.metadata.glossary} onChange={(event) => patchMetadata("glossary", event.target.value)} placeholder="Series glossary or terminology list"/></label>
              <label><span>Series mode</span><select value={workflow.metadata.seriesMode} onChange={(event) => patchMetadata("seriesMode", event.target.value as PublishingMetadata["seriesMode"])}><option value="standalone">Standalone</option><option value="series">Series</option><option value="trilogy">Trilogy</option></select></label>
              <label><span>Series title</span><input value={workflow.metadata.seriesTitle} onChange={(event) => patchMetadata("seriesTitle", event.target.value)} placeholder="The Lillith Cycle"/></label>
              <label><span>Book number</span><input type="number" min="1" value={workflow.metadata.seriesBookNumber ?? ""} onChange={(event) => patchMetadata("seriesBookNumber", event.target.value ? Number(event.target.value) : undefined)}/></label>
              <label><span>Keywords</span><input value={workflow.metadata.keywords} onChange={(event) => patchMetadata("keywords", toLineItems(event.target.value))} placeholder="Comma-separated store keywords"/></label>
              <label><span>BISAC</span><input value={workflow.metadata.bisac} onChange={(event) => patchMetadata("bisac", toLineItems(event.target.value))} placeholder="Comma-separated BISAC codes"/></label>
              <label><span>ISBN</span><input value={workflow.metadata.isbn} onChange={(event) => patchMetadata("isbn", event.target.value)} placeholder="Optional"/></label>
              <label><span>Territory</span><input value={workflow.metadata.territory} onChange={(event) => patchMetadata("territory", event.target.value)} placeholder="US, CA, UK, worldwide…"/></label>
              <label><span>Kindle price</span><input value={workflow.metadata.kindlePrice} onChange={(event) => patchMetadata("kindlePrice", event.target.value)} placeholder="$4.99"/></label>
              <label><span>Paperback price</span><input value={workflow.metadata.paperbackPrice} onChange={(event) => patchMetadata("paperbackPrice", event.target.value)} placeholder="$14.99"/></label>
              <label><span>Hardcover price</span><input value={workflow.metadata.hardcoverPrice} onChange={(event) => patchMetadata("hardcoverPrice", event.target.value)} placeholder="$24.99"/></label>
            </div>
            <label className="description-field"><span>Description</span><textarea rows={5} value={workflow.metadata.description} onChange={(event) => patchMetadata("description", event.target.value)} placeholder="Book description, back-cover copy, or launch description."/></label>
            <label className="description-field"><span>Publication notes</span><textarea rows={4} value={workflow.metadata.notes} onChange={(event) => patchMetadata("notes", event.target.value)} placeholder="Notes for launch, pricing, and future trilogy planning."/></label>
            <div className="metadata-footer">
              <div>
                <strong>{readiness.publishable ? "Publication gate ready" : "Publication gate incomplete"}</strong>
                <small>{readiness.blockers.length ? `${readiness.blockers.length} blocking checklist item(s)` : readiness.missingMetadata.length ? `Missing metadata: ${readiness.missingMetadata.join(", ")}` : `${readiness.blockedStages} blocked stage(s)`}</small>
              </div>
              <button className="publish-button" onClick={() => void publishNow()} disabled={!readiness.publishable || !!busy}>
                {busy === "publish" ? <LoaderCircle className="spin" size={14}/> : <Crown size={14}/>}
                Publish now
              </button>
            </div>
          </section>
        </>}
      </main>
    </div>

    <footer className="publishing-footer">
      <span>{workflow.guidanceMode === "soft" ? "Soft guidance: the workflow advises; it does not overwrite your decisions." : "Guidance mode active."}</span>
      <span>{workflow.scope === "universal" ? "Universal workflow template" : workflow.scope}</span>
      <span>{workflow.archiveLocked ? "Archive locked" : "Archive editable"}</span>
      <span>{readiness.formats.kindle.ready ? "Kindle ready" : "Kindle needs attention"}</span>
      <span>{readiness.formats.paperback.ready ? "Paperback ready" : "Paperback needs attention"}</span>
      <span>{readiness.formats.hardcover.ready ? "Hardcover ready" : "Hardcover needs attention"}</span>
    </footer>
    {confirmPublishOpen && <div className="publish-confirm-overlay" role="dialog" aria-modal="true" aria-label={published ? "Reopen publication" : "Confirm publication"}>
      <div className="publish-confirm-dialog">
        <span>{published ? "Reopen publication" : "Confirm publication"}</span>
        <strong>{published ? "Reopen this published version?" : "PUBLISH this manuscript?"}</strong>
        <p>{published ? "Reopening records an explicit revision step, clears the lock, and marks the published version as superseded in the dashboard history." : "This records the publication decision locally, locks the publishing dashboard, and preserves the current project state as published."}</p>
        {published ? <label className="reopen-note-field"><span>Revision note</span><textarea rows={4} value={reopenNote} onChange={(event) => setReopenNote(event.target.value)} placeholder="Why are you reopening the published version?"/></label> : null}
        <div className="publish-confirm-actions">
          <button onClick={() => { setConfirmPublishOpen(false); setReopenNote(""); }} disabled={!!busy}>Cancel</button>
          {published ? <button className="publish-confirm-button" onClick={() => void reopenForRevision()} disabled={!reopenNote.trim() || !!busy}>
            {busy === "publish" ? <LoaderCircle className="spin" size={12}/> : <Check size={12}/>}
            Reopen
          </button> : <button className="publish-confirm-button" onClick={() => void publishNow()} disabled={!readiness.publishable || !!busy}>
            {busy === "publish" ? <LoaderCircle className="spin" size={12}/> : <Crown size={12}/>}
            Publish
          </button>}
        </div>
      </div>
    </div>}
  </div>;
}
