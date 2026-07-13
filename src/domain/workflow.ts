import type { Character, ManuscriptNode, Project } from "./models";

export type WorkflowPhaseId =
  | "project_creation"
  | "idea_capture"
  | "creative_north_star"
  | "discovery"
  | "character_foundations"
  | "story_architecture"
  | "drafting_readiness"
  | "drafting"
  | "revision"
  | "special_passes"
  | "production"
  | "publication"
  | "marketing"
  | "archive_series";

export type WorkflowPhaseCompletionMode = "automatic" | "inferred" | "manual";
export type WorkflowStateSource = "inferred" | "manual";
export type WorkflowProjectStatus = "idea" | "planning" | "drafting" | "revision" | "production" | "published";
export type WorkflowDecisionStatus = "open" | "resolved" | "deferred" | "intentionally_skipped";
export type WorkflowArtifactStatus = "open" | "tentative" | "accepted" | "rejected" | "deferred";
export type WorkflowWorkspaceTarget = "workflow" | "manuscript" | "character" | "ai" | "research" | "files" | "analysis" | "bible" | "series" | "models" | "pipelines" | "publishing" | "settings" | "comments" | "history" | "visuals";

export interface WorkflowPhaseDefinition {
  id: WorkflowPhaseId;
  displayName: string;
  purpose: string;
  shortExplanation: string;
  relevantWorkspaces: WorkflowWorkspaceTarget[];
  expectedArtifacts: string[];
  suggestedActions: string[];
  completionSignals: string[];
  completionMode: WorkflowPhaseCompletionMode;
  reopenable: boolean;
}

export const workflowPhases: WorkflowPhaseDefinition[] = [
  {
    id: "project_creation",
    displayName: "Project Creation",
    purpose: "Create the project container and initial story frame.",
    shortExplanation: "Set up a stable book or series container before deeper planning begins.",
    relevantWorkspaces: ["workflow", "settings", "series"],
    expectedArtifacts: ["Project Brief", "Series details"],
    suggestedActions: ["Capture the premise", "Choose standalone or series book", "Set genre and audience"],
    completionSignals: ["The project has a working title", "Project type is known", "The idea has a place to live"],
    completionMode: "manual",
    reopenable: true,
  },
  {
    id: "idea_capture",
    displayName: "Idea Capture",
    purpose: "Collect the raw premise and first creative sparks.",
    shortExplanation: "Capture the idea before forcing it into structure.",
    relevantWorkspaces: ["workflow", "ai", "research"],
    expectedArtifacts: ["Project Brief", "Discovery notes"],
    suggestedActions: ["Capture the original premise", "Record images or scenes already imagined", "Note things to avoid"],
    completionSignals: ["A premise exists", "The story promise is visible", "Initial ideas are stored locally"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "creative_north_star",
    displayName: "Creative North Star",
    purpose: "Define the story promise and creative guardrails.",
    shortExplanation: "Make the intended reader experience explicit so later choices stay aligned.",
    relevantWorkspaces: ["workflow", "ai", "character"],
    expectedArtifacts: ["Creative North Star"],
    suggestedActions: ["Define the emotional promise", "State what the reader should remember", "List guardrails"],
    completionSignals: ["Reader experience is clear", "Tone is named", "Guardrails exist"],
    completionMode: "manual",
    reopenable: true,
  },
  {
    id: "discovery",
    displayName: "Discovery",
    purpose: "Explore alternative story directions and settle on a direction where useful.",
    shortExplanation: "Investigate premise, clichés, research needs, and open questions without locking the story too early.",
    relevantWorkspaces: ["workflow", "ai", "research", "bible"],
    expectedArtifacts: ["Discovery entries", "Unresolved decisions"],
    suggestedActions: ["Brainstorm alternatives", "Challenge clichés", "Capture research needs"],
    completionSignals: ["Major possibilities are visible", "Rejected ideas are recorded", "Open questions are named"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "character_foundations",
    displayName: "Character Foundations",
    purpose: "Build the protagonist and the supporting cast foundation.",
    shortExplanation: "Use the existing character system to expose what is known and what is still missing.",
    relevantWorkspaces: ["character", "ai", "workflow"],
    expectedArtifacts: ["Character profiles", "Voice Lock", "Relationship map"],
    suggestedActions: ["Define the protagonist wound and desire", "Confirm companion roles", "Fill voice profiles where needed"],
    completionSignals: ["Protagonist exists", "Major supporting characters exist", "Voice readiness is visible"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "story_architecture",
    displayName: "Story Architecture",
    purpose: "Shape the book into a working narrative engine.",
    shortExplanation: "Align conflict, transformation, turning points, and act structure without forcing a full outline.",
    relevantWorkspaces: ["analysis", "files", "pipelines", "workflow"],
    expectedArtifacts: ["Story architecture", "Chapter map", "Act structure"],
    suggestedActions: ["Define the central conflict", "Map the beginning and ending state", "Sketch major turning points"],
    completionSignals: ["A story engine exists", "A chapter or act map exists", "The book arc is visible"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "drafting_readiness",
    displayName: "Drafting Readiness",
    purpose: "Confirm that the project can begin or continue drafting.",
    shortExplanation: "Drafting stays flexible, but the app should explain whether the foundations are sufficient to start.",
    relevantWorkspaces: ["manuscript", "ai", "workflow"],
    expectedArtifacts: ["Active manuscript", "Scene direction", "Opening situation"],
    suggestedActions: ["Resume drafting", "Create the next scene", "Refine the opening situation"],
    completionSignals: ["An active manuscript exists", "At least one next scene is known", "The project can continue cleanly"],
    completionMode: "automatic",
    reopenable: true,
  },
  {
    id: "drafting",
    displayName: "Drafting",
    purpose: "Write the manuscript without over-editing.",
    shortExplanation: "Focus on finishing the first draft and keeping momentum steady.",
    relevantWorkspaces: ["manuscript", "ai", "workflow"],
    expectedArtifacts: ["Manuscript text", "Draft milestones"],
    suggestedActions: ["Write the next scene", "Continue the current chapter", "Use AI only when stuck"],
    completionSignals: ["A draft exists", "The current chapter is moving forward", "Work is being recorded locally"],
    completionMode: "automatic",
    reopenable: true,
  },
  {
    id: "revision",
    displayName: "Revision",
    purpose: "Develop the draft into a stronger book.",
    shortExplanation: "Work on structural and prose improvements after the draft is complete.",
    relevantWorkspaces: ["pipelines", "ai", "analysis", "workflow"],
    expectedArtifacts: ["Revision notes", "Tracked proposals", "Change log"],
    suggestedActions: ["Review major issues", "Run a revision pass", "Accept or reject proposals"],
    completionSignals: ["Major draft issues have been addressed", "Revision notes exist", "The book is improving intentionally"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "special_passes",
    displayName: "Special Passes",
    purpose: "Run focused passes such as continuity, voice, pacing, and description.",
    shortExplanation: "Use targeted checks after developmental revision to refine the manuscript.",
    relevantWorkspaces: ["pipelines", "analysis", "ai", "workflow"],
    expectedArtifacts: ["Revision pipelines", "Pass reports"],
    suggestedActions: ["Run a voice pass", "Run a continuity pass", "Run a pacing pass"],
    completionSignals: ["Targeted passes have been completed", "Pass results are reviewable"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "production",
    displayName: "Production",
    purpose: "Prepare the finalized manuscript for export and formatting.",
    shortExplanation: "Turn the approved manuscript into print and ebook production files.",
    relevantWorkspaces: ["publishing", "files", "workflow"],
    expectedArtifacts: ["EPUB", "DOCX", "production exports"],
    suggestedActions: ["Generate production files", "Check layout formats", "Verify export integrity"],
    completionSignals: ["Production files exist", "Format exports are ready"],
    completionMode: "automatic",
    reopenable: true,
  },
  {
    id: "publication",
    displayName: "Publication",
    purpose: "Confirm the book is ready to release.",
    shortExplanation: "Check readiness for Kindle, paperback, and hardcover before publishing.",
    relevantWorkspaces: ["publishing", "workflow", "files"],
    expectedArtifacts: ["Publication readiness", "Metadata", "Preview QA"],
    suggestedActions: ["Review blockers", "Validate format readiness", "Confirm publication intent"],
    completionSignals: ["Publication gate is green", "Formats are ready", "Metadata is complete"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "marketing",
    displayName: "Marketing",
    purpose: "Prepare release materials and promotion assets.",
    shortExplanation: "Draft the public-facing book description, launch assets, and outreach materials.",
    relevantWorkspaces: ["publishing", "workflow"],
    expectedArtifacts: ["Marketing copy", "Launch plan", "Author assets"],
    suggestedActions: ["Draft the description", "Prepare launch notes", "Capture promo ideas"],
    completionSignals: ["Marketing assets exist", "The launch plan is documented"],
    completionMode: "inferred",
    reopenable: true,
  },
  {
    id: "archive_series",
    displayName: "Archive & Series",
    purpose: "Freeze the published book and carry forward canon for the next book.",
    shortExplanation: "Preserve the finished project and prepare handoff material for later books.",
    relevantWorkspaces: ["series", "workflow", "bible"],
    expectedArtifacts: ["Archive package", "Series continuity record", "Next-book handoff"],
    suggestedActions: ["Lock the project record", "Carry forward canon", "Prepare the next book summary"],
    completionSignals: ["The book is archived", "Series continuity is preserved"],
    completionMode: "manual",
    reopenable: true,
  },
];

export interface WorkflowProjectBrief {
  workingTitle: string;
  projectType: "standalone" | "series_book";
  seriesTitle: string;
  bookNumber?: number;
  genre: string;
  subgenre: string;
  intendedAudience: string;
  approximateTargetLength: string;
  pov: string;
  tense: string;
  originalPremise: string;
  scenesOrImagesAlreadyImagined: string[];
  themes: string[];
  inspirations: string[];
  thingsToAvoid: string[];
  openNotes: string;
  fieldStatus: Record<string, "confirmed" | "tentative" | "unresolved">;
}

export interface CreativeNorthStar {
  readerExperience: string;
  emotionalPromise: string;
  distinguishingQualities: string[];
  centralThematicConcern: string;
  genrePromises: string[];
  conventionsToChallenge: string[];
  toneAndAtmosphere: string;
  whatTheReaderShouldRemember: string;
  explicitCreativeGuardrails: string[];
}

export interface StoryArchitecture {
  storyEngine: string;
  centralConflict: string;
  thematicConflict: string;
  protagonistTransformation: string;
  seriesArc: string;
  beginningState: string;
  endingState: string;
  majorTurningPoints: string[];
  actStructure: string;
  chapterMapStatus: string;
}

export interface WorkflowDiscoveryEntry {
  id: string;
  title: string;
  notes: string;
  status: WorkflowArtifactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDecision {
  id: string;
  title: string;
  description: string;
  phaseId: WorkflowPhaseId;
  relatedArtifactId?: string;
  relatedCharacterId?: string;
  relatedManuscriptNodeId?: string;
  relatedSeriesItemId?: string;
  status: WorkflowDecisionStatus;
  optionsConsidered: string[];
  selectedDecision?: string;
  rationale?: string;
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

export interface WorkflowArtifact {
  id: string;
  type: "project_brief" | "creative_north_star" | "discovery_entry" | "character_foundation" | "story_architecture" | "manuscript" | "milestone";
  title: string;
  description: string;
  phaseId: WorkflowPhaseId;
  status: WorkflowArtifactStatus;
  workspaceTarget: WorkflowWorkspaceTarget;
  relatedIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMilestone {
  id: string;
  title: string;
  description: string;
  phaseId: WorkflowPhaseId;
  achievedAt: string;
  artifactIds: string[];
}

export interface WorkflowRecommendationAction {
  label: string;
  reason: string;
  workspaceTarget: WorkflowWorkspaceTarget;
}

export interface WorkflowRecommendation {
  title: string;
  reason: string;
  phaseId: WorkflowPhaseId;
  workspaceTarget: WorkflowWorkspaceTarget;
  relatedArtifactIds: string[];
  relatedDecisionIds: string[];
  secondaryActions: WorkflowRecommendationAction[];
}

export interface DraftingReadiness {
  status: "already_drafting" | "ready_to_begin" | "ready_with_questions" | "more_discovery_recommended";
  summary: string;
  signals: string[];
  missing: string[];
  canDraft: boolean;
}

export interface WorkflowState {
  projectId: string;
  currentPhaseId: WorkflowPhaseId;
  currentBookId?: string;
  activeManuscriptId?: string;
  latestMilestoneId?: string;
  projectStatus: WorkflowProjectStatus;
  unresolvedDecisionIds: string[];
  artifactIds: string[];
  recommendation: WorkflowRecommendation;
  createdAt: string;
  updatedAt: string;
  source: WorkflowStateSource;
  projectBrief: WorkflowProjectBrief;
  creativeNorthStar: CreativeNorthStar;
  storyArchitecture: StoryArchitecture;
  discoveryEntries: WorkflowDiscoveryEntry[];
  decisions: WorkflowDecision[];
  artifacts: WorkflowArtifact[];
  milestones: WorkflowMilestone[];
  draftingReadiness: DraftingReadiness;
}

export const workflowPhaseOrder = workflowPhases.map((phase) => phase.id);

export function createBlankWorkflowState(project: Project): WorkflowState {
  const now = new Date().toISOString();
  return {
    projectId: project.id,
    currentPhaseId: "project_creation",
    projectStatus: "idea",
    unresolvedDecisionIds: [],
    artifactIds: [],
    recommendation: {
      title: "Capture the project idea",
      reason: "The project has just been created and needs a premise to orient the rest of the workflow.",
      phaseId: "idea_capture",
      workspaceTarget: "workflow",
      relatedArtifactIds: [],
      relatedDecisionIds: [],
      secondaryActions: [],
    },
    createdAt: now,
    updatedAt: now,
    source: "inferred",
    projectBrief: createBlankProjectBrief(project.title),
    creativeNorthStar: createBlankNorthStar(),
    storyArchitecture: createBlankStoryArchitecture(),
    discoveryEntries: [],
    decisions: [],
    artifacts: [],
    milestones: [],
    draftingReadiness: {
      status: "more_discovery_recommended",
      summary: "Add a premise and early story foundations before drafting.",
      signals: [],
      missing: ["Original premise", "Creative North Star", "Major character profile", "Story architecture", "Draft text"],
      canDraft: false,
    },
  };
}

export function createBlankProjectBrief(projectTitle: string): WorkflowProjectBrief {
  return {
    workingTitle: projectTitle,
    projectType: "standalone",
    seriesTitle: "",
    bookNumber: undefined,
    genre: "",
    subgenre: "",
    intendedAudience: "",
    approximateTargetLength: "",
    pov: "",
    tense: "",
    originalPremise: "",
    scenesOrImagesAlreadyImagined: [],
    themes: [],
    inspirations: [],
    thingsToAvoid: [],
    openNotes: "",
    fieldStatus: {
      workingTitle: "confirmed",
      projectType: "tentative",
      originalPremise: "unresolved",
    },
  };
}

export function createBlankNorthStar(): CreativeNorthStar {
  return {
    readerExperience: "",
    emotionalPromise: "",
    distinguishingQualities: [],
    centralThematicConcern: "",
    genrePromises: [],
    conventionsToChallenge: [],
    toneAndAtmosphere: "",
    whatTheReaderShouldRemember: "",
    explicitCreativeGuardrails: [],
  };
}

export function createBlankStoryArchitecture(): StoryArchitecture {
  return {
    storyEngine: "",
    centralConflict: "",
    thematicConflict: "",
    protagonistTransformation: "",
    seriesArc: "",
    beginningState: "",
    endingState: "",
    majorTurningPoints: [],
    actStructure: "",
    chapterMapStatus: "",
  };
}

export function createWorkflowArtifact(
  type: WorkflowArtifact["type"],
  title: string,
  description: string,
  phaseId: WorkflowPhaseId,
  workspaceTarget: WorkflowWorkspaceTarget,
  status: WorkflowArtifactStatus = "open",
  relatedIds: string[] = [],
): WorkflowArtifact {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type,
    title,
    description,
    phaseId,
    status,
    workspaceTarget,
    relatedIds,
    createdAt: now,
    updatedAt: now,
  };
}

function textExists(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function arrayHasValues(value: string[] | undefined): boolean {
  return Boolean(value?.some((item) => item.trim().length > 0));
}

export function inferWorkflowState(project: Project, nodes: ManuscriptNode[], characters: Character[], existing?: Partial<WorkflowState>): WorkflowState {
  const now = new Date().toISOString();
  const activeManuscript = nodes.find((node) => node.kind === "scene") ?? nodes.find((node) => node.kind === "chapter");
  const currentBook = nodes.find((node) => node.kind === "book");
  const manuscriptExists = nodes.some((node) => node.kind === "scene" && (textExists(node.content) || (node.wordCount ?? 0) > 0));
  const hasCharacters = characters.length > 0;
  const hasMajorCharacter = characters.some((character) => character.role === "major");
  const protagonist = characters.find((character) => character.role === "major") ?? characters[0];
  const protagonistReady = Boolean(protagonist && (textExists(protagonist.identity.fullName) || textExists(protagonist.psychology.coreWound) || textExists(protagonist.psychology.consciousDesire)));
  const architectureReady = nodes.some((node) => node.kind === "chapter") || nodes.some((node) => node.kind === "act") || nodes.some((node) => node.kind === "part");
  const brief = existing?.projectBrief ?? createBlankProjectBrief(project.title);
  const northStar = existing?.creativeNorthStar ?? createBlankNorthStar();
  const storyArchitecture = existing?.storyArchitecture ?? createBlankStoryArchitecture();
  const decisions = existing?.decisions ?? [];
  const discoveryEntries = existing?.discoveryEntries ?? [];
  const artifacts = existing?.artifacts?.length ? existing.artifacts : [];
  const milestones = existing?.milestones?.length ? existing.milestones : [];
  const unresolved = decisions.filter((decision) => decision.status === "open" || decision.status === "deferred");

  const artifactTrail = [...artifacts];
  if (textExists(brief.originalPremise) || textExists(brief.workingTitle)) {
    artifactTrail.push(createWorkflowArtifact("project_brief", "Project Brief", "The working concept and core project framing.", "project_creation", "workflow", "accepted"));
  }
  if (textExists(northStar.readerExperience) || textExists(northStar.emotionalPromise)) {
    artifactTrail.push(createWorkflowArtifact("creative_north_star", "Creative North Star", "The intended reader experience and guardrails.", "creative_north_star", "workflow", "accepted"));
  }
  if (textExists(storyArchitecture.storyEngine) || textExists(storyArchitecture.centralConflict) || arrayHasValues(storyArchitecture.majorTurningPoints)) {
    artifactTrail.push(createWorkflowArtifact("story_architecture", "Story Architecture", "The story engine, major turns, and arc shape.", "story_architecture", "analysis", "accepted"));
  }
  if (discoveryEntries.length > 0) {
    artifactTrail.push(createWorkflowArtifact("discovery_entry", "Discovery Log", "Premise exploration, alternative directions, and rejected ideas.", "discovery", "ai", "tentative"));
  }
  if (hasCharacters) {
    artifactTrail.push(createWorkflowArtifact("character_foundation", "Character Foundations", `${characters.length} character profile${characters.length === 1 ? "" : "s"} exist.`, "character_foundations", "character", "accepted", characters.map((character) => character.id)));
  }
  if (architectureReady) {
    artifactTrail.push(createWorkflowArtifact("story_architecture", "Story Architecture", "The book has at least a chapter or act scaffold.", "story_architecture", "files", "tentative"));
  }
  if (manuscriptExists) {
    artifactTrail.push(createWorkflowArtifact("manuscript", "Active Manuscript", "Draft text exists locally.", "drafting_readiness", "manuscript", "accepted", [activeManuscript?.id ?? ""]));
  }

  const artifactIds = artifactTrail.map((artifact) => artifact.id);
  const latestMilestone = milestones[milestones.length - 1];
  const projectStatus = manuscriptExists ? "drafting" : architectureReady ? "planning" : textExists(brief.originalPremise) || textExists(northStar.readerExperience) ? "planning" : "idea";

  const currentPhaseId = resolveCurrentPhase({
    brief,
    northStar,
    characters,
    manuscriptExists,
    architectureReady,
    decisions: unresolved,
    discoveryEntries,
  });

  const draftingReadiness = evaluateDraftingReadiness({
    brief,
    northStar,
    characters,
    manuscriptExists,
    architectureReady,
    activeManuscript,
  });

  const recommendation = recommendNextAction({
    project,
    brief,
    northStar,
    characters,
    manuscriptExists,
    architectureReady,
    decisions: unresolved,
    activeManuscript,
    currentPhaseId,
  });

  const storedPhase = existing?.currentPhaseId;
  const currentPhase = existing?.source === "manual" && storedPhase ? storedPhase : currentPhaseId;
  const currentProjectStatus = existing?.source === "manual" && existing?.projectStatus ? existing.projectStatus : projectStatus;
  const currentRecommendation = existing?.source === "manual" && existing?.recommendation ? existing.recommendation : recommendation;
  const currentArtifactIds = existing?.artifactIds?.length ? existing.artifactIds : artifactIds;
  const currentDecisionIds = existing?.unresolvedDecisionIds?.length ? existing.unresolvedDecisionIds : unresolved.map((decision) => decision.id);

  return {
    projectId: project.id,
    currentPhaseId: currentPhase,
    currentBookId: existing?.currentBookId ?? currentBook?.id,
    activeManuscriptId: existing?.activeManuscriptId ?? activeManuscript?.id,
    latestMilestoneId: existing?.latestMilestoneId ?? latestMilestone?.id,
    projectStatus: currentProjectStatus,
    unresolvedDecisionIds: currentDecisionIds,
    artifactIds: currentArtifactIds,
    recommendation: currentRecommendation,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    source: existing?.source ?? "inferred",
    projectBrief: brief,
    creativeNorthStar: northStar,
    storyArchitecture,
    discoveryEntries,
    decisions,
    artifacts: artifactTrail,
    milestones,
    draftingReadiness,
  };
}

function resolveCurrentPhase(input: {
  brief: WorkflowProjectBrief;
  northStar: CreativeNorthStar;
  characters: Character[];
  manuscriptExists: boolean;
  architectureReady: boolean;
  decisions: WorkflowDecision[];
  discoveryEntries: WorkflowDiscoveryEntry[];
}): WorkflowPhaseId {
  const { brief, northStar, characters, manuscriptExists, architectureReady, decisions, discoveryEntries } = input;
  const hasPremise = textExists(brief.originalPremise);
  const northStarReady = textExists(northStar.readerExperience) && textExists(northStar.emotionalPromise);
  const discoveryReady = discoveryEntries.length > 0 || decisions.length > 0;
  const hasCharacters = characters.length > 0;
  const protagonistReady = characters.some((character) => character.role === "major" && (textExists(character.identity.fullName) || textExists(character.psychology.coreWound) || textExists(character.psychology.consciousDesire)));

  if (!textExists(brief.workingTitle) && !hasPremise && !hasCharacters && !manuscriptExists) return "project_creation";
  if (textExists(brief.workingTitle) && !hasPremise) return "idea_capture";
  if (hasPremise && !northStarReady) return "creative_north_star";
  if (northStarReady && !discoveryReady) return "discovery";
  if (hasCharacters && !protagonistReady) return "character_foundations";
  if (northStarReady && protagonistReady && !architectureReady) return "story_architecture";
  return "drafting_readiness";
}

function evaluateDraftingReadiness(input: {
  brief: WorkflowProjectBrief;
  northStar: CreativeNorthStar;
  characters: Character[];
  manuscriptExists: boolean;
  architectureReady: boolean;
  activeManuscript?: ManuscriptNode;
}): DraftingReadiness {
  const { brief, northStar, characters, manuscriptExists, architectureReady, activeManuscript } = input;
  const signals: string[] = [];
  const missing: string[] = [];
  if (textExists(brief.originalPremise)) signals.push("Project brief exists");
  else missing.push("Original premise");
  if (textExists(northStar.readerExperience) && textExists(northStar.emotionalPromise)) signals.push("Creative North Star exists");
  else missing.push("Creative North Star");
  if (characters.some((character) => character.role === "major")) signals.push("At least one major character exists");
  else missing.push("Major character profile");
  if (architectureReady) signals.push("Story architecture exists");
  else missing.push("Story architecture");
  if (manuscriptExists) signals.push("Draft text already exists");
  else missing.push("Draft text");
  if (activeManuscript) signals.push(`Active section: ${activeManuscript.title}`);

  const readyCount = signals.length;
  const canDraft = readyCount >= 3 && textExists(brief.originalPremise);
  let status: DraftingReadiness["status"] = "more_discovery_recommended";
  let summary = "More discovery is recommended before drafting.";

  if (manuscriptExists) {
    status = "already_drafting";
    summary = "You are already drafting. Resume the current manuscript when you are ready.";
  } else if (canDraft && architectureReady) {
    status = "ready_to_begin";
    summary = "You can begin drafting now.";
  } else if (textExists(brief.originalPremise) && textExists(northStar.readerExperience) && characters.some((character) => character.role === "major")) {
    status = "ready_with_questions";
    summary = "Drafting is possible, but a few questions remain open.";
  }

  return { status, summary, signals, missing, canDraft };
}

function recommendNextAction(input: {
  project: Project;
  brief: WorkflowProjectBrief;
  northStar: CreativeNorthStar;
  characters: Character[];
  manuscriptExists: boolean;
  architectureReady: boolean;
  decisions: WorkflowDecision[];
  activeManuscript?: ManuscriptNode;
  currentPhaseId: WorkflowPhaseId;
}): WorkflowRecommendation {
  const { brief, northStar, characters, manuscriptExists, architectureReady, decisions, activeManuscript, currentPhaseId } = input;
  const unresolvedDecision = decisions.find((decision) => decision.status === "open" || decision.status === "deferred");
  const protagonist = characters.find((character) => character.role === "major");
  if (!textExists(brief.originalPremise)) {
    return {
      title: "Capture the original premise",
      reason: "The project has a title, but the premise is still missing. Recording it now gives the workflow something concrete to build around.",
      phaseId: "idea_capture",
      workspaceTarget: "workflow",
      relatedArtifactIds: [],
      relatedDecisionIds: [],
      secondaryActions: [{ label: "Open the AI Editor for discovery", reason: "Use it to test the premise and explore alternatives.", workspaceTarget: "ai" }],
    };
  }
  if (!textExists(northStar.readerExperience) || !textExists(northStar.emotionalPromise)) {
    return {
      title: "Define the Creative North Star",
      reason: "The premise exists, but the intended reader experience and emotional promise are not yet explicit.",
      phaseId: "creative_north_star",
      workspaceTarget: "workflow",
      relatedArtifactIds: [],
      relatedDecisionIds: [],
      secondaryActions: [
        { label: "Open the Character panel", reason: "Character development may help sharpen the story promise.", workspaceTarget: "character" },
        { label: "Open the AI Editor", reason: "Ask for alternatives that fit the tone you want.", workspaceTarget: "ai" },
      ],
    };
  }
  if (unresolvedDecision && currentPhaseId !== "drafting_readiness") {
    return {
      title: unresolvedDecision.title,
      reason: unresolvedDecision.description,
      phaseId: unresolvedDecision.phaseId,
      workspaceTarget: unresolvedDecision.phaseId === "character_foundations" ? "character" : unresolvedDecision.phaseId === "story_architecture" ? "files" : "workflow",
      relatedArtifactIds: unresolvedDecision.relatedArtifactId ? [unresolvedDecision.relatedArtifactId] : [],
      relatedDecisionIds: [unresolvedDecision.id],
      secondaryActions: [{ label: "Review the workflow home", reason: "You can resolve the decision without leaving the project overview.", workspaceTarget: "workflow" }],
    };
  }
  if (protagonist && !textExists(protagonist.psychology.coreWound) && !textExists(protagonist.psychology.consciousDesire)) {
    return {
      title: "Develop the protagonist foundations",
      reason: "A major character exists, but the core wound and conscious desire are still missing.",
      phaseId: "character_foundations",
      workspaceTarget: "character",
      relatedArtifactIds: [],
      relatedDecisionIds: [],
      secondaryActions: [{ label: "Open the AI Editor", reason: "Use voice and character prompts to sharpen the foundation.", workspaceTarget: "ai" }],
    };
  }
  if (!architectureReady) {
    return {
      title: "Shape the story architecture",
      reason: "The book has enough material to begin organizing the conflict, turning points, and chapter direction.",
      phaseId: "story_architecture",
      workspaceTarget: "files",
      relatedArtifactIds: [],
      relatedDecisionIds: [],
      secondaryActions: [
        { label: "Open the Analysis panel", reason: "Use it to inspect pacing and structural dependencies.", workspaceTarget: "analysis" },
        { label: "Open the AI Editor", reason: "Ask for structural alternatives if you want a second pass.", workspaceTarget: "ai" },
      ],
    };
  }
  if (manuscriptExists) {
    return {
      title: "Resume drafting",
      reason: "The project already contains draft text, so the most useful next action is to continue the current manuscript rather than restart planning.",
      phaseId: "drafting_readiness",
      workspaceTarget: "manuscript",
      relatedArtifactIds: [],
      relatedDecisionIds: [],
      secondaryActions: [
        { label: "Open Character Foundations", reason: "Check whether any new draft choices changed the character work.", workspaceTarget: "character" },
        { label: "Open Discovery", reason: "Capture any new questions that emerged while drafting.", workspaceTarget: "workflow" },
      ],
    };
  }
  return {
    title: "Begin drafting Chapter One",
    reason: "The project has enough foundations to start writing without waiting for every question to be resolved.",
    phaseId: "drafting_readiness",
    workspaceTarget: "manuscript",
    relatedArtifactIds: [],
    relatedDecisionIds: [],
    secondaryActions: [
      { label: "Open the AI Editor", reason: "Use it to draft, continue, or pressure-test the opening scene.", workspaceTarget: "ai" },
      { label: "Review the workflow home", reason: "Confirm the unresolved questions before drafting if you want a quick check.", workspaceTarget: "workflow" },
    ],
  };
}
