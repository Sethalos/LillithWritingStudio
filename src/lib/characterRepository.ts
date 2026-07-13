import { invoke } from "@tauri-apps/api/core";
import type { Character, CharacterIdentity, CharacterPsychology, VoiceLock } from "../domain/models";

const isTauri = () => "__TAURI_INTERNALS__" in window;

export async function loadCharacters(projectId?: string): Promise<Character[]> {
  if (isTauri()) return invoke<Character[]>("list_characters");
  const prefix = projectId ? `lillith:character:${projectId}:` : "lillith:character:";
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? "null") as Character | null;
      } catch {
        return null;
      }
    })
    .filter((value): value is Character => Boolean(value));
}
export async function persistCharacter(character: Character): Promise<Character> { if (isTauri()) return invoke<Character>("save_character", { character }); localStorage.setItem(`lillith:character:${character.projectId}:${character.id}`, JSON.stringify(character)); return { ...character, voiceLock: { ...character.voiceLock, version: character.voiceLock.version + 1 }, updatedAt: new Date().toISOString() }; }

const identity = (): CharacterIdentity => ({ fullName: "", aliases: [], skills: [], limitations: [], habits: [], mannerisms: [], personalPossessions: [] });
const psychology = (): CharacterPsychology => ({ shameTriggers: [], angerTriggers: [], copingMechanisms: [], defenceMechanisms: [], emotionalBlindSpots: [], moralBoundaries: [], beliefs: [], contradictions: [], regrets: [], secrets: [], sourcesOfGuilt: [], sourcesOfPride: [] });
const voiceLock = (): VoiceLock => ({ vocabulary: "", sentenceLength: "", sentenceStructure: "", formality: "", speechRhythm: "", educationInSpeech: "", regionalOrProfessionalLanguage: "", humourStyle: "", sarcasm: "", emotionalDirectness: "", profanityLevel: "", commonPhrases: [], verbalHabits: [], frequentWords: [], avoidedWords: [], metaphorPreferences: "", internalMonologueStyle: "", spokenDialogueStyle: "", behaviourDuringSilence: "", speechUnderStress: "", speechWhileAngry: "", speechWhileAfraid: "", speechWhileGrieving: "", speechWhenLying: "", speechToAuthority: "", speechToFamily: "", approvedExamples: [], rejectedExamples: [], version: 0 });
export function blankCharacter(projectId: string): Character { const now = new Date().toISOString(); return { id: crypto.randomUUID(), projectId, role: "major", identity: identity(), psychology: psychology(), voiceLock: voiceLock(), notes: "", createdAt: now, updatedAt: now }; }
