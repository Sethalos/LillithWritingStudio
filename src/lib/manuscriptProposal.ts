import type { ManuscriptProposal } from "../domain/ai";

export interface ParsedAssistantMessage {
  text: string;
  proposal: ManuscriptProposal | null;
  truncated: boolean;
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

// Walk the value of the first `"text":"..."` pair, decoding escapes, and stop at
// the closing quote or at the end of the string. A reply cut off by the output
// token cap never closes its quote, so this recovers the prose the writer would
// otherwise see as raw JSON.
function salvageText(cleaned: string): string | null {
  const opener = /"text"\s*:\s*"/.exec(cleaned);
  if (!opener) return null;
  let out = "";
  let index = opener.index + opener[0].length;
  while (index < cleaned.length) {
    const character = cleaned[index];
    if (character === "\\") {
      const escape = cleaned[index + 1];
      if (escape === undefined) break;
      if (escape === "u") {
        const code = cleaned.slice(index + 2, index + 6);
        if (code.length < 4) break;
        out += String.fromCharCode(parseInt(code, 16));
        index += 6;
        continue;
      }
      out += escape === "n" ? "\n" : escape === "t" ? "\t" : escape === "r" ? "\r" : escape;
      index += 2;
      continue;
    }
    if (character === '"') break;
    out += character;
    index += 1;
  }
  const trimmed = out.trim();
  return trimmed ? trimmed : null;
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
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      parsed = undefined;
    }
    const text = parsed && typeof parsed.text === "string" ? parsed.text.trim() : "";
    if (text) return { text, proposal: validateProposal(parsed?.proposal), truncated: false };
    // No usable `text` — whether the JSON was cut off or simply shaped differently,
    // salvaging beats dumping raw JSON at the writer. Only a parse failure means truncation.
    const salvaged = salvageText(cleaned);
    if (salvaged) return { text: salvaged, proposal: null, truncated: parsed === undefined };
  }
  return { text: cleaned, proposal: null, truncated: false };
}
