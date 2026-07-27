import type { ManuscriptProposal } from "../domain/ai";

export interface ParsedAssistantMessage {
  text: string;
  proposal: ManuscriptProposal | null;
}

// A validated append proposal, or null. Phase 1 honors only "append" with non-empty text.
function validateProposal(value: unknown): ManuscriptProposal | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.action !== "append") return null;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text) return null;
  return { action: "append", text };
}

// Interpret a raw assistant response. If it is a JSON object with a non-empty
// `text` field, use that as the reply and extract any valid `proposal`;
// otherwise treat the whole string as a plain-text reply with no proposal.
export function parseAssistantMessage(raw: string): ParsedAssistantMessage {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (cleaned.startsWith("{")) {
    try {
      const json = JSON.parse(cleaned) as Record<string, unknown>;
      const text = typeof json.text === "string" ? json.text.trim() : "";
      if (text) return { text, proposal: validateProposal(json.proposal) };
    } catch {
      // fall through to plain-text handling
    }
  }
  return { text: raw.trim(), proposal: null };
}
