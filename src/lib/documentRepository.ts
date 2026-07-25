import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { ManuscriptNode } from "../domain/models";

export interface ImportScene { title: string; html: string; wordCount: number }
export interface ImportChapter { title: string; scenes: ImportScene[] }
export interface DocumentPreview {
  formatVersion: 1;
  sourcePath: string;
  chapters: ImportChapter[];
  warnings: string[];
  counts: { chapters: number; scenes: number; words: number };
}

const isTauri = () => "__TAURI_INTERNALS__" in window;

export async function chooseAndInspectDocument(): Promise<DocumentPreview | null> {
  if (!isTauri()) throw new Error("Document processing is available in the desktop application.");
  const inputPath = await open({
    multiple: false,
    directory: false,
    title: "Inspect a manuscript",
    filters: [{ name: "Supported manuscripts", extensions: ["docx", "md", "markdown", "txt", "html", "htm", "epub"] }],
  });
  return inputPath ? invoke("inspect_document", { inputPath }) : null;
}

export const commitDocumentImport = (preview: DocumentPreview): Promise<ManuscriptNode[]> =>
  invoke("commit_vault_import", { preview });

export type ExportFormat = "docx" | "kdp-docx" | "md" | "txt" | "html" | "epub" | "pdf";

export type PublicationTarget = "kindle" | "paperback" | "hardcover";

export async function chooseAndExportDocument(
  defaultName: string,
  format: ExportFormat,
): Promise<{ outputPath: string; chapters: number; scenes: number; profile?: string } | null> {
  if (!isTauri()) throw new Error("Document processing is available in the desktop application.");
  const labels: Record<ExportFormat, string> = {
    docx: "Word document",
    "kdp-docx": "KDP paperback DOCX",
    md: "Markdown",
    txt: "Plain text",
    html: "HTML",
    epub: "EPUB",
    pdf: "PDF proof",
  };
  const extension = format === "kdp-docx" ? "docx" : format;
  const suffix = format === "kdp-docx" ? " - KDP 6x9" : "";
  const outputPath = await save({
    title: `Export manuscript as ${labels[format]}`,
    defaultPath: `${defaultName.replace(/[^\w -]+/g, "") || "Manuscript"}${suffix}.${extension}`,
    filters: [{ name: labels[format], extensions: [extension] }],
  });
  if (!outputPath) return null;
  return invoke("export_document", {
    outputPath,
    profile: format === "kdp-docx" ? "kdp-paperback" : "standard",
  });
}

export async function chooseAndExportPublication(
  defaultName: string,
  target: PublicationTarget,
): Promise<{ outputPath: string; chapters: number; scenes: number; profile?: string } | null> {
  if (!isTauri()) throw new Error("Document processing is available in the desktop application.");
  const map: Record<PublicationTarget, { label: string; extension: "epub" | "docx"; profile: string; suffix: string }> = {
    kindle: { label: "Kindle EPUB", extension: "epub", profile: "kindle", suffix: " - Kindle" },
    paperback: { label: "Paperback DOCX", extension: "docx", profile: "kdp-paperback", suffix: " - Paperback" },
    hardcover: { label: "Hardcover DOCX", extension: "docx", profile: "kdp-hardcover", suffix: " - Hardcover" },
  };
  const choice = map[target];
  const outputPath = await save({
    title: `Export publication draft as ${choice.label}`,
    defaultPath: `${defaultName.replace(/[^\w -]+/g, "") || "Manuscript"}${choice.suffix}.${choice.extension}`,
    filters: [{ name: choice.label, extensions: [choice.extension] }],
  });
  if (!outputPath) return null;
  return invoke("export_document", {
    outputPath,
    profile: choice.profile,
  });
}
