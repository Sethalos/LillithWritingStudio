import { invoke } from "@tauri-apps/api/core";
import type { WritingProfile } from "../domain/models";

const isTauri = () => "__TAURI_INTERNALS__" in window;
const key = "lillith:writing-profile:v1";

export function blankWritingProfile(projectId: string): WritingProfile {
  return { projectId, version: 0, styleSummary: "", pointOfView: "", tense: "", dialect: "Canadian English", sentenceRhythm: "", descriptionLevel: "balanced", dialogueStyle: "", preserve: [], avoid: [], mechanics: [], projectRules: [], approvedSamples: [] };
}

export async function loadWritingProfile(projectId: string): Promise<WritingProfile> {
  if (isTauri()) return invoke("load_writing_profile");
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : blankWritingProfile(projectId);
}

export async function persistWritingProfile(profile: WritingProfile): Promise<WritingProfile> {
  if (isTauri()) return invoke("save_writing_profile", { writingProfile: profile });
  const saved = { ...profile, version: profile.version + 1, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(saved)); return saved;
}
