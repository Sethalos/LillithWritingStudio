import type { Id } from "./models";
import type { Character, ManuscriptNode } from "./models";

export type PublishingGuidanceMode = "soft";
export type PublishingScope = "universal";
export type PublishingTarget = "kindle" | "paperback" | "hardcover";
export type PublishingStageStatus = "not-started" | "active" | "complete" | "blocked" | "deferred";
export type PublishingStageId =
  | "project-creation"
  | "discovery"
  | "outline"
  | "draft"
  | "development-pass"
  | "continuity-pass"
  | "character-voice-pass"
  | "narrative-weight-pass"
  | "trust-reader-pass"
  | "proof-integrity-pass"
  | "production-pass"
  | "cover-production"
  | "metadata"
  | "preview-qa"
  | "publication"
  | "marketing"
  | "archive";

export interface PublishingStage {
  id: PublishingStageId;
  title: string;
  purpose: string;
  deliverables: string[];
  qualityGate: string;
  status: PublishingStageStatus;
  notes: string;
}

export interface PublishingMetadata {
  title: string;
  subtitle: string;
  penName: string;
  genre: string;
  povStyle: string;
  tense: string;
  timeline: string;
  researchFolder: string;
  worldBible: string;
  characterBible: string;
  locationBible: string;
  glossary: string;
  seriesMode: "standalone" | "series" | "trilogy";
  seriesTitle: string;
  seriesBookNumber?: number;
  description: string;
  keywords: string;
  bisac: string;
  isbn: string;
  territory: string;
  kindlePrice: string;
  paperbackPrice: string;
  hardcoverPrice: string;
  notes: string;
}

export interface PublishingWorkflowState {
  projectId: Id;
  workflowName: string;
  guidanceMode: PublishingGuidanceMode;
  scope: PublishingScope;
  targets: PublishingTarget[];
  archiveLocked: boolean;
  publicationState: "draft" | "published" | "reopened";
  lastPublishedAt?: string;
  lastReopenedAt?: string;
  updatedAt: string;
  metadata: PublishingMetadata;
  stages: PublishingStage[];
  checklistItems: PublishingChecklistItem[];
  publicationHistory: PublishingPublicationEvent[];
}

export interface PublishingPublicationEvent {
  id: string;
  type: "published" | "reopened";
  at: string;
  note: string;
}

export interface PublishingReadiness {
  ready: boolean;
  publishable: boolean;
  workflowComplete: boolean;
  completedStages: number;
  totalStages: number;
  blockedStages: number;
  openStages: number;
  missingMetadata: string[];
  openStageTitles: string[];
  recommendation: string;
}

export interface PublishingTargetProfile {
  target: PublishingTarget;
  label: string;
  description: string;
  exportFormat: "epub" | "docx";
  exportProfile: "kindle" | "kdp-paperback" | "kdp-hardcover";
  defaultExtension: "epub" | "docx";
  defaultSuffix: string;
}

export type PublishingChecklistRequirementLevel = "required" | "recommended" | "optional";
export type PublishingChecklistStatus = "not_started" | "in_progress" | "complete" | "skipped" | "not_applicable";
export type PublishingChecklistCompletionSource = "manual" | "automatic" | "inferred";
export type PublishingChecklistEvidenceType =
  | "project-metadata"
  | "manuscript"
  | "outline"
  | "character"
  | "voice-lock"
  | "continuity-report"
  | "revision"
  | "export"
  | "cover"
  | "preview"
  | "publication"
  | "marketing"
  | "archive"
  | "note";
export type PublishingChecklistWorkspaceTarget = "character" | "bible" | "files" | "models" | "pipelines" | "settings" | "series" | "visuals" | "analysis" | "publishing";

export interface PublishingChecklistItem {
  id: string;
  phaseId: PublishingStageId;
  title: string;
  description: string;
  rationale: string;
  requirementLevel: PublishingChecklistRequirementLevel;
  status: PublishingChecklistStatus;
  completionSource: PublishingChecklistCompletionSource;
  evidenceType: PublishingChecklistEvidenceType;
  evidenceReference?: string;
  blockingForPublication: boolean;
  applicableFormats: Array<PublishingTarget | "all">;
  applicableProjectTypes: Array<"standalone" | "series" | "both">;
  notes: string;
  completedAt?: string;
  updatedAt: string;
  overrideNote?: string;
  workspaceTarget?: PublishingChecklistWorkspaceTarget;
}

export interface PublishingProjectSnapshot {
  projectTitle: string;
  projectAuthor?: string;
  nodes: ManuscriptNode[];
  characters: Character[];
}

export interface PublishingPhaseSummary {
  phaseId: PublishingStageId;
  title: string;
  completionPercent: number;
  requiredIncomplete: number;
  warnings: number;
  skipped: number;
  notApplicable: number;
  nextRecommendedAction: string;
}

export interface PublishingFormatReadiness {
  target: PublishingTarget;
  selected: boolean;
  ready: boolean;
  requiredIncomplete: number;
  warnings: number;
  blockers: PublishingChecklistItem[];
  recommended: PublishingChecklistItem[];
  percentComplete: number;
}

export interface PublishingChecklistState {
  items: PublishingChecklistItem[];
  phases: PublishingPhaseSummary[];
  formats: Record<PublishingTarget, PublishingFormatReadiness>;
  blockers: PublishingChecklistItem[];
  warnings: PublishingChecklistItem[];
}

const stageTemplates: Omit<PublishingStage, "status" | "notes">[] = [
  { id: "project-creation", title: "Phase 0 — Project Creation", purpose: "Create a stable project before writing.", deliverables: ["Project metadata", "Series information", "Genre", "POV style", "Narrative tense", "Timeline", "Research folder", "World Bible", "Character Bible", "Location Bible", "Glossary"], qualityGate: "Can someone unfamiliar with the project understand the world?" },
  { id: "discovery", title: "Phase 1 — Discovery", purpose: "Build the story.", deliverables: ["Brainstorming", "Theme", "Character arcs", "Story questions", "Ending", "Scene ideas"], qualityGate: "Story has a beginning, middle, and ending." },
  { id: "outline", title: "Phase 2 — Outline", purpose: "Shape the structure.", deliverables: ["Acts", "Chapters", "Interludes", "Character appearances", "Timeline validation"], qualityGate: "Missing setups, missing payoffs, timeline conflicts, and character disappearances are understood and assigned." },
  { id: "draft", title: "Phase 3 — Draft", purpose: "Write the book.", deliverables: ["First draft"], qualityGate: "The first draft is complete." },
  { id: "development-pass", title: "Phase 4 — Development Pass", purpose: "Fix the novel.", deliverables: ["Scene purpose checks", "Arc checks", "Stakes checks", "Ending checks"], qualityGate: "Architecture is locked." },
  { id: "continuity-pass", title: "Phase 5 — Continuity Pass", purpose: "Become the continuity department.", deliverables: ["Date checks", "Name checks", "Injury checks", "Weather checks", "Vehicle checks", "Technology checks", "Geography checks", "Rank checks", "Age checks", "Relationship checks"], qualityGate: "Continuity report is clean." },
  { id: "character-voice-pass", title: "Phase 6 — Character Voice Pass", purpose: "Strengthen point-of-view voice.", deliverables: ["Dialogue comparison", "Voice similarity", "Occupation vocabulary", "Emotional patterns", "Humour style", "Internal narration comparison"], qualityGate: "Characters are identifiable without names." },
  { id: "narrative-weight-pass", title: "Phase 7 — Narrative Weight Pass", purpose: "Turn information into experience.", deliverables: ["Sensory grounding", "Tactile detail", "Emotional specificity", "Physical reactions", "Environmental texture"], qualityGate: "The world feels lived in." },
  { id: "trust-reader-pass", title: "Phase 8 — Trust the Reader Pass", purpose: "Trim over-explanation and repetition.", deliverables: ["Repeated explanations removed", "Excess tags removed", "Exposition reduced"], qualityGate: "The reader gets to participate." },
  { id: "proof-integrity-pass", title: "Phase 9 — Proof & Integrity Pass", purpose: "Become QA.", deliverables: ["Duplicate paragraph check", "Missing paragraph check", "Scene order check", "Names", "Spelling", "Grammar", "Formatting", "Orphaned headings", "Hidden comments", "Manuscript corruption"], qualityGate: "Integrity report is clean." },
  { id: "production-pass", title: "Phase 10 — Production Pass", purpose: "Generate production-ready editions.", deliverables: ["Kindle edition", "Paperback edition", "Hardcover edition"], qualityGate: "All three production outputs exist and open cleanly." },
  { id: "cover-production", title: "Phase 11 — Cover Production", purpose: "Build the jacket and front cover package.", deliverables: ["Front cover", "Spine", "Back cover", "Series branding", "Typography QA", "Print bleed", "Thumbnail readability"], qualityGate: "Cover assets are validated for the intended format." },
  { id: "metadata", title: "Phase 12 — Metadata", purpose: "Prepare publication metadata.", deliverables: ["Title", "Subtitle", "Series", "Categories", "Keywords", "Description", "BISAC", "Pricing", "Territory", "ISBN", "Pen name"], qualityGate: "Metadata is complete enough to publish." },
  { id: "preview-qa", title: "Phase 13 — Preview QA", purpose: "Simulate the final reader experience.", deliverables: ["Kindle", "Paperback", "Hardcover", "Tablet", "Phone", "Thumbnail"], qualityGate: "Navigation, spacing, images, TOC, and cover alignment are checked." },
  { id: "publication", title: "Phase 14 — Publication", purpose: "Publish only when the gate is green.", deliverables: ["Publication readiness gate", "One-button release"], qualityGate: "Every previous phase is complete and the manuscript meets publication standards." },
  { id: "marketing", title: "Phase 15 — Marketing", purpose: "Prepare launch materials.", deliverables: ["Amazon description", "Press kit", "Website assets", "Social media", "Author page", "Newsletter"], qualityGate: "Marketing materials are ready to reuse." },
  { id: "archive", title: "Phase 16 — Archive", purpose: "Freeze the published version.", deliverables: ["Read-only archive", "Version history preserved"], qualityGate: "The book is frozen and stored as the published record." },
];

export const publishingTargetProfiles: PublishingTargetProfile[] = [
  { target: "kindle", label: "Kindle", description: "Reflowable EPUB for Kindle devices and apps.", exportFormat: "epub", exportProfile: "kindle", defaultExtension: "epub", defaultSuffix: " - Kindle" },
  { target: "paperback", label: "Paperback", description: "KDP-ready DOCX interior for print paperback.", exportFormat: "docx", exportProfile: "kdp-paperback", defaultExtension: "docx", defaultSuffix: " - Paperback" },
  { target: "hardcover", label: "Hardcover", description: "KDP-ready DOCX interior for print hardcover.", exportFormat: "docx", exportProfile: "kdp-hardcover", defaultExtension: "docx", defaultSuffix: " - Hardcover" },
];

export function defaultPublishingStages(): PublishingStage[] {
  return stageTemplates.map((stage, index) => ({ ...stage, status: index === 0 ? "active" : "not-started", notes: "" }));
}

export function defaultPublishingMetadata(projectTitle: string): PublishingMetadata {
  return {
    title: projectTitle,
    subtitle: "",
    penName: "",
    genre: "",
    povStyle: "",
    tense: "",
    timeline: "",
    researchFolder: "",
    worldBible: "",
    characterBible: "",
    locationBible: "",
    glossary: "",
    seriesMode: "standalone",
    seriesTitle: "",
    seriesBookNumber: undefined,
    description: "",
    keywords: "",
    bisac: "",
    isbn: "",
    territory: "",
    kindlePrice: "",
    paperbackPrice: "",
    hardcoverPrice: "",
    notes: "",
  };
}

export function blankPublishingWorkflow(projectId: Id, projectTitle: string): PublishingWorkflowState {
  const now = new Date().toISOString();
  return {
    projectId,
    workflowName: "Publishing pipeline",
    guidanceMode: "soft",
    scope: "universal",
    targets: ["kindle", "paperback", "hardcover"],
    archiveLocked: false,
    publicationState: "draft",
    updatedAt: now,
    metadata: defaultPublishingMetadata(projectTitle),
    stages: defaultPublishingStages(),
    checklistItems: [],
    publicationHistory: [],
  };
}

export function normalizePublishingWorkflow(state: PublishingWorkflowState, projectTitle: string): PublishingWorkflowState {
  const template = blankPublishingWorkflow(state.projectId, projectTitle);
  const stages = template.stages.map((stage) => {
    const existing = state.stages?.find((item) => item.id === stage.id);
    return existing ? { ...stage, ...existing } : stage;
  });
  return {
    ...template,
    ...state,
    targets: state.targets?.length ? state.targets : template.targets,
    metadata: { ...template.metadata, ...(state.metadata ?? {}) },
    stages,
    checklistItems: state.checklistItems?.length ? state.checklistItems : template.checklistItems,
    archiveLocked: Boolean(state.archiveLocked),
    publicationState: state.publicationState ?? (state.lastPublishedAt ? (state.lastReopenedAt ? "reopened" : "published") : "draft"),
    publicationHistory: state.publicationHistory ?? [],
    guidanceMode: "soft",
    scope: "universal",
  };
}

export function computePublishingReadiness(state: PublishingWorkflowState): PublishingReadiness {
  const completedStages = state.stages.filter((stage) => stage.status === "complete").length;
  const blockedStages = state.stages.filter((stage) => stage.status === "blocked").length;
  const openStages = state.stages.filter((stage) => stage.status !== "complete").length;
  const missingMetadata: string[] = [];
  const requiredMetadata: Array<[keyof Pick<PublishingMetadata, "title" | "penName" | "genre" | "povStyle" | "tense" | "description">, string]> = [
    ["title", "title"],
    ["penName", "pen name"],
    ["genre", "genre"],
    ["povStyle", "POV style"],
    ["tense", "tense"],
    ["description", "description"],
  ];
  for (const [key, label] of requiredMetadata) {
    if (!state.metadata[key].trim()) missingMetadata.push(label);
  }
  if (!state.targets.length) missingMetadata.push("at least one production target");
  const openStageTitles = state.stages.filter((stage) => stage.status !== "complete").map((stage) => `${stage.title}${stage.status === "blocked" ? " (blocked)" : ""}`);
  const publicationIndex = state.stages.findIndex((stage) => stage.id === "publication");
  const prePublicationStages = publicationIndex >= 0 ? state.stages.slice(0, publicationIndex) : state.stages;
  const publishable = !missingMetadata.length && blockedStages === 0 && prePublicationStages.every((stage) => stage.status === "complete");
  const workflowComplete = state.stages.every((stage) => stage.status === "complete");
  const ready = publishable;
  const recommendation = publishable
    ? workflowComplete
      ? "This manuscript meets publication standards and the workflow is fully complete."
      : "The publication gate is green. You can publish now and continue with marketing and archive afterward."
    : `Open phases remain: ${openStageTitles.slice(0, 4).join(", ")}${openStageTitles.length > 4 ? "…" : ""}${missingMetadata.length ? `. Missing metadata: ${missingMetadata.join(", ")}` : ""}.`;
  return { ready, publishable, workflowComplete, completedStages, totalStages: state.stages.length, blockedStages, openStages, missingMetadata, openStageTitles, recommendation };
}

export function stageTemplateById(id: PublishingStageId): Omit<PublishingStage, "status" | "notes"> {
  const stage = stageTemplates.find((item) => item.id === id);
  if (!stage) throw new Error(`Unknown publishing stage: ${id}`);
  return stage;
}

interface ChecklistTemplate {
  id: string;
  phaseId: PublishingStageId;
  title: string;
  description: string;
  rationale: string;
  requirementLevel: PublishingChecklistRequirementLevel;
  evidenceType: PublishingChecklistEvidenceType;
  blockingForPublication: boolean;
  applicableFormats: Array<PublishingTarget | "all">;
  applicableProjectTypes: Array<"standalone" | "series" | "both">;
  workspaceTarget?: PublishingChecklistWorkspaceTarget;
}

const checklistTemplates: ChecklistTemplate[] = [
  { id: "project-title", phaseId: "project-creation", title: "Project title and pen name are set", description: "The publishing metadata has a title and author identity.", rationale: "Publication assets and storefront listings depend on stable identity fields.", requirementLevel: "required", evidenceType: "project-metadata", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "project-series-mode", phaseId: "project-creation", title: "Series mode is declared", description: "Stand-alone, series, or trilogy intent is recorded.", rationale: "Series-aware planning keeps launch materials and future inheritance consistent.", requirementLevel: "recommended", evidenceType: "project-metadata", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "discovery-notes", phaseId: "discovery", title: "Discovery notes exist", description: "Theme, ending, or core story questions are written down.", rationale: "Early story decisions are easier to preserve once they are visible.", requirementLevel: "recommended", evidenceType: "note", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "outline-scene-plan", phaseId: "outline", title: "Outline or scene plan exists", description: "Chapters or scene goals are recorded in the binder.", rationale: "A publishable manuscript needs some structural intent before developmental editing is meaningful.", requirementLevel: "required", evidenceType: "outline", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "draft-text", phaseId: "draft", title: "Manuscript text exists", description: "At least one scene contains saved manuscript content.", rationale: "The draft phase cannot be complete without actual prose.", requirementLevel: "required", evidenceType: "manuscript", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "draft-complete", phaseId: "draft", title: "Draft is intentionally marked complete", description: "The draft completion state has been confirmed by the user.", rationale: "This distinguishes a written draft from a draft the author still considers in progress.", requirementLevel: "required", evidenceType: "note", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "development-review", phaseId: "development-pass", title: "Development pass reviewed", description: "Scene structure, stakes, and emotional movement have been reviewed.", rationale: "Development is where the novel stops being raw material and becomes an architecture.", requirementLevel: "recommended", evidenceType: "revision", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "pipelines" },
  { id: "continuity-cleared", phaseId: "continuity-pass", title: "Blocking continuity issues resolved or overridden", description: "No unresolved blocking continuity findings remain.", rationale: "Readers notice continuity failures immediately, especially in serial fiction.", requirementLevel: "required", evidenceType: "continuity-report", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "analysis" },
  { id: "voice-lock-reviewed", phaseId: "character-voice-pass", title: "Major character Voice Locks exist", description: "Major viewpoint characters have a saved Voice Lock profile.", rationale: "Voice consistency helps characters stay distinguishable and believable.", requirementLevel: "recommended", evidenceType: "voice-lock", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "character" },
  { id: "narrative-weight-reviewed", phaseId: "narrative-weight-pass", title: "Narrative weight pass reviewed", description: "Sensory grounding and emotional specificity have been checked.", rationale: "This keeps the prose from becoming functional but lifeless.", requirementLevel: "recommended", evidenceType: "revision", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "pipelines" },
  { id: "trust-reader-reviewed", phaseId: "trust-reader-pass", title: "Trust the reader pass reviewed", description: "Redundancy and over-explanation have been reduced.", rationale: "Readers need room to participate in meaning-making.", requirementLevel: "recommended", evidenceType: "revision", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "pipelines" },
  { id: "integrity-clean", phaseId: "proof-integrity-pass", title: "Proof and integrity review complete", description: "The manuscript has been checked for missing text, broken headings, and obvious corruption.", rationale: "This is the last line of defense before production files are generated.", requirementLevel: "required", evidenceType: "revision", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "kindle-export", phaseId: "production-pass", title: "Kindle EPUB generated", description: "A Kindle-ready EPUB has been exported for the project.", rationale: "Kindle publication requires a production file before QA can happen.", requirementLevel: "required", evidenceType: "export", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "paperback-export", phaseId: "production-pass", title: "Paperback DOCX generated", description: "A print-ready paperback DOCX has been exported.", rationale: "Print publication needs a dedicated production file.", requirementLevel: "required", evidenceType: "export", blockingForPublication: true, applicableFormats: ["paperback"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "hardcover-export", phaseId: "production-pass", title: "Hardcover DOCX generated", description: "A print-ready hardcover DOCX has been exported.", rationale: "Hardcover production has its own layout and cover assumptions.", requirementLevel: "required", evidenceType: "export", blockingForPublication: true, applicableFormats: ["hardcover"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "cover-approved", phaseId: "cover-production", title: "Cover is approved or intentionally deferred", description: "A cover file or approved cover record exists for the planned format.", rationale: "The interior can be ready while cover work is still pending, but the app should not hide the gap.", requirementLevel: "recommended", evidenceType: "cover", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "metadata-complete", phaseId: "metadata", title: "Core publication metadata is present", description: "Title, pen name, genre, description, keywords, territory, and pricing are filled in.", rationale: "Storefront setup and print files depend on accurate metadata.", requirementLevel: "required", evidenceType: "project-metadata", blockingForPublication: true, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "series-metadata", phaseId: "metadata", title: "Series or trilogy metadata is ready", description: "Series title, book number, and inheritance notes exist when relevant.", rationale: "Series workflows need consistent launch and catalog metadata.", requirementLevel: "recommended", evidenceType: "project-metadata", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["series", "both"], workspaceTarget: "publishing" },
  { id: "kindle-qa", phaseId: "preview-qa", title: "Kindle preview QA recorded", description: "Kindle preview was checked for navigation, spacing, and readability.", rationale: "Reflowable EPUBs should be verified on a Kindle-style reading surface.", requirementLevel: "required", evidenceType: "preview", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "paperback-qa", phaseId: "preview-qa", title: "Paperback preview QA recorded", description: "Paperback proofing was checked for trim, margins, and front matter.", rationale: "Print layouts need a dedicated proof pass before publication.", requirementLevel: "required", evidenceType: "preview", blockingForPublication: true, applicableFormats: ["paperback"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "hardcover-qa", phaseId: "preview-qa", title: "Hardcover preview QA recorded", description: "Hardcover proofing was checked for trim, margins, and cover assumptions.", rationale: "Hardcover layouts deserve their own review because they are not identical to paperback.", requirementLevel: "required", evidenceType: "preview", blockingForPublication: true, applicableFormats: ["hardcover"], applicableProjectTypes: ["both"], workspaceTarget: "files" },
  { id: "publication-status", phaseId: "publication", title: "Publication status is recorded", description: "Release date, platform status, and edition choices are noted.", rationale: "The gate should know whether publication is still pending, live, or archived.", requirementLevel: "required", evidenceType: "publication", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "marketing-copy", phaseId: "marketing", title: "Marketing copy exists", description: "Description, author bio, or launch notes are prepared.", rationale: "Launch materials should not be recreated from scratch at the last minute.", requirementLevel: "recommended", evidenceType: "marketing", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "publishing" },
  { id: "archive-snapshot", phaseId: "archive", title: "Published snapshot is archived", description: "The published version is frozen as a local archive or backup.", rationale: "Published books should retain an immutable local record.", requirementLevel: "recommended", evidenceType: "archive", blockingForPublication: false, applicableFormats: ["all"], applicableProjectTypes: ["both"], workspaceTarget: "settings" },
];

const projectTypeFor = (state: PublishingWorkflowState): "standalone" | "series" => state.metadata.seriesMode === "standalone" ? "standalone" : "series";
const appliesToTargets = (template: ChecklistTemplate, targets: PublishingTarget[]) => template.applicableFormats.includes("all") || template.applicableFormats.some((format) => format !== "all" && targets.includes(format));

const createChecklistItem = (template: ChecklistTemplate, now: string, overrides: Partial<PublishingChecklistItem> = {}): PublishingChecklistItem => ({
  id: template.id,
  phaseId: template.phaseId,
  title: template.title,
  description: template.description,
  rationale: template.rationale,
  requirementLevel: template.requirementLevel,
  status: "not_started",
  completionSource: "inferred",
  evidenceType: template.evidenceType,
  evidenceReference: "",
  blockingForPublication: template.blockingForPublication,
  applicableFormats: template.applicableFormats,
  applicableProjectTypes: template.applicableProjectTypes,
  notes: "",
  completedAt: undefined,
  updatedAt: now,
  workspaceTarget: template.workspaceTarget,
  ...overrides,
});

const countScenesWithContent = (nodes: ManuscriptNode[]) => nodes.filter((node) => node.kind === "scene" && (node.content ?? "").trim()).length;
const countMajorCharacters = (characters: Character[]) => characters.filter((character) => character.role === "major").length;

function evaluateChecklistItem(template: ChecklistTemplate, workflow: PublishingWorkflowState, snapshot: PublishingProjectSnapshot): Partial<PublishingChecklistItem> {
  const now = new Date().toISOString();
  const projectType = projectTypeFor(workflow);
  const sceneCount = snapshot.nodes.filter((node) => node.kind === "scene").length;
  const chapterCount = snapshot.nodes.filter((node) => node.kind === "chapter").length;
  const contentScenes = countScenesWithContent(snapshot.nodes);
  const majorCharacters = snapshot.characters.filter((character) => character.role === "major");
  const savedVoiceLocks = majorCharacters.filter((character) => character.voiceLock.version > 0);
  const title = workflow.metadata.title.trim();
  const penName = workflow.metadata.penName.trim();
  const hasDescription = workflow.metadata.description.trim().length > 20;
  const hasKeywords = workflow.metadata.keywords.trim().length > 0;
  const hasBisac = workflow.metadata.bisac.trim().length > 0;
  const hasPricing = Boolean(workflow.metadata.kindlePrice.trim() || workflow.metadata.paperbackPrice.trim() || workflow.metadata.hardcoverPrice.trim());
  const hasSeriesMetadata = workflow.metadata.seriesMode !== "standalone" ? Boolean(workflow.metadata.seriesTitle.trim()) : true;
  const stageNotes = workflow.stages.find((stage) => stage.id === template.phaseId)?.notes.trim() ?? "";
  const metadataFilled = Boolean(title && penName && workflow.metadata.genre.trim() && workflow.metadata.povStyle.trim() && workflow.metadata.tense.trim() && hasDescription);

  switch (template.id) {
    case "project-title":
      return { status: title && penName ? "complete" : "in_progress", completionSource: title && penName ? "automatic" : "inferred", evidenceReference: title && penName ? "publishing:metadata" : "", completedAt: title && penName ? now : undefined };
    case "project-series-mode":
      return { status: workflow.metadata.seriesMode ? "complete" : "in_progress", completionSource: workflow.metadata.seriesMode ? "automatic" : "inferred", evidenceReference: workflow.metadata.seriesMode ? "publishing:metadata" : "" };
    case "discovery-notes":
      return { status: stageNotes || workflow.stages.some((stage) => stage.id === "discovery" && stage.status !== "not-started") ? "complete" : "not_started", completionSource: stageNotes ? "manual" : "inferred", evidenceReference: stageNotes ? `stage:${template.phaseId}` : "" };
    case "outline-scene-plan":
      return { status: chapterCount > 0 && sceneCount > 0 ? "complete" : sceneCount > 0 ? "in_progress" : "not_started", completionSource: chapterCount > 0 && sceneCount > 0 ? "automatic" : "inferred", evidenceReference: chapterCount > 0 && sceneCount > 0 ? `chapters:${chapterCount};scenes:${sceneCount}` : "" };
    case "draft-text":
      return { status: contentScenes > 0 ? "complete" : "not_started", completionSource: contentScenes > 0 ? "automatic" : "inferred", evidenceReference: contentScenes > 0 ? `scenes-with-content:${contentScenes}` : "", completedAt: contentScenes > 0 ? now : undefined };
    case "draft-complete":
      return { status: contentScenes > 0 && workflow.stages.find((stage) => stage.id === "draft")?.status === "complete" ? "complete" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "draft")?.status === "complete" ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "draft")?.notes.trim() ? "stage:draft" : "" };
    case "development-review":
      return { status: workflow.stages.find((stage) => stage.id === "development-pass")?.notes.trim() ? "complete" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "development-pass")?.notes.trim() ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "development-pass")?.notes.trim() ? "stage:development-pass" : "" };
    case "continuity-cleared":
      return { status: workflow.stages.find((stage) => stage.id === "continuity-pass")?.status === "complete" ? "complete" : workflow.stages.find((stage) => stage.id === "continuity-pass")?.status === "blocked" ? "in_progress" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "continuity-pass")?.status === "complete" ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "continuity-pass")?.notes.trim() ? "stage:continuity-pass" : "analysis:continuity" };
    case "voice-lock-reviewed":
      return { status: majorCharacters.length && savedVoiceLocks.length === majorCharacters.length ? "complete" : majorCharacters.length ? "in_progress" : "not_applicable", completionSource: savedVoiceLocks.length === majorCharacters.length && majorCharacters.length > 0 ? "automatic" : "inferred", evidenceReference: savedVoiceLocks.length ? `major-characters:${savedVoiceLocks.length}` : "" };
    case "narrative-weight-reviewed":
      return { status: workflow.stages.find((stage) => stage.id === "narrative-weight-pass")?.notes.trim() ? "complete" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "narrative-weight-pass")?.notes.trim() ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "narrative-weight-pass")?.notes.trim() ? "stage:narrative-weight-pass" : "" };
    case "trust-reader-reviewed":
      return { status: workflow.stages.find((stage) => stage.id === "trust-reader-pass")?.notes.trim() ? "complete" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "trust-reader-pass")?.notes.trim() ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "trust-reader-pass")?.notes.trim() ? "stage:trust-reader-pass" : "" };
    case "integrity-clean":
      return { status: workflow.stages.find((stage) => stage.id === "proof-integrity-pass")?.status === "complete" ? "complete" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "proof-integrity-pass")?.status === "complete" ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "proof-integrity-pass")?.notes.trim() ? "stage:proof-integrity-pass" : "" };
    case "kindle-export":
    case "paperback-export":
    case "hardcover-export":
      return { status: "not_started", completionSource: "inferred", evidenceReference: "", completedAt: undefined };
    case "cover-approved":
      return { status: workflow.stages.find((stage) => stage.id === "cover-production")?.notes.trim() ? "complete" : "not_started", completionSource: workflow.stages.find((stage) => stage.id === "cover-production")?.notes.trim() ? "manual" : "inferred", evidenceReference: workflow.stages.find((stage) => stage.id === "cover-production")?.notes.trim() ? "stage:cover-production" : "" };
    case "metadata-complete":
      return { status: metadataFilled && hasKeywords && hasBisac && hasPricing ? "complete" : metadataFilled ? "in_progress" : "not_started", completionSource: metadataFilled && hasKeywords && hasBisac && hasPricing ? "automatic" : "inferred", evidenceReference: metadataFilled ? "publishing:metadata" : "" };
    case "series-metadata":
      return { status: hasSeriesMetadata ? "complete" : workflow.metadata.seriesMode === "standalone" ? "not_applicable" : "in_progress", completionSource: hasSeriesMetadata ? "automatic" : "inferred", evidenceReference: workflow.metadata.seriesMode === "standalone" ? "publishing:metadata" : "" };
    case "kindle-qa":
    case "paperback-qa":
    case "hardcover-qa":
      return { status: "not_started", completionSource: "inferred", evidenceReference: "" };
    case "publication-status":
      return { status: workflow.lastPublishedAt ? "complete" : "not_started", completionSource: workflow.lastPublishedAt ? "automatic" : "inferred", evidenceReference: workflow.lastPublishedAt ? workflow.lastPublishedAt : "" };
    case "marketing-copy":
      return { status: workflow.metadata.description.trim() ? "complete" : "not_started", completionSource: workflow.metadata.description.trim() ? "automatic" : "inferred", evidenceReference: workflow.metadata.description.trim() ? "publishing:metadata" : "" };
    case "archive-snapshot":
      return { status: workflow.archiveLocked ? "complete" : "not_started", completionSource: workflow.archiveLocked ? "manual" : "inferred", evidenceReference: workflow.archiveLocked ? "publishing:archive" : "" };
    default:
      return {};
  }
}

function allowedForProject(template: ChecklistTemplate, workflow: PublishingWorkflowState): boolean {
  const projectType = projectTypeFor(workflow);
  return template.applicableProjectTypes.includes("both") || template.applicableProjectTypes.includes(projectType);
}

export function buildPublishingChecklistState(workflow: PublishingWorkflowState, snapshot: PublishingProjectSnapshot, persisted: PublishingChecklistItem[] = []): PublishingChecklistState {
  const now = new Date().toISOString();
  const persistedMap = new Map(persisted.map((item) => [item.id, item]));
  const items = checklistTemplates
    .filter((template) => allowedForProject(template, workflow))
    .map((template) => {
      const stored = persistedMap.get(template.id);
      const auto = evaluateChecklistItem(template, workflow, snapshot);
      const base = createChecklistItem(template, now, stored ? {
        ...stored,
        updatedAt: stored.updatedAt || now,
      } : {});
      const manual = stored && stored.completionSource === "manual" ? stored : undefined;
      const targetApplicable = appliesToTargets(template, workflow.targets);
      const status = !targetApplicable ? "not_applicable" : manual ? manual.status : (auto.status as PublishingChecklistStatus | undefined) ?? base.status;
      const completionSource = manual ? "manual" : (auto.completionSource as PublishingChecklistCompletionSource | undefined) ?? base.completionSource;
      const evidenceReference = manual?.evidenceReference ?? auto.evidenceReference ?? stored?.evidenceReference ?? base.evidenceReference;
      const completedAt = status === "complete" ? manual?.completedAt ?? stored?.completedAt ?? auto.completedAt ?? now : undefined;
      const overrideNote = manual?.overrideNote ?? stored?.overrideNote;
      return {
        ...base,
        ...auto,
        ...stored,
        status,
        completionSource,
        evidenceReference,
        completedAt,
        overrideNote,
        updatedAt: now,
      } as PublishingChecklistItem;
    });
  const phases = stageTemplates.map((stage) => {
    const phaseItems = items.filter((item) => item.phaseId === stage.id);
    const requiredIncomplete = phaseItems.filter((item) => item.requirementLevel === "required" && !["complete", "skipped", "not_applicable"].includes(item.status)).length;
    const warnings = phaseItems.filter((item) => item.requirementLevel !== "required" && item.status !== "complete" && item.status !== "not_applicable").length;
    const skipped = phaseItems.filter((item) => item.status === "skipped").length;
    const notApplicable = phaseItems.filter((item) => item.status === "not_applicable").length;
    const completed = phaseItems.filter((item) => item.status === "complete").length;
    const completionPercent = phaseItems.length ? Math.round((completed / phaseItems.length) * 100) : 100;
    const nextRecommendedAction = requiredIncomplete ? phaseItems.find((item) => item.requirementLevel === "required" && !["complete", "skipped", "not_applicable"].includes(item.status))?.title ?? "Review the phase checklist" : warnings ? phaseItems.find((item) => item.requirementLevel !== "required" && item.status !== "complete" && item.status !== "not_applicable")?.title ?? "Review recommendations" : "No immediate action needed";
    return { phaseId: stage.id, title: stage.title, completionPercent, requiredIncomplete, warnings, skipped, notApplicable, nextRecommendedAction };
  });
  const blockers = items.filter((item) => item.blockingForPublication && item.status !== "complete" && item.status !== "skipped" && item.status !== "not_applicable");
  const warnings = items.filter((item) => item.requirementLevel !== "required" && item.status !== "complete" && item.status !== "not_applicable");
  const targetState = (target: PublishingTarget): PublishingFormatReadiness => {
    const relevant = items.filter((item) => item.applicableFormats.includes("all") || item.applicableFormats.includes(target));
    const blockersForTarget = relevant.filter((item) => item.blockingForPublication && item.status !== "complete" && item.status !== "skipped" && item.status !== "not_applicable");
    const warningsForTarget = relevant.filter((item) => item.requirementLevel !== "required" && item.status !== "complete" && item.status !== "not_applicable");
    const completed = relevant.filter((item) => item.status === "complete").length;
    const percentComplete = relevant.length ? Math.round((completed / relevant.length) * 100) : 100;
    const selected = workflow.targets.includes(target);
    const ready = selected && blockersForTarget.length === 0;
    return { target, selected, ready, requiredIncomplete: selected ? blockersForTarget.length : 0, warnings: selected ? warningsForTarget.length : 0, blockers: selected ? blockersForTarget : [], recommended: selected ? warningsForTarget : [], percentComplete };
  };
  return {
    items,
    phases,
    formats: {
      kindle: targetState("kindle"),
      paperback: targetState("paperback"),
      hardcover: targetState("hardcover"),
    },
    blockers,
    warnings,
  };
}

export function publicationGateSummary(workflow: PublishingWorkflowState, checklist: PublishingChecklistState): PublishingReadiness & { blockers: PublishingChecklistItem[]; warnings: PublishingChecklistItem[]; formats: Record<PublishingTarget, PublishingFormatReadiness> } {
  const completedStages = workflow.stages.filter((stage) => stage.status === "complete").length;
  const blockedStages = workflow.stages.filter((stage) => stage.status === "blocked").length;
  const openStages = workflow.stages.filter((stage) => stage.status !== "complete").length;
  const missingMetadata: string[] = [];
  if (!workflow.metadata.title.trim()) missingMetadata.push("title");
  if (!workflow.metadata.penName.trim()) missingMetadata.push("pen name");
  if (!workflow.metadata.genre.trim()) missingMetadata.push("genre");
  if (!workflow.metadata.povStyle.trim()) missingMetadata.push("POV style");
  if (!workflow.metadata.tense.trim()) missingMetadata.push("tense");
  if (!workflow.metadata.description.trim()) missingMetadata.push("description");
  const publicationIndex = workflow.stages.findIndex((stage) => stage.id === "publication");
  const prePublicationStages = publicationIndex >= 0 ? workflow.stages.slice(0, publicationIndex) : workflow.stages;
  const selectedFormats = workflow.targets;
  const selectedFormatBlockers = checklist.blockers.filter((item) => item.applicableFormats.includes("all") || item.applicableFormats.some((format) => format !== "all" && selectedFormats.includes(format)));
  const selectedFormatWarnings = checklist.warnings.filter((item) => item.applicableFormats.includes("all") || item.applicableFormats.some((format) => format !== "all" && selectedFormats.includes(format)));
  const publishable = selectedFormatBlockers.length === 0 && missingMetadata.length === 0 && blockedStages === 0 && prePublicationStages.every((stage) => stage.status === "complete");
  const workflowComplete = workflow.stages.every((stage) => stage.status === "complete");
  const openStageTitles = workflow.stages.filter((stage) => stage.status !== "complete").map((stage) => `${stage.title}${stage.status === "blocked" ? " (blocked)" : ""}`);
  const recommendation = publishable
    ? workflowComplete
      ? "This manuscript meets publication standards and the workflow is fully complete."
      : "The publication gate is green. You can publish now and continue with marketing and archive afterward."
    : `Needs attention: ${selectedFormatBlockers.slice(0, 3).map((item) => item.title).join(", ") || openStageTitles.slice(0, 3).join(", ")}${selectedFormatBlockers.length > 3 ? "…" : ""}${missingMetadata.length ? `. Missing metadata: ${missingMetadata.join(", ")}` : ""}.`;
  return { ready: publishable, publishable, workflowComplete, completedStages, totalStages: workflow.stages.length, blockedStages, openStages, missingMetadata, openStageTitles, recommendation, blockers: selectedFormatBlockers, warnings: selectedFormatWarnings, formats: checklist.formats };
}
