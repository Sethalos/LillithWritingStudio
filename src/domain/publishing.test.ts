// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { Character, ManuscriptNode } from "./models";
import {
  blankPublishingWorkflow,
  buildPublishingChecklistState,
  normalizePublishingWorkflow,
  publicationGateSummary,
  type PublishingStageStatus,
} from "./publishing";

const nodes: ManuscriptNode[] = [
  { id: "chapter-1", projectId: "project-1", kind: "chapter", title: "Chapter One", position: 0, wordCount: 400, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
  { id: "scene-1", projectId: "project-1", parentId: "chapter-1", kind: "scene", title: "Arrival", content: "<p>The bell rang.</p>", position: 0, wordCount: 400, revision: 0, updatedAt: "2026-07-12T00:00:00Z", sceneType: "mixed", sceneLocation: "Harbour" },
];

const characters: Character[] = [
  {
    id: "char-1",
    projectId: "project-1",
    role: "major",
    identity: { fullName: "Mara Vale", aliases: [], skills: [], limitations: [], habits: [], mannerisms: [], personalPossessions: [] },
    psychology: { shameTriggers: [], angerTriggers: [], copingMechanisms: [], defenceMechanisms: [], emotionalBlindSpots: [], moralBoundaries: [], beliefs: [], contradictions: [], regrets: [], secrets: [], sourcesOfGuilt: [], sourcesOfPride: [] },
    voiceLock: { vocabulary: "measured", sentenceLength: "short", sentenceStructure: "plain", formality: "low", speechRhythm: "steady", educationInSpeech: "university", regionalOrProfessionalLanguage: "maritime", humourStyle: "dry", sarcasm: "light", emotionalDirectness: "medium", profanityLevel: "light", commonPhrases: [], verbalHabits: [], frequentWords: [], avoidedWords: [], metaphorPreferences: "sea imagery", internalMonologueStyle: "close", spokenDialogueStyle: "subtextual", behaviourDuringSilence: "observant", speechUnderStress: "shorter", speechWhileAngry: "clipped", speechWhileAfraid: "quiet", speechWhileGrieving: "flat", speechWhenLying: "careful", speechToAuthority: "polite", speechToFamily: "warm", approvedExamples: ["We are not doing that."], rejectedExamples: [], version: 1 },
    notes: "",
    createdAt: "2026-07-12T00:00:00Z",
    updatedAt: "2026-07-12T00:00:00Z",
  },
];

afterEach(() => {
  localStorage.clear();
});

describe("publishing checklist model", () => {
  it("auto-completes applicable items, preserves manual overrides, and explains blockers", () => {
    const workflow = blankPublishingWorkflow("project-1", "The Wake");
    workflow.metadata.title = "The Wake";
    workflow.metadata.penName = "M. Vale";
    workflow.metadata.genre = "Dark fantasy";
    workflow.metadata.povStyle = "Close third";
    workflow.metadata.tense = "Past tense";
    workflow.metadata.description = "A small but complete launch description that is long enough to qualify.";
    workflow.metadata.keywords = "storms, memory";
    workflow.metadata.bisac = "FIC000000";
    workflow.metadata.kindlePrice = "$4.99";
    workflow.metadata.paperbackPrice = "$14.99";
    workflow.metadata.hardcoverPrice = "$24.99";
    workflow.metadata.seriesMode = "series";
    workflow.metadata.seriesTitle = "The Wake Cycle";
    workflow.targets = ["kindle"];
    workflow.stages = workflow.stages.map((stage) => ({ ...stage, status: (stage.id === "publication" ? "not-started" : "complete") as PublishingStageStatus }));
    workflow.checklistItems = [{
      id: "kindle-export",
      phaseId: "production-pass",
      title: "Kindle EPUB generated",
      description: "A Kindle-ready EPUB has been exported for the project.",
      rationale: "A generated production file is the direct evidence for the production phase.",
      requirementLevel: "required",
      status: "complete",
      completionSource: "manual",
      evidenceType: "export",
      evidenceReference: "/tmp/the-wake.epub",
      blockingForPublication: true,
      applicableFormats: ["kindle"],
      applicableProjectTypes: ["both"],
      notes: "Exported from the Publishing workspace.",
      completedAt: "2026-07-12T00:00:00Z",
      updatedAt: "2026-07-12T00:00:00Z",
      workspaceTarget: "files",
    }, {
      id: "kindle-qa",
      phaseId: "preview-qa",
      title: "Kindle preview QA recorded",
      description: "Kindle preview was checked for navigation, spacing, and readability.",
      rationale: "Reflowable EPUBs should be verified on a Kindle-style reading surface.",
      requirementLevel: "required",
      status: "complete",
      completionSource: "manual",
      evidenceType: "preview",
      evidenceReference: "/tmp/kindle-preview.html",
      blockingForPublication: true,
      applicableFormats: ["kindle"],
      applicableProjectTypes: ["both"],
      notes: "",
      completedAt: "2026-07-12T00:00:00Z",
      updatedAt: "2026-07-12T00:00:00Z",
      workspaceTarget: "files",
    }];

    const checklist = buildPublishingChecklistState(workflow, { projectTitle: "The Wake", nodes, characters }, workflow.checklistItems);
    const gate = publicationGateSummary(workflow, checklist);

    expect(checklist.items.find((item) => item.id === "project-title")?.status).toBe("complete");
    expect(checklist.items.find((item) => item.id === "outline-scene-plan")?.status).toBe("complete");
    expect(checklist.items.find((item) => item.id === "draft-text")?.status).toBe("complete");
    expect(checklist.items.find((item) => item.id === "voice-lock-reviewed")?.status).toBe("complete");
    expect(checklist.items.find((item) => item.id === "series-metadata")?.status).toBe("complete");
    expect(checklist.items.find((item) => item.id === "kindle-export")?.status).toBe("complete");
    expect(checklist.items.find((item) => item.id === "paperback-export")?.status).toBe("not_applicable");
    expect(checklist.items.find((item) => item.id === "hardcover-export")?.status).toBe("not_applicable");
    expect(gate.formats.kindle.selected).toBe(true);
    expect(gate.formats.kindle.ready).toBe(true);
    expect(gate.formats.paperback.ready).toBe(false);
    expect(gate.formats.hardcover.ready).toBe(false);
    expect(gate.blockers.map((item) => item.id)).not.toContain("paperback-export");
    expect(gate.publishable).toBe(true);
    expect(gate.recommendation).toContain("The publication gate is green");
  });

  it("preserves skipped and not applicable states and supports reopening", () => {
    const workflow = blankPublishingWorkflow("project-1", "The Wake");
    workflow.metadata.title = "The Wake";
    workflow.metadata.penName = "M. Vale";
    workflow.metadata.genre = "Dark fantasy";
    workflow.metadata.povStyle = "Close third";
    workflow.metadata.tense = "Past tense";
    workflow.metadata.description = "A complete description.";
    workflow.stages = workflow.stages.map((stage) => ({ ...stage, status: "complete" as PublishingStageStatus }));
    workflow.targets = ["kindle"];
    workflow.checklistItems = [
      {
        id: "cover-approved",
        phaseId: "cover-production",
        title: "Cover is approved or intentionally deferred",
        description: "A cover file or approved cover record exists for the planned format.",
        rationale: "The interior can be ready while cover work is still pending, but the app should not hide the gap.",
        requirementLevel: "recommended",
        status: "skipped",
        completionSource: "manual",
        evidenceType: "cover",
        evidenceReference: "",
        blockingForPublication: false,
        applicableFormats: ["all"],
        applicableProjectTypes: ["both"],
        notes: "Planned for a later pass.",
        completedAt: undefined,
        updatedAt: "2026-07-12T00:00:00Z",
        overrideNote: "Intentionally deferred.",
        workspaceTarget: "publishing",
      },
    ];

    const checklist = buildPublishingChecklistState(workflow, { projectTitle: "The Wake", nodes, characters }, workflow.checklistItems);
    expect(checklist.items.find((item) => item.id === "cover-approved")?.status).toBe("skipped");
    expect(checklist.items.find((item) => item.id === "paperback-export")?.status).toBe("not_applicable");

    const reopened = { ...workflow, checklistItems: checklist.items.map((item) => item.id === "cover-approved" ? { ...item, status: "in_progress" as const, completionSource: "manual" as const, overrideNote: "Reopened for review." } : item) };
    const reopenedChecklist = buildPublishingChecklistState(reopened, { projectTitle: "The Wake", nodes, characters }, reopened.checklistItems);
    expect(reopenedChecklist.items.find((item) => item.id === "cover-approved")?.status).toBe("in_progress");
  });

  it("round-trips through local persistence for existing projects", async () => {
    const workflow = normalizePublishingWorkflow(blankPublishingWorkflow("project-1", "The Wake"), "The Wake");
    workflow.metadata.title = "The Wake";
    workflow.metadata.penName = "M. Vale";
    const stored = JSON.stringify(workflow);
    localStorage.setItem("lillith:publishing-workflow:v1:project-1", stored);
    const { loadPublishingWorkflow, persistPublishingWorkflow } = await import("../lib/publishingWorkflowRepository");
    const loaded = await loadPublishingWorkflow("project-1", "The Wake");
    expect(loaded.metadata.title).toBe("The Wake");
    expect(loaded.guidanceMode).toBe("soft");
    const saved = await persistPublishingWorkflow(loaded, "The Wake");
    expect(saved.projectId).toBe("project-1");
    expect(JSON.parse(localStorage.getItem("lillith:publishing-workflow:v1:project-1") ?? "{}").projectId).toBe("project-1");
  });
});
