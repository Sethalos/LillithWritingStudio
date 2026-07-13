// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublishingPanel } from "./PublishingPanel";
import { blankPublishingWorkflow } from "../domain/publishing";
import type { Character, ManuscriptNode } from "../domain/models";

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
  cleanup();
  localStorage.clear();
});

describe("publishing workflow", () => {
  it("surfaces the universal soft-guidance gate and three publication targets", async () => {
    const workflow = blankPublishingWorkflow("project-1", "The Wake");
    workflow.metadata.title = "The Wake";
    workflow.metadata.penName = "M. Vale";
    workflow.metadata.genre = "Dark fantasy";
    workflow.metadata.povStyle = "Close third";
    workflow.metadata.tense = "Past tense";
    workflow.metadata.description = "A debut novel with enough detail to support publication readiness.";
    workflow.metadata.keywords = "storms, memory";
    workflow.metadata.bisac = "FIC000000";
    workflow.metadata.kindlePrice = "$4.99";
    workflow.targets = ["kindle"];
    workflow.stages = workflow.stages.map((stage) => ({ ...stage, status: stage.id === "publication" ? "not-started" : "complete" }));
    workflow.checklistItems = [
      { id: "kindle-export", phaseId: "production-pass", title: "Kindle EPUB generated", description: "A Kindle-ready EPUB has been exported for the project.", rationale: "A generated production file is the direct evidence for the production phase.", requirementLevel: "required", status: "complete", completionSource: "manual", evidenceType: "export", evidenceReference: "/tmp/the-wake.epub", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], notes: "", completedAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z", workspaceTarget: "files" },
      { id: "kindle-qa", phaseId: "preview-qa", title: "Kindle preview QA recorded", description: "Kindle preview was checked for navigation, spacing, and readability.", rationale: "Reflowable EPUBs should be verified on a Kindle-style reading surface.", requirementLevel: "required", status: "complete", completionSource: "manual", evidenceType: "preview", evidenceReference: "/tmp/the-wake-preview.html", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], notes: "", completedAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z", workspaceTarget: "files" },
    ];
    localStorage.setItem("lillith:publishing-workflow:v1:project-1", JSON.stringify(workflow));

    render(<PublishingPanel projectId="project-1" projectTitle="The Wake" nodes={nodes} characters={characters} />);

    expect(await screen.findByText("Publication gate is green")).toBeVisible();
    expect(screen.getByText("Publishing Dashboard")).toBeVisible();
    expect(screen.getByRole("button", { name: "PUBLISH" })).toBeEnabled();
    expect(screen.getByText("Soft guidance · Universal workflow · Local-first publication readiness")).toBeVisible();
    expect(screen.getByText("Kindle")).toBeVisible();
    expect(screen.getByText("Paperback")).toBeVisible();
    expect(screen.getByText("Hardcover")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Export" })).toHaveLength(3);
  });

  it("shows the locked dashboard state after publication", async () => {
    const workflow = blankPublishingWorkflow("project-1", "The Wake");
    workflow.metadata.title = "The Wake";
    workflow.metadata.penName = "M. Vale";
    workflow.metadata.genre = "Dark fantasy";
    workflow.metadata.povStyle = "Close third";
    workflow.metadata.tense = "Past tense";
    workflow.metadata.description = "A published novel.";
    workflow.metadata.keywords = "storms, memory";
    workflow.metadata.bisac = "FIC000000";
    workflow.metadata.kindlePrice = "$4.99";
    workflow.targets = ["kindle"];
    workflow.archiveLocked = true;
    workflow.lastPublishedAt = "2026-07-12T14:00:00Z";
    workflow.stages = workflow.stages.map((stage) => ({ ...stage, status: stage.id === "publication" ? "not-started" : "complete" }));
    workflow.checklistItems = [
      { id: "kindle-export", phaseId: "production-pass", title: "Kindle EPUB generated", description: "A Kindle-ready EPUB has been exported for the project.", rationale: "A generated production file is the direct evidence for the production phase.", requirementLevel: "required", status: "complete", completionSource: "manual", evidenceType: "export", evidenceReference: "/tmp/the-wake.epub", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], notes: "", completedAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z", workspaceTarget: "files" },
      { id: "kindle-qa", phaseId: "preview-qa", title: "Kindle preview QA recorded", description: "Kindle preview was checked for navigation, spacing, and readability.", rationale: "Reflowable EPUBs should be verified on a Kindle-style reading surface.", requirementLevel: "required", status: "complete", completionSource: "manual", evidenceType: "preview", evidenceReference: "/tmp/the-wake-preview.html", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], notes: "", completedAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z", workspaceTarget: "files" },
    ];
    localStorage.setItem("lillith:publishing-workflow:v1:project-1", JSON.stringify(workflow));

    render(<PublishingPanel projectId="project-1" projectTitle="The Wake" nodes={nodes} characters={characters} />);

    expect(await screen.findByText("Publishing Dashboard")).toBeVisible();
    expect(screen.getByText("Published and locked")).toBeVisible();
    expect(screen.getByText(/Published locally on/)).toBeVisible();
    expect(screen.getByText("Publishing locked")).toBeVisible();
    expect(screen.queryByRole("button", { name: "PUBLISH" })).toBeNull();
  });

  it("requires a note before reopening a published version", async () => {
    const workflow = blankPublishingWorkflow("project-1", "The Wake");
    workflow.metadata.title = "The Wake";
    workflow.metadata.penName = "M. Vale";
    workflow.metadata.genre = "Dark fantasy";
    workflow.metadata.povStyle = "Close third";
    workflow.metadata.tense = "Past tense";
    workflow.metadata.description = "A published novel.";
    workflow.metadata.keywords = "storms, memory";
    workflow.metadata.bisac = "FIC000000";
    workflow.metadata.kindlePrice = "$4.99";
    workflow.targets = ["kindle"];
    workflow.archiveLocked = true;
    workflow.lastPublishedAt = "2026-07-12T14:00:00Z";
    workflow.publicationState = "published";
    workflow.stages = workflow.stages.map((stage) => ({ ...stage, status: stage.id === "publication" ? "not-started" : "complete" }));
    workflow.checklistItems = [
      { id: "kindle-export", phaseId: "production-pass", title: "Kindle EPUB generated", description: "A Kindle-ready EPUB has been exported for the project.", rationale: "A generated production file is the direct evidence for the production phase.", requirementLevel: "required", status: "complete", completionSource: "manual", evidenceType: "export", evidenceReference: "/tmp/the-wake.epub", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], notes: "", completedAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z", workspaceTarget: "files" },
      { id: "kindle-qa", phaseId: "preview-qa", title: "Kindle preview QA recorded", description: "Kindle preview was checked for navigation, spacing, and readability.", rationale: "Reflowable EPUBs should be verified on a Kindle-style reading surface.", requirementLevel: "required", status: "complete", completionSource: "manual", evidenceType: "preview", evidenceReference: "/tmp/the-wake-preview.html", blockingForPublication: true, applicableFormats: ["kindle"], applicableProjectTypes: ["both"], notes: "", completedAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z", workspaceTarget: "files" },
    ];
    localStorage.setItem("lillith:publishing-workflow:v1:project-1", JSON.stringify(workflow));

    render(<PublishingPanel projectId="project-1" projectTitle="The Wake" nodes={nodes} characters={characters} />);

    expect(await screen.findByText("Publishing Dashboard")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Reopen for revision/i }));
    const dialog = screen.getByRole("dialog", { name: "Reopen publication" });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("button", { name: /Reopen/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Why are you reopening the published version?"), { target: { value: "Fix a typographic error in chapter 3." } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Reopen/i }));
    expect((await screen.findAllByText("Published version superseded")).length).toBeGreaterThan(0);
    expect(screen.getByText("Publishing editable")).toBeVisible();
    expect(screen.getByText("Publishing history")).toBeVisible();
    expect(screen.getByText(/Fix a typographic error in chapter 3\./)).toBeVisible();
  });
});
