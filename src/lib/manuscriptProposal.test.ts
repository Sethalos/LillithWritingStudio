import { describe, expect, it } from "vitest";
import { parseAssistantMessage } from "./manuscriptProposal";

describe("parseAssistantMessage", () => {
  it("returns plain text with no proposal for a non-JSON reply", () => {
    const result = parseAssistantMessage("Here are three ideas for the opening.");
    expect(result.text).toBe("Here are three ideas for the opening.");
    expect(result.proposal).toBeNull();
  });

  it("extracts an append proposal from a JSON reply", () => {
    const raw = JSON.stringify({ text: "I drafted the opening.", proposal: { action: "append", text: "The rain came sideways that night." } });
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("I drafted the opening.");
    expect(result.proposal).toEqual({ action: "append", text: "The rain came sideways that night." });
  });

  it("ignores a proposal with an unsupported action", () => {
    const raw = JSON.stringify({ text: "Revised.", proposal: { action: "replace", text: "x" } });
    expect(parseAssistantMessage(raw).proposal).toBeNull();
  });

  it("ignores an append proposal with empty text", () => {
    const raw = JSON.stringify({ text: "Ok.", proposal: { action: "append", text: "   " } });
    expect(parseAssistantMessage(raw).proposal).toBeNull();
  });

  it("strips a ```json code fence before parsing", () => {
    const raw = "```json\n" + JSON.stringify({ text: "Done.", proposal: { action: "append", text: "A line." } }) + "\n```";
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("Done.");
    expect(result.proposal).toEqual({ action: "append", text: "A line." });
  });

  it("treats malformed JSON with no salvageable text field as plain text", () => {
    const result = parseAssistantMessage("{oops not valid json");
    expect(result.text).toBe("{oops not valid json");
    expect(result.proposal).toBeNull();
    expect(result.truncated).toBe(false);
  });

  it("returns the fence-stripped text when a fenced body is not valid JSON (matches the Rust parser)", () => {
    const result = parseAssistantMessage("```json\n{broken\n```");
    expect(result.text).toBe("{broken");
    expect(result.proposal).toBeNull();
  });

  it("salvages the text field from JSON cut off mid-string", () => {
    const raw = '{"text":"Great starting mix.\\n\\n### 1. Gazer Maw\\nA pallid creature that';
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("Great starting mix.\n\n### 1. Gazer Maw\nA pallid creature that");
    expect(result.proposal).toBeNull();
    expect(result.truncated).toBe(true);
  });

  it("decodes escaped quotes while salvaging", () => {
    const raw = '{"text":"She said \\"no\\" and left the';
    expect(parseAssistantMessage(raw).text).toBe('She said "no" and left the');
  });

  it("decodes \\uXXXX escapes while salvaging (parity with the Rust parser)", () => {
    const raw = '{"text":"She said \\u201cHello';
    expect(parseAssistantMessage(raw).text).toBe("She said “Hello");
  });

  it("marks complete replies as not truncated", () => {
    const raw = JSON.stringify({ text: "All done." });
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("All done.");
    expect(result.truncated).toBe(false);
  });

  it("still treats non-JSON prose as plain text", () => {
    const result = parseAssistantMessage("Just thinking out loud.");
    expect(result.text).toBe("Just thinking out loud.");
    expect(result.truncated).toBe(false);
  });
});
